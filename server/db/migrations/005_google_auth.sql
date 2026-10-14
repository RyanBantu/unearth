-- Google sign-in (Android) and Google Place IDs.
-- Safe while the current server is live: nullable columns and unique indexes only.
-- Apple users keep apple_sub; Google users may have apple_sub null.
-- Same verified email (not Apple Hide My Email) is linked at sign-in; see accountLinking.ts.

alter table users alter column apple_sub drop not null;

alter table users add column if not exists google_sub text;
create unique index if not exists users_google_sub_key on users (google_sub);

alter table gems add column if not exists google_place_id text;
create unique index if not exists gems_google_place_id_key on gems (google_place_id);
