// Cryptographic helpers for temporary links. Pure (secret passed in) so they are
// unit-testable outside the Next.js runtime.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/** 256 bits of entropy: unguessable, so links cannot be enumerated. */
export const generateToken = () => randomBytes(32).toString("base64url");

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;
export const isWellFormedToken = (token: string) => TOKEN_SHAPE.test(token);

/** Lookup key. A database leak alone never reveals a working link. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const deriveKey = (secret: string, purpose: string) =>
  Buffer.from(hkdfSync("sha256", secret, "aether", purpose, 32));

/** AES-256-GCM seal so owners can copy a link again without storing it in plaintext. */
export function sealToken(token: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret, "link-token"), iv);
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function openToken(sealed: string, secret: string): string {
  const [iv, tag, body] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !body) throw new Error("Malformed sealed token");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret, "link-token"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

const unlockMac = (linkId: string, exp: number, secret: string) =>
  createHmac("sha256", deriveKey(secret, "link-unlock")).update(`${linkId}.${exp}`).digest("base64url");

/** Value for the httpOnly cookie proving a link's password was entered. */
export function signUnlock(linkId: string, expiresAtSec: number, secret: string): string {
  return `${expiresAtSec}.${unlockMac(linkId, expiresAtSec, secret)}`;
}

export function verifyUnlock(linkId: string, value: string | undefined, secret: string, nowSec: number): boolean {
  if (!value) return false;
  const [expRaw, mac] = value.split(".");
  const exp = Number(expRaw);
  if (!mac || !Number.isInteger(exp) || exp <= nowSec) return false;
  const expected = Buffer.from(unlockMac(linkId, exp, secret));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Pseudonymous IP for the activity log: useful for spotting abuse, not reversible. */
export const hashIp = (ip: string, secret: string) =>
  createHmac("sha256", deriveKey(secret, "ip")).update(ip).digest("hex").slice(0, 16);
