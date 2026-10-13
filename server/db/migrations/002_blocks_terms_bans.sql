-- Blocks, terms agreement, and account bans (Guideline 1.2).

alter table users
  add column if not exists agreed_terms_at timestamptz,
  add column if not exists banned_at timestamptz;

create table if not exists blocks (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on blocks (blocked_id);
