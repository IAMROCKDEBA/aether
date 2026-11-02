import "server-only";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import type { ShareLink } from "@/generated/prisma/client";
import { inlineContentType, previewKind } from "@/lib/mime";
import type { FileDTO, LinkDTO } from "@/lib/types";
import { authorizeLink, linkState, type LinkDenial } from "./access/policy";
import {
  generateToken,
  hashIp,
  hashToken,
  isWellFormedToken,
  openToken,
  sealToken,
  signUnlock,
  verifyUnlock,
} from "./access/tokens";
import { recordAccess } from "./audit";
import { db } from "./db";
import { env } from "./env";
import { HttpError, notFound } from "./http";
import { rateLimit } from "./rate-limit";
import { signedGetUrl } from "./s3";
import type { CurrentUser } from "./session";

const SECRET = env.BETTER_AUTH_SECRET;
const UNLOCK_TTL_SEC = 60 * 60;

export const linkUrl = (token: string) => `${env.APP_URL}/s/${token}`;
export const unlockCookieName = (linkId: string) => `aether_unlock_${linkId}`;

export function toLinkDTO(link: ShareLink, now: Date): LinkDTO {
  return {
    id: link.id,
    url: linkUrl(openToken(link.tokenEnc, SECRET)),
    label: link.label,
    expiresAt: link.expiresAt.toISOString(),
    createdAt: link.createdAt.toISOString(),
    hasPassword: Boolean(link.passwordHash),
    maxDownloads: link.maxDownloads,
    downloadCount: link.downloadCount,
    state: linkState(link, now),
  };
}

// ─── Owner management ─────────────────────────────────────────────────

export async function createLink(
  user: CurrentUser,
  fileId: string,
  input: { ttlSeconds: number; label?: string; password?: string; maxDownloads?: number },
): Promise<LinkDTO> {
  await rateLimit(`link-create:${user.id}`, 30, 60_000);
  const file = await db.file.findFirst({
    where: { id: fileId, ownerId: user.id, status: "READY" },
    select: { id: true, visibility: true },
  });
  if (!file) throw notFound();
  if (file.visibility === "PRIVATE") {
    throw new HttpError("conflict", "Private files can't have links. Switch to Restricted first.");
  }

  const token = generateToken();
  const link = await db.shareLink.create({
    data: {
      fileId,
      createdById: user.id,
      tokenHash: hashToken(token),
      tokenEnc: sealToken(token, SECRET),
      label: input.label?.trim() || null,
      expiresAt: new Date(Date.now() + input.ttlSeconds * 1000),
      passwordHash: input.password ? await hashPassword(input.password) : null,
      maxDownloads: input.maxDownloads ?? null,
    },
  });
  return toLinkDTO(link, new Date());
}

export async function revokeLink(user: CurrentUser, linkId: string): Promise<LinkDTO> {
  const link = await db.shareLink.findFirst({
    where: { id: linkId, file: { ownerId: user.id } },
    select: { id: true, revokedAt: true },
  });
  if (!link) throw new HttpError("not_found", "Link not found.");
  const updated = await db.shareLink.update({
    where: { id: link.id },
    data: { revokedAt: link.revokedAt ?? new Date() },
  });
  return toLinkDTO(updated, new Date());
}

// ─── Visitors ─────────────────────────────────────────────────────────

async function loadByToken(token: string) {
  if (!isWellFormedToken(token)) return null;
  return db.shareLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      file: {
        select: {
          id: true,
          ownerId: true,
          name: true,
          size: true,
          mimeType: true,
          visibility: true,
          createdAt: true,
          status: true,
          s3Key: true,
          owner: { select: { name: true } },
        },
      },
    },
  });
}

type LoadedLink = NonNullable<Awaited<ReturnType<typeof loadByToken>>>;

const isUnlocked = (link: LoadedLink, cookie: string | undefined) =>
  !link.passwordHash || verifyUnlock(link.id, cookie, SECRET, Math.floor(Date.now() / 1000));

function evaluate(link: LoadedLink, cookie: string | undefined, intent: "view" | "download") {
  return authorizeLink(
    { ...link, hasPassword: Boolean(link.passwordHash) },
    link.file,
    { now: new Date(), unlocked: isUnlocked(link, cookie), intent },
  );
}

