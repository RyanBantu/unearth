-- City / area for the website's place pages. Filled by the server (reverse geocoding)
-- after a gem is saved, or by `npm run backfill:places`.
-- Safe while the current server is live: only nullable columns and indexes.

alter table gems
  add column if not exists city text,
  add column if not exists area text,
  add column if not exists country text,
  add column if not exists city_slug text,
  add column if not exists area_slug text;

create index if not exists gems_city_slug_idx on gems (city_slug);
create index if not exists gems_city_area_idx on gems (city_slug, area_slug);
create index if not exists gems_city_category_idx on gems (city_slug, category);
