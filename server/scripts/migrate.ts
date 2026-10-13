// Usage: npm run migrate -- db/migrations/003_gem_slugs_web_auth.sql
import "dotenv/config";
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Pass one or more migration files.");
  process.exit(1);
}

const { sql } = await import("../src/db.js");
try {
  for (const file of files) {
    await sql.unsafe(readFileSync(file, "utf8"));
    console.log(`Applied ${file}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
