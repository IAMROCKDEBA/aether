// The single source of truth for "who may access what". Pure functions only, so
// every rule is exhaustively unit-tested (tests/unit/policy.test.ts).

import type { LinkState, Visibility } from "@/lib/types";

export type FileFacts = {
  ownerId: string;
  visibility: Visibility;
  status: "PENDING" | "READY";
};

export type DirectAccess =
  | { allowed: true; channel: "OWNER" | "SHARED_USER" | "PUBLIC_URL" }
  | { allowed: false };

/**
 * Access without a temporary link.
 *
 * - PRIVATE:    owner only. Invitations are kept but paused.
 * - RESTRICTED: owner + invited users.
 * - PUBLIC:     everyone, signed in or not.
 *
 * Denials are indistinguishable from "not found" so file IDs leak nothing.
 */
export function authorizeDirect(
  actorId: string | null,
  file: FileFacts,
  isInvited: boolean,
): DirectAccess {
  if (file.status !== "READY") return { allowed: false };
  if (actorId && actorId === file.ownerId) return { allowed: true, channel: "OWNER" };
  if (file.visibility === "PRIVATE") return { allowed: false };
  if (actorId && isInvited) return { allowed: true, channel: "SHARED_USER" };
  if (file.visibility === "PUBLIC") return { allowed: true, channel: "PUBLIC_URL" };
  return { allowed: false };
}

export type LinkFacts = {
  expiresAt: Date;
  revokedAt: Date | null;
  maxDownloads: number | null;
  downloadCount: number;
};

export function linkState(link: LinkFacts, now: Date): LinkState {
  if (link.revokedAt) return "revoked";
  if (link.expiresAt.getTime() <= now.getTime()) return "expired";
  if (link.maxDownloads !== null && link.downloadCount >= link.maxDownloads) return "exhausted";
  return "active";
}

export type LinkDenial =
  | Exclude<LinkState, "active">
  | "paused"
  | "unavailable"
  | "locked"
  | "download_only";

export type LinkAccess = { allowed: true } | { allowed: false; reason: LinkDenial };

/**
 * Access through a temporary link. A link works only while the file is shared
 * (RESTRICTED or PUBLIC): making a file PRIVATE instantly pauses every link.
 */
export function authorizeLink(
  link: LinkFacts & { hasPassword: boolean },
  file: FileFacts,
  ctx: { now: Date; unlocked: boolean; intent: "view" | "download" },
): LinkAccess {
  if (file.status !== "READY") return { allowed: false, reason: "unavailable" };
  const state = linkState(link, ctx.now);
  if (state !== "active") return { allowed: false, reason: state };
  if (file.visibility === "PRIVATE") return { allowed: false, reason: "paused" };
  if (link.hasPassword && !ctx.unlocked) return { allowed: false, reason: "locked" };
  // A download limit would be meaningless if previews were unlimited, so
  // limited links are download-only.
  if (ctx.intent === "view" && link.maxDownloads !== null) return { allowed: false, reason: "download_only" };
  return { allowed: true };
}

/** Upper bounds for link creation, enforced by the API schema. */
export const LINK_LIMITS = {
  minTtlSeconds: 60,
  maxTtlSeconds: 30 * 24 * 60 * 60,
  maxDownloads: 1000,
} as const;
