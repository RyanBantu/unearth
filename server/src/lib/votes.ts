import { sql } from "../db.js";
import { shouldHideGem } from "./status.js";

export type VoteSnapshot = {
  upvotes: number;
  downvotes: number;
  myVote: 1 | -1 | null;
};

export async function setVote(params: {
  gemId: string;
  userId: string;
  value: 1 | -1;
}): Promise<VoteSnapshot> {
  const { gemId, userId, value } = params;

  return sql.begin(async (tx) => {
    const gems = await tx<{
      id: string;
      first_finder_id: string | null;
      upvotes: number;
      downvotes: number;
    }[]>`
      select id, first_finder_id, upvotes, downvotes
      from gems
      where id = ${gemId}
      for update
      limit 1
    `;
    const gem = gems[0];
    if (!gem) throw new Error("GEM_NOT_FOUND");

    if (gem.first_finder_id === userId) {
      throw new Error("VOTE_FORBIDDEN");
    }
    const ownFind = await tx<{ id: string }[]>`
      select id from finds
      where gem_id = ${gemId} and user_id = ${userId}
      limit 1
    `;
    if (ownFind[0]) throw new Error("VOTE_FORBIDDEN");

    const existing = await tx<{ value: number }[]>`
      select value from votes
      where gem_id = ${gemId} and user_id = ${userId}
      limit 1
      for update
    `;
    const prev = existing[0]?.value;
    let upvotes = Number(gem.upvotes);
    let downvotes = Number(gem.downvotes);

    if (prev === value) {
      return { upvotes, downvotes, myVote: value };
    }

    if (prev === 1) upvotes -= 1;
    if (prev === -1) downvotes -= 1;
    if (value === 1) upvotes += 1;
    if (value === -1) downvotes += 1;

    await tx`
      insert into votes (user_id, gem_id, value, updated_at)
      values (${userId}, ${gemId}, ${value}, now())
      on conflict (user_id, gem_id) do update
      set value = excluded.value, updated_at = now()
    `;
    await tx`
      update gems
      set upvotes = ${upvotes}, downvotes = ${downvotes}
      where id = ${gemId}
    `;
    if (shouldHideGem(upvotes, downvotes)) {
      await tx`
        update gems
        set hidden_at = coalesce(hidden_at, now())
        where id = ${gemId}
      `;
    }
    return { upvotes, downvotes, myVote: value };
  });
}

export async function clearVote(params: {
  gemId: string;
  userId: string;
}): Promise<VoteSnapshot> {
  const { gemId, userId } = params;

  return sql.begin(async (tx) => {
    const gems = await tx<{
      id: string;
      first_finder_id: string | null;
      upvotes: number;
      downvotes: number;
    }[]>`
      select id, first_finder_id, upvotes, downvotes
      from gems
      where id = ${gemId}
      for update
      limit 1
    `;
    const gem = gems[0];
    if (!gem) throw new Error("GEM_NOT_FOUND");

    if (gem.first_finder_id === userId) {
      throw new Error("VOTE_FORBIDDEN");
    }
    const ownFind = await tx<{ id: string }[]>`
      select id from finds
      where gem_id = ${gemId} and user_id = ${userId}
      limit 1
    `;
    if (ownFind[0]) throw new Error("VOTE_FORBIDDEN");

    const existing = await tx<{ value: number }[]>`
      select value from votes
      where gem_id = ${gemId} and user_id = ${userId}
      limit 1
      for update
    `;
    let upvotes = Number(gem.upvotes);
    let downvotes = Number(gem.downvotes);
    const prev = existing[0]?.value;

    if (prev === 1) upvotes -= 1;
    if (prev === -1) downvotes -= 1;

    if (prev !== undefined) {
      await tx`
        delete from votes
        where gem_id = ${gemId} and user_id = ${userId}
      `;
      await tx`
        update gems
        set upvotes = ${upvotes}, downvotes = ${downvotes}
        where id = ${gemId}
      `;
    }

    return { upvotes, downvotes, myVote: null };
  });
}

export async function getMyVote(
  gemId: string,
  userId: string,
): Promise<1 | -1 | null> {
  const rows = await sql<{ value: number }[]>`
    select value from votes
    where gem_id = ${gemId} and user_id = ${userId}
    limit 1
  `;
  const raw = rows[0]?.value;
  return raw === 1 || raw === -1 ? (raw as 1 | -1) : null;
}
