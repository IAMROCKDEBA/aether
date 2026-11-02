import "server-only";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  // Only send checksums when an operation requires them; keeps presigned
  // browser requests and S3-compatible local storage working identically.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const Bucket = env.S3_BUCKET;

/** Object keys are generated server-side and never derived from user input. */
export const newObjectKey = (ownerId: string) => `u/${ownerId}/${randomUUID()}`;

const UPLOAD_TTL_SECONDS = 5 * 60;

/**
 * A presigned POST policy: S3 itself rejects any body whose size or type differs
 * from what we authorised, so limits can't be bypassed by a modified client.
 */
export function createUploadPolicy(key: string, size: number, contentType: string) {
  return createPresignedPost(s3, {
    Bucket,
    Key: key,
    Expires: UPLOAD_TTL_SECONDS,
    Fields: { "Content-Type": contentType },
    Conditions: [
      ["content-length-range", size, size],
      ["eq", "$Content-Type", contentType],
    ],
  });
}

export async function headObject(key: string): Promise<{ size: number } | null> {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    return { size: head.ContentLength ?? 0 };
  } catch (error) {
    if (error instanceof NotFound || (error as { name?: string }).name === "NotFound") return null;
    throw error;
  }
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
}

/** RFC 6266 / 5987 Content-Disposition that is safe for any filename. */
export function contentDisposition(type: "inline" | "attachment", filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

type SignedGet = {
  key: string;
  filename: string;
  disposition: "inline" | "attachment";
  /** Only set for inline previews of allow-listed types. */
  contentType?: string;
  /**
   * "stable": URL is identical within a 5-minute bucket so browsers can cache
   * previews/thumbnails. "once": fresh, 60-second URL for downloads.
   */
  mode: "stable" | "once";
};

const STABLE_WINDOW_MS = 5 * 60 * 1000;

export function signedGetUrl({ key, filename, disposition, contentType, mode }: SignedGet) {
  const command = new GetObjectCommand({
    Bucket,
    Key: key,
    ResponseContentDisposition: contentDisposition(disposition, filename),
    ResponseContentType: contentType,
  });
  if (mode === "once") return getSignedUrl(s3, command, { expiresIn: 60 });
  const signingDate = new Date(Math.floor(Date.now() / STABLE_WINDOW_MS) * STABLE_WINDOW_MS);
  return getSignedUrl(s3, command, { expiresIn: 600, signingDate });
}
