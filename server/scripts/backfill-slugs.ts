// Usage: npm run backfill:slugs
// Gives every gem without a slug one (migration 003 already does this; safe to re-run).
import "dotenv/config";

const { sql } = await import("../src/db.js");
const { gemSlug, isSlugConflict } = await import("../src/lib/slug.js");

try {
  const gems = await sql<{ id: string; name: string }[]>`
    select id, name from gems where slug is null order by created_at
  `;
  console.log(`${gems.length} gems need a slug`);

  for (const gem of gems) {
    for (let attempt = 0; ; attempt++) {
      try {
        const slug = gemSlug(gem.name, attempt < 2 ? 4 : 8);
        await sql`update gems set slug = ${slug} where id = ${gem.id} and slug is null`;
        console.log(`${gem.id} → ${slug}`);
        break;
      } catch (err) {
        if (!isSlugConflict(err) || attempt >= 3) throw err;
      }
    }
  }
} finally {
  await sql.end({ timeout: 5 });
}
