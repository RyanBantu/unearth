// Usage: npm run backfill:places
// Reverse-geocodes every gem with no city (Nominatim, max 1 request per second).
import "dotenv/config";

const { sql } = await import("../src/db.js");
const { reverseGeocode, savePlace } = await import("../src/lib/places.js");

try {
  const gems = await sql<{ id: string; name: string; lat: number; lng: number }[]>`
    select id, name, st_y(location::geometry) as lat, st_x(location::geometry) as lng
    from gems
    where city is null
    order by created_at
  `;
  console.log(`${gems.length} gems need a place`);

  let failed = 0;
  for (const gem of gems) {
    try {
      const place = await reverseGeocode(Number(gem.lat), Number(gem.lng));
      await savePlace(gem.id, place);
      console.log(`${gem.name}: ${place.area ?? "-"}, ${place.city ?? "-"}, ${place.country ?? "-"}`);
    } catch (err) {
      failed++;
      console.warn(`${gem.name}: failed (${err instanceof Error ? err.message : err})`);
    }
  }
  console.log(`Done. ${gems.length - failed} filled, ${failed} failed.`);
} finally {
  await sql.end({ timeout: 5 });
}
