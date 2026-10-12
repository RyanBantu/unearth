export const FIND_COUNT_POLISHED = 3;
export const FIND_COUNT_RARE_MAX = 10;
export const FIND_COUNT_MINED_OUT = 25;

export const PROSPECTOR_DIGGER_MAX = 9;
export const PROSPECTOR_LEVEL_MAX = 49;

export type GemStatusLabel = "Uncut" | "Polished" | "Rare" | "Mined out";

export type GemStatuses = {
  primary: "Uncut" | "Polished";
  rare: boolean;
  minedOut: boolean;
  labels: GemStatusLabel[];
};

export function gemStatuses(findCount: number): GemStatuses {
  const primary: "Uncut" | "Polished" =
    findCount >= FIND_COUNT_POLISHED ? "Polished" : "Uncut";
  const minedOut = findCount >= FIND_COUNT_MINED_OUT;
  const rare = !minedOut && findCount < FIND_COUNT_RARE_MAX;

  const labels: GemStatusLabel[] = [primary];
  if (minedOut) {
    labels.push("Mined out");
  } else if (rare) {
    labels.push("Rare");
  }

  return { primary, rare, minedOut, labels };
}

export type ProspectorLevel = "Digger" | "Prospector" | "Master Prospector";

export function prospectorLevel(findCount: number): ProspectorLevel {
  if (findCount >= PROSPECTOR_LEVEL_MAX + 1) return "Master Prospector";
  if (findCount >= PROSPECTOR_DIGGER_MAX + 1) return "Prospector";
  return "Digger";
}

export const MATCH_RADIUS_M = {
  food: 75,
  cafe: 75,
  shop: 75,
  viewpoint: 200,
  trail: 200,
  other: 200,
} as const;

export type GemCategory = keyof typeof MATCH_RADIUS_M;

export function matchRadiusM(category: GemCategory): number {
  return MATCH_RADIUS_M[category];
}

export const DUPLICATE_NAME_SIM_THRESHOLD = 0.3;
export const DUPLICATE_CONFLICT_NAME_SIM = 0.6;

export const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

export const ALLOWED_TAGS = [
  "Cheap",
  "Cash only",
  "Quiet",
  "Mornings",
  "Late night",
  "Standing only",
  "Needs a vehicle",
  "Family friendly",
  "Great view",
  "Veg friendly",
] as const;
