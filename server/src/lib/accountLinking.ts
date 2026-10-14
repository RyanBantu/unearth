import { sql, type UserRow } from "../db.js";
import { encryptAppleRefreshToken, type AppleIdentity } from "./apple.js";
import type { GoogleIdentity } from "./google.js";

export const USER_COLUMNS = `id, apple_sub, google_sub, email, display_name, handle,
  apple_refresh_token_enc, created_at, agreed_terms_at, banned_at`;

const APPLE_PRIVATE_RELAY = "@privaterelay.appleid.com";

export class AccountLinkError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AccountLinkError";
  }
}

export function isLinkableEmail(email: string | null | undefined): email is string {
  const n = email?.trim().toLowerCase();
  if (!n || !n.includes("@")) return false;
  if (n.endsWith(APPLE_PRIVATE_RELAY)) return false;
  return true;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

async function loadUserById(id: string): Promise<UserRow | undefined> {
  const rows = await sql<UserRow[]>`
    select ${sql.unsafe(USER_COLUMNS)}
    from users
    where id = ${id}
    limit 1
  `;
  return rows[0];
}

async function findUsersByEmail(email: string): Promise<UserRow[]> {
  const n = normalizeEmail(email);
  return sql<UserRow[]>`
    select ${sql.unsafe(USER_COLUMNS)}
    from users
    where email is not null and lower(email) = ${n}
  `;
}

export function pickPrimary(
  a: UserRow,
  b: UserRow,
): { primary: UserRow; secondary: UserRow } {
  const appleA = Boolean(a.apple_sub);
  const appleB = Boolean(b.apple_sub);
  if (appleA !== appleB) {
    return appleA ? { primary: a, secondary: b } : { primary: b, secondary: a };
  }
  const handleA = Boolean(a.handle);
  const handleB = Boolean(b.handle);
  if (handleA !== handleB) {
    return handleA ? { primary: a, secondary: b } : { primary: b, secondary: a };
  }
  const aTime = a.created_at instanceof Date ? a.created_at.getTime() : Date.parse(String(a.created_at));
  const bTime = b.created_at instanceof Date ? b.created_at.getTime() : Date.parse(String(b.created_at));
  return aTime <= bTime ? { primary: a, secondary: b } : { primary: b, secondary: a };
}

async function mergeUsers(primary: UserRow, secondary: UserRow): Promise<UserRow> {
  if (primary.id === secondary.id) return (await loadUserById(primary.id)) ?? primary;

  await sql.begin(async (tx) => {
    const locked = await tx<UserRow[]>`
      select ${sql.unsafe(USER_COLUMNS)}
      from users
      where id = ${primary.id} or id = ${secondary.id}
      for update
    `;
    const pri = locked.find((u) => u.id === primary.id);
    const sec = locked.find((u) => u.id === secondary.id);
    if (!pri || !sec) return;

    const findGems = await tx<{ gem_id: string }[]>`
      select distinct gem_id from finds
      where user_id = ${pri.id} or user_id = ${sec.id}
    `;
    const voteGems = await tx<{ gem_id: string }[]>`
      select distinct gem_id from votes
      where user_id = ${pri.id} or user_id = ${sec.id}
    `;
    const gemIds = [...new Set([...findGems, ...voteGems].map((r) => r.gem_id))];

    const snap = {
      apple_sub: sec.apple_sub,
      google_sub: sec.google_sub ?? null,
      email: sec.email,
      display_name: sec.display_name,
      handle: sec.handle,
      apple_refresh_token_enc: sec.apple_refresh_token_enc,
      agreed_terms_at: sec.agreed_terms_at,
      banned_at: sec.banned_at,
    };

    await tx`
      update users
      set apple_sub = null, google_sub = null, handle = null
      where id = ${sec.id}
    `;
    await tx`
      update users
      set
        apple_sub = coalesce(apple_sub, ${snap.apple_sub}),
        google_sub = coalesce(google_sub, ${snap.google_sub}),
        email = coalesce(email, ${snap.email}),
        display_name = coalesce(display_name, ${snap.display_name}),
        handle = coalesce(handle, ${snap.handle}),
        apple_refresh_token_enc = coalesce(apple_refresh_token_enc, ${snap.apple_refresh_token_enc}),
        agreed_terms_at = coalesce(agreed_terms_at, ${snap.agreed_terms_at}),
        banned_at = coalesce(banned_at, ${snap.banned_at})
      where id = ${pri.id}
    `;

    await tx`
      delete from finds
      where user_id = ${sec.id}
        and gem_id in (select gem_id from finds where user_id = ${pri.id})
    `;
    await tx`update finds set user_id = ${pri.id} where user_id = ${sec.id}`;

    await tx`
      delete from votes
      where user_id = ${sec.id}
        and gem_id in (select gem_id from votes where user_id = ${pri.id})
    `;
    await tx`update votes set user_id = ${pri.id} where user_id = ${sec.id}`;

    await tx`
      insert into stash (user_id, gem_id, created_at)
      select ${pri.id}, gem_id, created_at from stash where user_id = ${sec.id}
      on conflict (user_id, gem_id) do nothing
    `;
    await tx`delete from stash where user_id = ${sec.id}`;

    await tx`
      delete from blocks
      where (blocker_id = ${sec.id} and blocked_id = ${pri.id})
         or (blocker_id = ${pri.id} and blocked_id = ${sec.id})
    `;
    await tx`
      insert into blocks (blocker_id, blocked_id, created_at)
      select ${pri.id}, blocked_id, created_at from blocks where blocker_id = ${sec.id}
      on conflict (blocker_id, blocked_id) do nothing
    `;
    await tx`delete from blocks where blocker_id = ${sec.id}`;
    await tx`
      insert into blocks (blocker_id, blocked_id, created_at)
      select blocker_id, ${pri.id}, created_at from blocks where blocked_id = ${sec.id}
      on conflict (blocker_id, blocked_id) do nothing
    `;
    await tx`delete from blocks where blocked_id = ${sec.id}`;

    await tx`update reports set reporter_id = ${pri.id} where reporter_id = ${sec.id}`;
    await tx`update refresh_tokens set user_id = ${pri.id} where user_id = ${sec.id}`;
    await tx`update gems set first_finder_id = ${pri.id} where first_finder_id = ${sec.id}`;

    if (gemIds.length > 0) {
      await tx`
        update gems g
        set
          find_count = (select count(*) from finds f where f.gem_id = g.id),
          upvotes = (select count(*) from votes v where v.gem_id = g.id and v.value = 1),
          downvotes = (select count(*) from votes v where v.gem_id = g.id and v.value = -1)
        where g.id = any(${gemIds}::uuid[])
      `;
    }

    await tx`delete from users where id = ${sec.id}`;
  });

  return (await loadUserById(primary.id)) ?? primary;
}

async function mergeByEmail(user: UserRow, email: string | null | undefined): Promise<UserRow> {
  if (!isLinkableEmail(email)) return user;
  const others = (await findUsersByEmail(email)).filter((u) => u.id !== user.id);
  let current = user;
  for (const other of others) {
    const { primary, secondary } = pickPrimary(current, other);
    current = await mergeUsers(primary, secondary);
  }
  return current;
}

/**
 * Find or create the user for a verified Apple identity. Email and name are saved
 * on first sign-in only (Apple sends them once). `clientId` null = the iOS bundle ID.
 *
 * If a Google user already has the same (non-relay) email, Apple is attached to that
 * user instead of creating a second Unearth account.
 */
export async function upsertAppleUser(params: {
  identity: AppleIdentity;
  displayName: string | null;
  appleRefreshToken?: string;
  clientId: string | null;
}): Promise<UserRow> {
  const { identity, displayName, appleRefreshToken, clientId } = params;
  const encRefresh = appleRefreshToken ? encryptAppleRefreshToken(appleRefreshToken) : null;
  const incomingEmail = identity.email ?? null;

  const existing = await sql<UserRow[]>`
    select ${sql.unsafe(USER_COLUMNS)}
    from users
    where apple_sub = ${identity.sub}
    limit 1
  `;

  if (existing[0]) {
    if (encRefresh) {
      await sql`
        update users
        set apple_refresh_token_enc = ${encRefresh}, apple_client_id = ${clientId}
        where id = ${existing[0].id}
      `;
    }
    const email = isLinkableEmail(incomingEmail) ? incomingEmail : existing[0].email;
    return mergeByEmail(
      encRefresh ? { ...existing[0], apple_refresh_token_enc: encRefresh } : existing[0],
      email,
    );
  }

  if (isLinkableEmail(incomingEmail)) {
    const attachable = (await findUsersByEmail(incomingEmail)).find((u) => !u.apple_sub);
    if (attachable) {
      const updated = await sql<UserRow[]>`
        update users
        set
          apple_sub = ${identity.sub},
          apple_refresh_token_enc = coalesce(${encRefresh}, apple_refresh_token_enc),
          apple_client_id = coalesce(${clientId}, apple_client_id),
          email = coalesce(email, ${incomingEmail}),
          display_name = coalesce(display_name, ${displayName})
        where id = ${attachable.id}
        returning ${sql.unsafe(USER_COLUMNS)}
      `;
      return mergeByEmail(updated[0] ?? attachable, incomingEmail);
    }
  }

  try {
    const inserted = await sql<UserRow[]>`
      insert into users (apple_sub, email, display_name, apple_refresh_token_enc, apple_client_id)
      values (
        ${identity.sub},
        ${incomingEmail},
        ${displayName},
        ${encRefresh},
        ${clientId}
      )
      returning ${sql.unsafe(USER_COLUMNS)}
    `;
    return mergeByEmail(inserted[0]!, incomingEmail);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const raced = await sql<UserRow[]>`
      select ${sql.unsafe(USER_COLUMNS)}
      from users
      where apple_sub = ${identity.sub}
      limit 1
    `;
    if (raced[0]) return mergeByEmail(raced[0], incomingEmail);
    throw err;
  }
}

/**
 * Find or create the user for a verified Google identity.
 * Attaches to an existing Apple (or other) user when verified emails match.
 */
export async function upsertGoogleUser(identity: GoogleIdentity): Promise<UserRow> {
  const existing = await sql<UserRow[]>`
    select ${sql.unsafe(USER_COLUMNS)}
    from users
    where google_sub = ${identity.sub}
    limit 1
  `;
  if (existing[0]) return mergeByEmail(existing[0], identity.email);

  const email = identity.emailVerified && isLinkableEmail(identity.email) ? identity.email : null;
  if (email) {
    const attachable = (await findUsersByEmail(email)).find((u) => !u.google_sub);
    if (attachable) {
      const updated = await sql<UserRow[]>`
        update users
        set
          google_sub = ${identity.sub},
          email = coalesce(email, ${email}),
          display_name = coalesce(display_name, ${identity.name})
        where id = ${attachable.id}
        returning ${sql.unsafe(USER_COLUMNS)}
      `;
      return mergeByEmail(updated[0] ?? attachable, email);
    }
  }

  try {
    const inserted = await sql<UserRow[]>`
      insert into users (google_sub, email, display_name)
      values (
        ${identity.sub},
        ${identity.email},
        ${identity.name}
      )
      returning ${sql.unsafe(USER_COLUMNS)}
    `;
    return mergeByEmail(inserted[0]!, email);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const raced = await sql<UserRow[]>`
      select ${sql.unsafe(USER_COLUMNS)}
      from users
      where google_sub = ${identity.sub}
      limit 1
    `;
    if (raced[0]) return mergeByEmail(raced[0], email);
    throw err;
  }
}

/**
 * Attach a verified Google identity to the signed-in user (Hide My Email, or
 * any case where emails do not match). Merges a Google-only duplicate into
 * this user. Refuses to collapse two Apple accounts.
 */
export async function linkGoogleIdentity(
  user: UserRow,
  identity: GoogleIdentity,
): Promise<UserRow> {
  if (user.google_sub && user.google_sub === identity.sub) {
    return (await loadUserById(user.id)) ?? user;
  }
  if (user.google_sub && user.google_sub !== identity.sub) {
    throw new AccountLinkError(409, "This Unearth account is already linked to a different Google account");
  }

  const others = await sql<UserRow[]>`
    select ${sql.unsafe(USER_COLUMNS)}
    from users
    where google_sub = ${identity.sub}
    limit 1
  `;
  const other = others[0];
  if (other && other.id !== user.id) {
    if (other.apple_sub && user.apple_sub) {
      throw new AccountLinkError(409, "This Google account is already linked to another Unearth user");
    }
    const merged = await mergeUsers(user, other);
    if (merged.google_sub) return merged;
  }

  const updated = await sql<UserRow[]>`
    update users
    set
      google_sub = ${identity.sub},
      email = coalesce(email, ${identity.email}),
      display_name = coalesce(display_name, ${identity.name})
    where id = ${user.id}
    returning ${sql.unsafe(USER_COLUMNS)}
  `;
  const next = updated[0] ?? user;
  const email = identity.emailVerified ? identity.email : null;
  return mergeByEmail(next, email);
}
