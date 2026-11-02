import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./http";

/**
 * Fixed-window limiter backed by Postgres, so it holds across server instances.
 * A single atomic upsert: no read-modify-write race.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const rows = await db.$queryRaw<{ count: number; lastRequest: bigint }[]>`
    INSERT INTO rate_limit (id, key, count, "lastRequest")
    VALUES (${randomUUID()}, ${`aether:${key}`}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit."lastRequest" < ${windowStart} THEN 1 ELSE rate_limit.count + 1 END,
      "lastRequest" = CASE WHEN rate_limit."lastRequest" < ${windowStart} THEN ${now} ELSE rate_limit."lastRequest" END
    RETURNING count, "lastRequest"`;
  const row = rows[0]!;
  if (row.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((Number(row.lastRequest) + windowMs - now) / 1000));
    throw new HttpError("rate_limited", "Too many attempts. Please wait a moment and try again.", {
      "Retry-After": String(retryAfter),
    });
  }
}
