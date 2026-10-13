import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export type UserRow = {
  id: string;
  apple_sub: string;
  email: string | null;
  display_name: string | null;
  handle: string | null;
  apple_refresh_token_enc: string | null;
  created_at: Date;
  agreed_terms_at: Date | null;
  banned_at: Date | null;
};

export type GemRow = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  apple_place_id: string | null;
  google_maps_url: string | null;
  first_finder_id: string | null;
  find_count: number;
  created_at: Date;
  lat: number;
  lng: number;
};

export type FindRow = {
  id: string;
  gem_id: string;
  user_id: string;
  description: string;
  liked: string | null;
  disliked: string | null;
  tags: string[];
  created_at: Date;
};
