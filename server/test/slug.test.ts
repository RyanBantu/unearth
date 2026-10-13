import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { gemSlug, placeSlug, slugBase } from "../src/lib/slug.js";
import { placeColumns, placeFromNominatim as fromNominatim } from "../src/lib/places.js";

test("slugBase strips punctuation and lowercases", () => {
  assert.equal(slugBase("Corner Dosa Stall"), "corner-dosa-stall");
  assert.equal(placeSlug("Indiranagar"), "indiranagar");
});

test("gemSlug adds a 4-character suffix", () => {
  assert.match(gemSlug("Corner Dosa Stall"), /^corner-dosa-stall-[a-z0-9]{4}$/);
});

test("Nominatim address mapping follows the spec", () => {
  const place = fromNominatim({
    suburb: "Indiranagar",
    city: "Bengaluru",
    country: "India",
  });
  assert.deepEqual(place, { city: "Bengaluru", area: "Indiranagar", country: "India" });
  assert.deepEqual(placeColumns(place), {
    city: "Bengaluru",
    area: "Indiranagar",
    country: "India",
    city_slug: "bengaluru",
    area_slug: "indiranagar",
  });
  assert.equal(fromNominatim({ town: "Manipal", county: "Udupi" }).city, "Manipal");
  assert.equal(fromNominatim({ village: "Malpe", neighbourhood: "Beach road" }).area, "Beach road");
});
