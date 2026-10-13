-- Shareable gem URLs (/g/:slug) and Sign in with Apple on the web.
-- Safe while the current server is live: only nullable columns, a backfill and an index.
-- The server fills `slug` on insert; clients never send it.

alter table gems add column if not exists slug text;

-- "Corner Dosa Stall" -> "corner-dosa-stall-x7k2" (8-char suffix if the 4-char one would collide).
with base as (
  select
    id,
    coalesce(
      nullif(
        trim(both '-' from left(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), 60)),
        ''
      ),
      'gem'
    ) as b,
    substr(md5(id::text), 1, 4) as s4,
    substr(md5(id::text), 1, 8) as s8
  from gems
  where slug is null
),
ranked as (
  select id, b, s4, s8, count(*) over (partition by b, s4) as dup
  from base
)
update gems g
set slug = r.b || '-' || case
  when r.dup > 1 or exists (select 1 from gems x where x.slug = r.b || '-' || r.s4) then r.s8
  else r.s4
end
from ranked r
where g.id = r.id;

create unique index if not exists gems_slug_key on gems (slug);

-- Apple refresh tokens must be revoked with the client that issued them
-- (bundle ID for iOS, Services ID for the web). Null means the bundle ID.
alter table users add column if not exists apple_client_id text;
