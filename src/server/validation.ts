import "server-only";
import { z } from "zod";
import { VISIBILITIES } from "@/lib/types";
import { LINK_LIMITS } from "./access/policy";

const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid id.");

export const fileIdParam = z.object({ id });

export const listQuery = z.object({
  q: z.string().trim().max(100).optional().transform((v) => v || undefined),
  visibility: z.enum(VISIBILITIES).optional(),
  sort: z.enum(["newest", "oldest", "name", "size"]).default("newest"),
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(48),
});

export const createUploadBody = z.object({
  name: z.string().min(1, "File name is required.").max(1024),
  size: z.number().int().positive("Empty files can't be uploaded."),
  mimeType: z.string().max(255).optional(),
});

export const updateFileBody = z
  .object({
    name: z.string().trim().min(1, "Name can't be empty.").max(200).optional(),
    visibility: z.enum(VISIBILITIES).optional(),
  })
  .refine((v) => v.name !== undefined || v.visibility !== undefined, "Nothing to update.");

export const addShareBody = z.object({
  email: z.email("Enter a valid email address.").max(254),
});

export const createLinkBody = z.object({
  ttlSeconds: z.number().int().min(LINK_LIMITS.minTtlSeconds).max(LINK_LIMITS.maxTtlSeconds, "Links can last up to 30 days."),
  label: z.string().trim().max(60).optional(),
  password: z.string().min(4, "Use at least 4 characters.").max(128).optional(),
  maxDownloads: z.number().int().min(1).max(LINK_LIMITS.maxDownloads).optional(),
});

export const unlockBody = z.object({ password: z.string().min(1).max(128) });

export const tokenParam = z.object({ token: z.string().min(1).max(64) });

export const dispositionQuery = z.enum(["inline", "attachment"]).catch("attachment");
export const intentQuery = z.enum(["view", "download"]).catch("download");
