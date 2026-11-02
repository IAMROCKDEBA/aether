import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeMimeType, sanitizeFileName } from "@/lib/filename";
import { inlineContentType } from "@/lib/mime";
import type {
  FileDetailDTO,
  FileDTO,
  FilePage,
  OwnedFileDTO,
  SharedFileDTO,
  UsageDTO,
  Visibility,
} from "@/lib/types";
import { authorizeDirect } from "./access/policy";
import { recordAccess } from "./audit";
import { db } from "./db";
import { env } from "./env";
import { HttpError, notFound } from "./http";
import { toLinkDTO } from "./links";
import { rateLimit } from "./rate-limit";
import { createUploadPolicy, deleteObject, headObject, newObjectKey, signedGetUrl } from "./s3";
import type { CurrentUser } from "./session";

const PENDING_GRACE_MS = 60 * 60 * 1000;

const baseSelect = {
  id: true,
  name: true,
  size: true,
  mimeType: true,
  visibility: true,
  createdAt: true,
} satisfies Prisma.FileSelect;

type BaseRow = Prisma.FileGetPayload<{ select: typeof baseSelect }>;

const toFileDTO = (f: BaseRow): FileDTO => ({
  id: f.id,
  name: f.name,
  size: Number(f.size),
  mimeType: f.mimeType,
  visibility: f.visibility,
  createdAt: f.createdAt.toISOString(),
});

const ownedSelect = (now: Date) =>
  ({
    ...baseSelect,
    _count: {
      select: {
        shares: true,
        links: { where: { revokedAt: null, expiresAt: { gt: now } } },
      },
    },
  }) satisfies Prisma.FileSelect;

type OwnedRow = Prisma.FileGetPayload<{ select: ReturnType<typeof ownedSelect> }>;

const toOwnedDTO = (f: OwnedRow): OwnedFileDTO => ({
  ...toFileDTO(f),
  shareCount: f._count.shares,
  activeLinkCount: f._count.links,
});

async function findOwnedFile(user: CurrentUser, fileId: string) {
  const file = await db.file.findFirst({
    where: { id: fileId, ownerId: user.id, status: "READY" },
    select: { ...baseSelect, s3Key: true },
  });
  if (!file) throw notFound();
  return file;
}

// ─── Uploads ──────────────────────────────────────────────────────────

export async function getUsage(userId: string): Promise<UsageDTO> {
  const agg = await db.file.aggregate({
    where: { ownerId: userId, status: "READY" },
    _sum: { size: true },
    _count: true,
  });
  return { used: Number(agg._sum.size ?? 0), quota: env.userQuota, count: agg._count };
}

/** Removes this user's uploads that were authorised but never completed. */
async function sweepStalePending(userId: string) {
  const stale = await db.file.findMany({
    where: { ownerId: userId, status: "PENDING", createdAt: { lt: new Date(Date.now() - PENDING_GRACE_MS) } },
    select: { id: true, s3Key: true },
    take: 25,
  });
  if (!stale.length) return;
  await Promise.allSettled(stale.map((f) => deleteObject(f.s3Key)));
  await db.file.deleteMany({ where: { id: { in: stale.map((f) => f.id) } } });
}

export async function createUpload(
  user: CurrentUser,
  input: { name: string; size: number; mimeType?: string },
) {
  if (input.size > env.maxFileSize) {
    throw new HttpError("payload_too_large", `Files can be up to ${env.MAX_FILE_SIZE_MB} MB.`);
  }
  await rateLimit(`upload:${user.id}`, 120, 60_000);
  await sweepStalePending(user.id);

  const name = sanitizeFileName(input.name);
  const mimeType = normalizeMimeType(input.mimeType);
  const s3Key = newObjectKey(user.id);

  // Serialise quota checks per user so parallel uploads can't overshoot it.
  const file = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    const agg = await tx.file.aggregate({
      where: {
        ownerId: user.id,
        OR: [
          { status: "READY" },
          { status: "PENDING", createdAt: { gt: new Date(Date.now() - PENDING_GRACE_MS) } },
        ],
      },
      _sum: { size: true },
    });
    const committed = Number(agg._sum.size ?? 0);
    if (committed + input.size > env.userQuota) {
      throw new HttpError("payload_too_large", "Not enough storage left for this file.");
    }
    return tx.file.create({
      data: { ownerId: user.id, name, size: BigInt(input.size), mimeType, s3Key },
      select: { id: true },
    });
  });

  const policy = await createUploadPolicy(s3Key, input.size, mimeType);
  return { fileId: file.id, upload: policy };
}

