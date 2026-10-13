import { gemStatuses, prospectorLevel } from "./status.js";
import type { UserRow } from "../db.js";

export function serializeUser(
  user: Pick<
    UserRow,
    | "id"
    | "email"
    | "display_name"
    | "handle"
    | "created_at"
    | "agreed_terms_at"
  >,
  stats?: {
    gemsUnearthed: number;
    firstFinds: number;
    findCount: number;
  },
  opts?: { includeEmail?: boolean },
) {
  const findCount = stats?.findCount ?? 0;
  const includeEmail = opts?.includeEmail ?? true;
  return {
    id: user.id,
    ...(includeEmail ? { email: user.email } : {}),
    displayName: user.display_name,
    handle: user.handle,
    createdAt: user.created_at,
    agreedTermsAt: user.agreed_terms_at ?? null,
    needsTerms: !user.agreed_terms_at,
    ...(stats
      ? {
          gemsUnearthed: stats.gemsUnearthed,
          firstFinds: stats.firstFinds,
          level: prospectorLevel(findCount),
        }
      : {}),
  };
}

export function serializeGemStatus(findCount: number) {
  const s = gemStatuses(findCount);
  return {
    findCount,
    primary: s.primary,
    rare: s.rare,
    minedOut: s.minedOut,
    labels: s.labels,
  };
}

export type MatchCandidateRow = {
  id: string;
  name: string;
  category: string;
  find_count: number;
  distance_m: number;
  name_sim: number;
  lat?: number;
  lng?: number;
  address?: string | null;
};

export function serializeMatchCandidate(row: MatchCandidateRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    findCount: row.find_count,
    distanceM: Number(row.distance_m),
    nameSim: Number(row.name_sim),
    status: serializeGemStatus(row.find_count),
    ...(row.lat !== undefined ? { lat: Number(row.lat) } : {}),
    ...(row.lng !== undefined ? { lng: Number(row.lng) } : {}),
    ...(row.address !== undefined ? { address: row.address } : {}),
  };
}
