import "server-only";
import { z } from "zod";

const bool = z
  .enum(["true", "false", ""])
  .optional()
  .transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z
    .url()
    .transform((v) => v.replace(/\/+$/, "")),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().startsWith("postgres"),
  S3_REGION: z.string().min(1),
  // No dots: dotted names force path-style URLs and break virtual-hosted TLS/CSP origins.
  S3_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, "S3 bucket name: lowercase letters, digits and hyphens only"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_ENDPOINT: z
    .union([z.url(), z.literal("")])
    .optional()
    .transform((v) => v || undefined),
  S3_FORCE_PATH_STYLE: bool,
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().max(5 * 1024).default(100),
  USER_QUOTA_MB: z.coerce.number().int().positive().default(1024),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
}

const raw = parsed.data;

const MB = 1024 * 1024;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  secureCookies: raw.APP_URL.startsWith("https://"),
  maxFileSize: raw.MAX_FILE_SIZE_MB * MB,
  userQuota: raw.USER_QUOTA_MB * MB,
  /** Origins the browser talks to for uploads/previews; used by the CSP. */
  s3BrowserOrigins: raw.S3_ENDPOINT
    ? [new URL(raw.S3_ENDPOINT).origin]
    : [
        `https://${raw.S3_BUCKET}.s3.${raw.S3_REGION}.amazonaws.com`,
        `https://${raw.S3_BUCKET}.s3.amazonaws.com`,
      ],
} as const;