/** Verifies the object really landed in S3 with the authorised size. */
export async function confirmUpload(user: CurrentUser, fileId: string): Promise<OwnedFileDTO> {
  const pending = await db.file.findFirst({
    where: { id: fileId, ownerId: user.id },
    select: { id: true, status: true, size: true, s3Key: true },
  });
  if (!pending) throw notFound();

  if (pending.status === "PENDING") {
    const head = await headObject(pending.s3Key);
    if (!head) throw new HttpError("conflict", "The upload hasn't finished yet.");
    if (BigInt(head.size) !== pending.size) {
      await deleteObject(pending.s3Key).catch(() => undefined);
      await db.file.delete({ where: { id: pending.id } });
      throw new HttpError("unprocessable", "The uploaded file didn't match what was expected.");
    }
    await db.file.update({ where: { id: pending.id }, data: { status: "READY" } });
  }

  const row = await db.file.findUniqueOrThrow({ where: { id: pending.id }, select: ownedSelect(new Date()) });
  return toOwnedDTO(row);
}

/** Lets the client abandon an upload it started (e.g. user cancelled). */
export async function abortUpload(user: CurrentUser, fileId: string) {
  const pending = await db.file.findFirst({
    where: { id: fileId, ownerId: user.id, status: "PENDING" },
    select: { id: true, s3Key: true },
  });
  if (!pending) return;
  await deleteObject(pending.s3Key).catch(() => undefined);
  await db.file.delete({ where: { id: pending.id } });
}

// ─── Owner views ──────────────────────────────────────────────────────

export type ListQuery = {
  q?: string;
  visibility?: Visibility;
  sort: "newest" | "oldest" | "name" | "size";
  cursor?: string;
  limit: number;
};

const ORDER: Record<ListQuery["sort"], Prisma.FileOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  oldest: [{ createdAt: "asc" }, { id: "asc" }],
  name: [{ name: "asc" }, { id: "asc" }],
  size: [{ size: "desc" }, { id: "desc" }],
};

export async function listFiles(user: CurrentUser, query: ListQuery): Promise<FilePage> {
  const where: Prisma.FileWhereInput = {
    ownerId: user.id,
    status: "READY",
    ...(query.visibility && { visibility: query.visibility }),
    ...(query.q && { name: { contains: query.q, mode: "insensitive" } }),
  };
  const [rows, usage] = await Promise.all([
    db.file.findMany({
      where,
      orderBy: ORDER[query.sort],
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      select: ownedSelect(new Date()),
    }),
    getUsage(user.id),
  ]);
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  return {
    files: page.map(toOwnedDTO),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
    usage,
  };
}

export async function getFileDetail(user: CurrentUser, fileId: string): Promise<FileDetailDTO> {
  const now = new Date();
  const file = await db.file.findFirst({
    where: { id: fileId, ownerId: user.id, status: "READY" },
    select: {
      ...ownedSelect(now),
      shares: {
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, user: { select: { id: true, name: true, email: true } } },
      },
      links: { orderBy: { createdAt: "desc" }, take: 50 },
      events: {
        orderBy: { at: "desc" },
        take: 30,
        select: {
          id: true,
          action: true,
          channel: true,
          at: true,
          actor: { select: { name: true } },
          link: { select: { label: true } },
        },
      },
    },
  });
  if (!file) throw notFound();

  return {
    file: toOwnedDTO(file),
    shares: file.shares.map((s) => ({
      userId: s.user.id,
      name: s.user.name,
      email: s.user.email,
      createdAt: s.createdAt.toISOString(),
    })),
    links: file.links.map((l) => toLinkDTO(l, now)),
    events: file.events.map((e) => ({
      id: e.id,
      action: e.action,
      channel: e.channel,
      actorName: e.actor?.name ?? null,
      linkLabel: e.link?.label ?? null,
      at: e.at.toISOString(),
    })),
  };
}

