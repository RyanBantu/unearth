import { sql } from "../db.js";
import { placeSlug } from "./slug.js";

export type Place = {
  city: string | null;
  area: string | null;
  country: string | null;
};

export type PlaceColumns = Place & {
  city_slug: string | null;
  area_slug: string | null;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "Unearth/1.0 (https://unearth-1o4a.onrender.com; bantu.ryan@gmail.com)";
/** Nominatim usage policy: an absolute maximum of 1 request per second. */
const MIN_INTERVAL_MS = 1100;
const CACHE_MAX = 2000;

export function placeColumns(place: Place): PlaceColumns {
  const city = place.city?.trim() || null;
  const area = place.area?.trim() || null;
  return {
    city,
    area,
    country: place.country?.trim() || null,
    city_slug: city ? placeSlug(city) : null,
    area_slug: area ? placeSlug(area) : null,
  };
}

type NominatimAddress = Record<string, string | undefined>;

export function placeFromNominatim(address: NominatimAddress | undefined): Place {
  const a = address ?? {};
  return {
    city: a.city ?? a.town ?? a.village ?? a.county ?? null,
    area: a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? null,
    country: a.country ?? null,
  };
}

// ~110 m cells: close points share a lookup.
const cache = new Map<string, Place>();
const cacheKey = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

/** Serialises lookups so we never exceed Nominatim's rate limit, across all callers. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function reverseGeocode(lat: number, lng: number): Promise<Place> {
  const key = cacheKey(lat, lng);
  const hit = cache.get(key);
  if (hit) return hit;

  const place = await enqueue(async () => {
    const url = new URL(NOMINATIM_URL);
    url.search = new URLSearchParams({
      format: "jsonv2",
      lat: String(lat),
      lon: String(lng),
      zoom: "16",
      addressdetails: "1",
    }).toString();
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const body = (await res.json()) as { address?: NominatimAddress; error?: string };
    return placeFromNominatim(body.address);
  });

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, place);
  return place;
}

export async function savePlace(gemId: string, place: Place): Promise<void> {
  const p = placeColumns(place);
  await sql`
    update gems
    set city = ${p.city}, area = ${p.area}, country = ${p.country},
        city_slug = ${p.city_slug}, area_slug = ${p.area_slug}
    where id = ${gemId}
  `;
}

export function geocodingDisabled(): boolean {
  return process.env.GEOCODING_DISABLED === "true";
}

/** Fire-and-forget: fills city/area after a gem is saved. Never throws. */
export function fillPlaceInBackground(
  gemId: string,
  lat: number,
  lng: number,
  log: { warn: (obj: object, msg: string) => void },
): void {
  if (geocodingDisabled()) return;
  reverseGeocode(lat, lng)
    .then((place) => savePlace(gemId, place))
    .catch((err) => log.warn({ err, gemId }, "Reverse geocoding failed"));
}
