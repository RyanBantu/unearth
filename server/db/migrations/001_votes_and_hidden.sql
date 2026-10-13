-- Votes + denormalized counts + moderation hide flag.
-- Do not edit schema.sql for additive changes; apply this migration.

alter table gems
  add column if not exists upvotes int not null default 0,
  add column if not exists downvotes int not null default 0,
  add column if not exists hidden_at timestamptz;

create table if not exists votes (
  user_id    uuid not null references users(id) on delete cascade,
  gem_id     uuid not null references gems(id) on delete cascade,
  value      smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, gem_id)
);

create index if not exists votes_gem_idx on votes (gem_id);
create index if not exists gems_hidden_at_idx on gems (hidden_at)
  where hidden_at is not null;