export type LinkPageState =
  | { kind: "missing" }
  | { kind: "denied"; reason: Exclude<LinkDenial, "locked" | "download_only"> }
  | { kind: "locked"; linkId: string; expiresAt: string }
  | {
      kind: "open";
      linkId: string;
      file: FileDTO;
      ownerName: string;
      expiresAt: string;
      canPreview: boolean;
      downloadsLeft: number | null;
    };

/** What the /s/[token] page should show. File details stay hidden until unlocked. */
export async function getLinkPageState(token: string, cookie: (linkId: string) => string | undefined): Promise<LinkPageState> {
  const link = await loadByToken(token);
  if (!link) return { kind: "missing" };
  const access = evaluate(link, cookie(link.id), "download");
  if (!access.allowed) {
    if (access.reason === "locked") {
      return { kind: "locked", linkId: link.id, expiresAt: link.expiresAt.toISOString() };
    }
    return { kind: "denied", reason: access.reason as Exclude<LinkDenial, "locked" | "download_only"> };
  }
  const { file } = link;
  return {
    kind: "open",
    linkId: link.id,
    file: {
      id: file.id,
      name: file.name,
      size: Number(file.size),
      mimeType: file.mimeType,
      visibility: file.visibility,
      createdAt: file.createdAt.toISOString(),
    },
    ownerName: file.owner.name,
    expiresAt: link.expiresAt.toISOString(),
    canPreview: link.maxDownloads === null && previewKind(file.mimeType) !== null,
    downloadsLeft: link.maxDownloads === null ? null : link.maxDownloads - link.downloadCount,
  };
}

/** Checks a link password; returns the signed cookie that proves it. */
export async function unlockLink(token: string, password: string, ip: string) {
  const link = await loadByToken(token);
  if (!link || !link.passwordHash) throw new HttpError("not_found", "This link is no longer available.");
  const ipKey = hashIp(ip, SECRET);
  await rateLimit(`unlock:${link.id}:${ipKey}`, 5, 15 * 60_000);
  await rateLimit(`unlock:${link.id}`, 50, 15 * 60_000);

  const access = evaluate(link, undefined, "download");
  if (!access.allowed && access.reason !== "locked") {
    throw new HttpError("forbidden", "This link is no longer available.");
  }
  const ok = await verifyPassword({ hash: link.passwordHash, password });
  if (!ok) throw new HttpError("unauthorized", "That password isn't right.");

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = Math.min(nowSec + UNLOCK_TTL_SEC, Math.floor(link.expiresAt.getTime() / 1000));
  return { name: unlockCookieName(link.id), value: signUnlock(link.id, exp, SECRET), maxAge: exp - nowSec };
}

/** Resolves a link to a short-lived S3 URL, consuming a download if limited. */
export async function resolveLinkContent(
  token: string,
  intent: "view" | "download",
  cookie: (linkId: string) => string | undefined,
  ip: string,
): Promise<string> {
  const link = await loadByToken(token);
  if (!link) throw notFound();
  const access = evaluate(link, cookie(link.id), intent);
  if (!access.allowed) throw new HttpError("forbidden", "This link is no longer available.");

  const contentType = intent === "view" ? inlineContentType(link.file.mimeType) : undefined;
  if (intent === "view" && !contentType) throw new HttpError("bad_request", "This file can't be previewed.");

  if (intent === "download" && link.maxDownloads !== null) {
    // Atomic claim of one download: concurrent requests can never exceed the limit.
    const claimed = await db.$executeRaw`
      UPDATE share_link SET "downloadCount" = "downloadCount" + 1
      WHERE id = ${link.id} AND "revokedAt" IS NULL AND "expiresAt" > NOW()
        AND "downloadCount" < "maxDownloads"`;
    if (claimed !== 1) throw new HttpError("forbidden", "This link has reached its download limit.");
  } else if (intent === "download") {
    await db.shareLink.update({ where: { id: link.id }, data: { downloadCount: { increment: 1 } } });
  }

  await recordAccess({
    fileId: link.file.id,
    action: intent === "view" ? "VIEW" : "DOWNLOAD",
    channel: "TEMP_LINK",
    linkId: link.id,
    ip,
  });

  return signedGetUrl({
    key: link.file.s3Key,
    filename: link.file.name,
    disposition: intent === "view" ? "inline" : "attachment",
    contentType,
    mode: "once",
  });
}
