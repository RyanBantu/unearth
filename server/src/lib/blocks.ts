import { sql } from "../db.js";

/** User ids this viewer has blocked. */
export async function blockedIdsFor(viewerId: string): Promise<string[]> {
  const rows = await sql<{ blocked_id: string }[]>`
    select blocked_id from blocks where blocker_id = ${viewerId}
  `;
  return rows.map((r) => r.blocked_id);
}

export async function isBlocked(
  viewerId: string,
  targetId: string,
): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    select exists(
      select 1 from blocks
      where blocker_id = ${viewerId} and blocked_id = ${targetId}
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

/** True when the gem should be hidden from this viewer (blocks / reports). */
export async function isGemHiddenFromViewer(
  viewerId: string,
  gemId: string,
): Promise<boolean> {
  const rows = await sql<{ hide: boolean }[]>`
    select (
      exists (
        select 1 from gems g
        where g.id = ${gemId} and g.hidden_at is not null
      )
      or exists (
        select 1 from reports r
        where r.reporter_id = ${viewerId}
          and r.gem_id = ${gemId}
          and r.find_id is null
      )
      or not exists (
        select 1 from finds f
        where f.gem_id = ${gemId}
          and not exists (
            select 1 from blocks b
            where b.blocker_id = ${viewerId} and b.blocked_id = f.user_id
          )
          and not exists (
            select 1 from reports r
            where r.reporter_id = ${viewerId} and r.find_id = f.id
          )
      )
    ) as hide
  `;
  return Boolean(rows[0]?.hide);
}
