create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists citext;

create table users (
  id               uuid primary key default gen_random_uuid(),
  apple_sub        text unique not null,
  email            text,
  display_name     text,
  handle           citext unique,
  apple_refresh_token_enc text,            -- encrypted, used to revoke on account deletion
  created_at       timestamptz not null default now()
);

create table gems (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         text not null check (category in ('food','cafe','viewpoint','trail','shop','other')),
  location         geography(Point, 4326) not null,
  address          text,
  apple_place_id   text unique,
  google_maps_url  text,
  first_finder_id  uuid references users(id) on delete set null,
  find_count       int not null default 0,
  created_at       timestamptz not null default now()
);
create index gems_location_idx on gems using gist (location);
create index gems_name_trgm_idx on gems using gin (name gin_trgm_ops);

create table finds (
  id           uuid primary key default gen_random_uuid(),
  gem_id       uuid not null references gems(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  description  text not null,
  liked        text,
  disliked     text,
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now(),
  unique (gem_id, user_id)
);
create index finds_user_idx on finds (user_id);

create table stash (
  user_id    uuid not null references users(id) on delete cascade,
  gem_id     uuid not null references gems(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, gem_id)
);

create table refresh_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text unique not null,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  gem_id      uuid references gems(id) on delete cascade,
  find_id     uuid references finds(id) on delete cascade,
  reason      text not null,
  created_at  timestamptz not null default now()
);
