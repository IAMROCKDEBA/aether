import { describe, expect, it } from "vitest";
import {
  generateToken,
  hashIp,
  hashToken,
  isWellFormedToken,
  openToken,
  sealToken,
  signUnlock,
  verifyUnlock,
} from "@/server/access/tokens";
import { normalizeMimeType, sanitizeFileName } from "@/lib/filename";

const SECRET = "test-secret-that-is-definitely-long-enough";

describe("link tokens", () => {
  it("are 256-bit, URL-safe and unique", () => {
    const tokens = new Set(Array.from({ length: 500 }, generateToken));
    expect(tokens.size).toBe(500);
    for (const t of tokens) expect(isWellFormedToken(t)).toBe(true);
  });

  it("rejects malformed tokens before touching the database", () => {
    expect(isWellFormedToken("short")).toBe(false);
    expect(isWellFormedToken("a".repeat(42) + "/")).toBe(false);
  });

  it("hash deterministically and never equal the token", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
  });

  it("seal and open round-trip, with a fresh IV each time", () => {
    const t = generateToken();
    const a = sealToken(t, SECRET);
    const b = sealToken(t, SECRET);
    expect(a).not.toBe(b);
    expect(openToken(a, SECRET)).toBe(t);
  });

  it("cannot be opened with another secret or after tampering", () => {
    const sealed = sealToken(generateToken(), SECRET);
    expect(() => openToken(sealed, SECRET + "x")).toThrow();
    const [iv, tag, body] = sealed.split(".");
    const flipped = body!.slice(0, -1) + (body!.endsWith("A") ? "B" : "A");
    expect(() => openToken([iv, tag, flipped].join("."), SECRET)).toThrow();
  });
});

describe("unlock cookie", () => {
  const now = 1_800_000_000;

  it("verifies for the same link before expiry", () => {
    expect(verifyUnlock("link1", signUnlock("link1", now + 60, SECRET), SECRET, now)).toBe(true);
  });

  it("is bound to one link", () => {
    expect(verifyUnlock("link2", signUnlock("link1", now + 60, SECRET), SECRET, now)).toBe(false);
  });

  it("expires", () => {
    expect(verifyUnlock("link1", signUnlock("link1", now, SECRET), SECRET, now)).toBe(false);
  });

  it("rejects forged expiry and garbage", () => {
    const [, mac] = signUnlock("link1", now + 60, SECRET).split(".");
    expect(verifyUnlock("link1", `${now + 999999}.${mac}`, SECRET, now)).toBe(false);
    expect(verifyUnlock("link1", "garbage", SECRET, now)).toBe(false);
    expect(verifyUnlock("link1", undefined, SECRET, now)).toBe(false);
  });
});

describe("ip hashing", () => {
  it("is stable and pseudonymous", () => {
    expect(hashIp("10.0.0.1", SECRET)).toBe(hashIp("10.0.0.1", SECRET));
    expect(hashIp("10.0.0.1", SECRET)).not.toContain("10.0.0.1");
    expect(hashIp("10.0.0.1", SECRET)).toHaveLength(16);
  });
});

describe("sanitizeFileName", () => {
  it("strips paths, control and bidi-override characters", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Users\\me\\report.pdf")).toBe("report.pdf");
    expect(sanitizeFileName("invoice\u202Efdp.exe")).toBe("invoicefdp.exe");
    expect(sanitizeFileName("a\u0000b\nc.txt")).toBe("abc.txt");
  });

  it("never returns an empty or dot-only name", () => {
    expect(sanitizeFileName("   ")).toBe("Untitled");
    expect(sanitizeFileName("..")).toBe("Untitled");
  });

  it("truncates long names but keeps the extension", () => {
    const name = sanitizeFileName("x".repeat(500) + ".jpeg");
    expect(name.length).toBe(200);
    expect(name.endsWith(".jpeg")).toBe(true);
  });
});

describe("normalizeMimeType", () => {
  it("accepts real types and drops parameters", () => {
    expect(normalizeMimeType("Text/Plain; charset=utf-8")).toBe("text/plain");
    expect(normalizeMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });

  it("falls back for missing or hostile values", () => {
    expect(normalizeMimeType("")).toBe("application/octet-stream");
    expect(normalizeMimeType(undefined)).toBe("application/octet-stream");
    expect(normalizeMimeType("text/html\r\nX-Evil: 1")).toBe("application/octet-stream");
  });
});
