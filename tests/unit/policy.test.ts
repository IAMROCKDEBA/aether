import { describe, expect, it } from "vitest";
import { authorizeDirect, authorizeLink, linkState, type FileFacts } from "@/server/access/policy";
import type { Visibility } from "@/lib/types";

const OWNER = "owner";
const INVITEE = "invitee";
const STRANGER = "stranger";

const file = (visibility: Visibility, status: FileFacts["status"] = "READY"): FileFacts => ({
  ownerId: OWNER,
  visibility,
  status,
});

describe("authorizeDirect", () => {
  // [visibility, actor, invited, expected channel or null for denied]
  const matrix: [Visibility, string | null, boolean, string | null][] = [
    ["PRIVATE", OWNER, false, "OWNER"],
    ["PRIVATE", INVITEE, true, null],
    ["PRIVATE", STRANGER, false, null],
    ["PRIVATE", null, false, null],
    ["RESTRICTED", OWNER, false, "OWNER"],
    ["RESTRICTED", INVITEE, true, "SHARED_USER"],
    ["RESTRICTED", STRANGER, false, null],
    ["RESTRICTED", null, false, null],
    ["PUBLIC", OWNER, false, "OWNER"],
    ["PUBLIC", INVITEE, true, "SHARED_USER"],
    ["PUBLIC", STRANGER, false, "PUBLIC_URL"],
    ["PUBLIC", null, false, "PUBLIC_URL"],
  ];

  it.each(matrix)("%s file, actor=%s invited=%s → %s", (visibility, actor, invited, expected) => {
    const result = authorizeDirect(actor, file(visibility), invited);
    if (expected === null) expect(result.allowed).toBe(false);
    else expect(result).toEqual({ allowed: true, channel: expected });
  });

  it("denies everyone, even the owner, while an upload is pending", () => {
    for (const v of ["PRIVATE", "RESTRICTED", "PUBLIC"] as const) {
      expect(authorizeDirect(OWNER, file(v, "PENDING"), false).allowed).toBe(false);
    }
  });

  it("an invitation alone never grants anonymous access", () => {
    expect(authorizeDirect(null, file("RESTRICTED"), true).allowed).toBe(false);
  });
});

describe("linkState", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const base = { expiresAt: new Date("2026-01-02T00:00:00Z"), revokedAt: null, maxDownloads: null, downloadCount: 0 };

  it("is active within its lifetime", () => expect(linkState(base, now)).toBe("active"));
  it("expires exactly at expiresAt", () =>
    expect(linkState({ ...base, expiresAt: now }, now)).toBe("expired"));
  it("revocation wins over everything", () =>
    expect(linkState({ ...base, revokedAt: now, expiresAt: new Date(0), downloadCount: 9, maxDownloads: 1 }, now)).toBe("revoked"));
  it("is exhausted when the download limit is reached", () =>
    expect(linkState({ ...base, maxDownloads: 2, downloadCount: 2 }, now)).toBe("exhausted"));
  it("stays active below the limit", () =>
    expect(linkState({ ...base, maxDownloads: 2, downloadCount: 1 }, now)).toBe("active"));
});

describe("authorizeLink", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const link = {
    expiresAt: new Date("2026-01-02T00:00:00Z"),
    revokedAt: null,
    maxDownloads: null as number | null,
    downloadCount: 0,
    hasPassword: false,
  };
  const ctx = { now, unlocked: false, intent: "download" as const };

  it("works for restricted and public files", () => {
    expect(authorizeLink(link, file("RESTRICTED"), ctx)).toEqual({ allowed: true });
    expect(authorizeLink(link, file("PUBLIC"), ctx)).toEqual({ allowed: true });
  });

  it("is paused while the file is private", () => {
    expect(authorizeLink(link, file("PRIVATE"), ctx)).toEqual({ allowed: false, reason: "paused" });
  });

  it("reports expiry, revocation and exhaustion before anything else", () => {
    expect(authorizeLink({ ...link, expiresAt: now }, file("PRIVATE"), ctx)).toEqual({ allowed: false, reason: "expired" });
    expect(authorizeLink({ ...link, revokedAt: now }, file("PUBLIC"), ctx)).toEqual({ allowed: false, reason: "revoked" });
    expect(authorizeLink({ ...link, maxDownloads: 1, downloadCount: 1 }, file("PUBLIC"), ctx)).toEqual({
      allowed: false,
      reason: "exhausted",
    });
  });

  it("requires the password to be entered", () => {
    const locked = { ...link, hasPassword: true };
    expect(authorizeLink(locked, file("RESTRICTED"), ctx)).toEqual({ allowed: false, reason: "locked" });
    expect(authorizeLink(locked, file("RESTRICTED"), { ...ctx, unlocked: true })).toEqual({ allowed: true });
  });

  it("makes download-limited links download-only", () => {
    const limited = { ...link, maxDownloads: 3 };
    expect(authorizeLink(limited, file("RESTRICTED"), { ...ctx, intent: "view" })).toEqual({
      allowed: false,
      reason: "download_only",
    });
    expect(authorizeLink(limited, file("RESTRICTED"), ctx)).toEqual({ allowed: true });
  });

  it("never serves a file whose upload is unfinished", () => {
    expect(authorizeLink(link, file("PUBLIC", "PENDING"), ctx)).toEqual({ allowed: false, reason: "unavailable" });
  });
});