export async function updateFile(
  user: CurrentUser,
  fileId: string,
  patch: { name?: string; visibility?: Visibility },
): Promise<OwnedFileDTO> {
  await findOwnedFile(user, fileId);
  const row = await db.file.update({
    where: { id: fileId },
    data: {
      ...(patch.name !== undefined && { name: sanitizeFileName(patch.name) }),
      ...(patch.visibility && { visibility: patch.visibility }),
    },
    select: ownedSelect(new Date()),
  });
  return toOwnedDTO(row);
}

export async function deleteFile(user: CurrentUser, fileId: string) {
  const file = await findOwnedFile(user, fileId);
  // Database first: access is revoked immediately even if storage is slow.
  await db.file.delete({ where: { id: file.id } });
  try {
    await deleteObject(file.s3Key);
  } catch (error) {
    console.error("[aether] orphaned object after delete", file.s3Key, error);
  }
}

// ─── Sharing with people ──────────────────────────────────────────────

export async function addShare(user: CurrentUser, fileId: string, email: string) {
  await rateLimit(`share:${user.id}`, 30, 60_000);
  await findOwnedFile(user, fileId);
  const normalized = email.trim().toLowerCase();
  if (normalized === user.email.toLowerCase()) {
    throw new HttpError("bad_request", "You already own this file.");
  }
  const target = await db.user.findUnique({ where: { email: normalized }, select: { id: true, name: true, email: true } });
  if (!target) throw new HttpError("not_found", "No Aether account uses that email yet.");
  const share = await db.fileShare.upsert({
    where: { fileId_userId: { fileId, userId: target.id } },
    create: { fileId, userId: target.id },
    update: {},
  });
  return { userId: target.id, name: target.name, email: target.email, createdAt: share.createdAt.toISOString() };
}

export async function removeShare(user: CurrentUser, fileId: string, userId: string) {
  await findOwnedFile(user, fileId);
  await db.fileShare.deleteMany({ where: { fileId, userId } });
}

export async function listSharedWithMe(user: CurrentUser): Promise<SharedFileDTO[]> {
  const shares = await db.fileShare.findMany({
    where: { userId: user.id, file: { status: "READY", visibility: { not: "PRIVATE" } } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      createdAt: true,
      file: { select: { ...baseSelect, owner: { select: { name: true, email: true } } } },
    },
  });
  return shares.map((s) => ({
    ...toFileDTO(s.file),
    owner: s.file.owner,
    sharedAt: s.createdAt.toISOString(),
  }));
}

// ─── Opening files (owner, invited user, or public) ───────────────────

async function loadAuthorized(actorId: string | null, fileId: string) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: {
      ...baseSelect,
      ownerId: true,
      status: true,
      s3Key: true,
      owner: { select: { name: true } },
      shares: actorId ? { where: { userId: actorId }, select: { userId: true } } : false,
    },
  });
  if (!file) return null;
  const access = authorizeDirect(actorId, file, Boolean(file.shares?.length));
  return access.allowed ? { file, channel: access.channel } : null;
}

export async function getViewableFile(actorId: string | null, fileId: string) {
  const result = await loadAuthorized(actorId, fileId);
  if (!result) return null;
  return {
    file: toFileDTO(result.file),
    ownerName: result.file.owner.name,
    isOwner: result.channel === "OWNER",
  };
}

export async function resolveFileContent(
  actorId: string | null,
  fileId: string,
  disposition: "inline" | "attachment",
  ip: string,
): Promise<string> {
  const result = await loadAuthorized(actorId, fileId);
  if (!result) throw notFound();
  const { file, channel } = result;

  const contentType = disposition === "inline" ? inlineContentType(file.mimeType) : undefined;
  const effective = contentType ? "inline" : "attachment";

  if (channel !== "OWNER") {
    await recordAccess({
      fileId: file.id,
      action: effective === "inline" ? "VIEW" : "DOWNLOAD",
      channel,
      actorUserId: actorId,
      ip,
    });
  }

  return signedGetUrl({
    key: file.s3Key,
    filename: file.name,
    disposition: effective,
    contentType,
    mode: effective === "inline" ? "stable" : "once",
  });
}
