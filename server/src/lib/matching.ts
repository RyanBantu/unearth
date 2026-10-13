import { sql } from "../db.js";
import {
  DUPLICATE_NAME_SIM_THRESHOLD,
  matchRadiusM,
  type GemCategory,
} from "./status.js";
import type { MatchCandidateRow } from "./serialize.js";

export async function findDuplicateCandidates(params: {
  lat: number;
  lng: number;
  name: string;
  category: GemCategory;
  applePlaceId?: string | null;
}): Promise<MatchCandidateRow[]> {
  const { lat, lng, name, category, applePlaceId } = params;

  if (applePlaceId) {
    const byPlace = await sql<MatchCandidateRow[]>`
      select
        id,
        name,
        category,
        find_count,
        st_distance(location, st_makepoint(${lng}, ${lat})::geography) as distance_m,
        1.0::float8 as name_sim,
        st_y(location::geometry) as lat,
        st_x(location::geometry) as lng,
        address
      from gems
      where apple_place_id = ${applePlaceId}
        and hidden_at is null
      limit 1
    `;
    if (byPlace.length > 0) {
      return byPlace;
    }
  }

  const radiusM = matchRadiusM(category);
  return sql<MatchCandidateRow[]>`
    select
      id,
      name,
      category,
      find_count,
      st_distance(location, st_makepoint(${lng}, ${lat})::geography) as distance_m,
      similarity(name, ${name}) as name_sim,
      st_y(location::geometry) as lat,
      st_x(location::geometry) as lng,
      address
    from gems
    where st_dwithin(
      location,
      st_makepoint(${lng}, ${lat})::geography,
      ${radiusM}
    )
      and hidden_at is null
      and similarity(name, ${name}) > ${DUPLICATE_NAME_SIM_THRESHOLD}
    order by name_sim desc, distance_m asc
    limit 3
  `;
}
