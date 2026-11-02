import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

/** Only allow same-site relative redirects after sign-in (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/files"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
