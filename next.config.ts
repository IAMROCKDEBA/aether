import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Where the browser uploads to and previews from (presigned S3 URLs). */
function storageOrigins(): string[] {
  const { S3_ENDPOINT, S3_BUCKET, S3_REGION } = process.env;
  if (S3_ENDPOINT) return [new URL(S3_ENDPOINT).origin];
  if (!S3_BUCKET || !S3_REGION) return [];
  return [`https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`, `https://${S3_BUCKET}.s3.amazonaws.com`];
}

const storage = storageOrigins().join(" ");

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev additionally needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storage}`,
  `media-src 'self' blob: ${storage}`,
  `frame-src 'self' ${storage}`,
  `connect-src 'self' ${storage}${isDev ? " ws: wss:" : ""}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(process.env.APP_URL?.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(process.env.APP_URL?.startsWith("https://")
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  // Every page in Aether is per-user and request-time; the static shell model of
  // Cache Components buys nothing here, so classic dynamic rendering is used.
  cacheComponents: false,
  // Container builds ship the minimal standalone server; `pnpm start` keeps the default.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  devIndicators: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
