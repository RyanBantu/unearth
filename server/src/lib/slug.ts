import { randomBytes } from "node:crypto";

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function slugBase(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function suffix(length: number): string {
  return Array.from(randomBytes(length), (b) => SUFFIX_ALPHABET[b % SUFFIX_ALPHABET.length]).join("");
}

/** "Corner Dosa Stall" → "corner-dosa-stall-x7k2" */
export function gemSlug(name: string, suffixLength = 4): string {
  return `${slugBase(name) || "gem"}-${suffix(suffixLength)}`;
}

/** Place slugs have no suffix: "Indiranagar" → "indiranagar". */
export function placeSlug(name: string): string | null {
  return slugBase(name) || null;
}

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlugConflict(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("gems_slug_key");
}
