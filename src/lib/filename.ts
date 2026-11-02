const MAX_NAME_LENGTH = 200;

const ch = (code: number) => String.fromCharCode(code);
// C0 controls, DEL and Unicode bidi overrides/isolates ("Trojan Source" filename spoofing).
const INVISIBLE = new RegExp(`[${ch(0)}-${ch(0x1f)}${ch(0x7f)}${ch(0x202a)}-${ch(0x202e)}${ch(0x2066)}-${ch(0x2069)}]`, "g");

/**
 * Normalises a user-supplied file name for display and Content-Disposition.
 * Names are metadata only; storage keys never derive from them.
 */
export function sanitizeFileName(input: string): string {
  const base = input.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+$/, "");
  if (!cleaned) return "Untitled";
  if (cleaned.length <= MAX_NAME_LENGTH) return cleaned;
  const dot = cleaned.lastIndexOf(".");
  const ext = dot > 0 && cleaned.length - dot <= 12 ? cleaned.slice(dot) : "";
  return cleaned.slice(0, MAX_NAME_LENGTH - ext.length) + ext;
}

const MIME_SHAPE = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,63}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,63}$/;

export function normalizeMimeType(input: string | undefined): string {
  const value = (input ?? "").toLowerCase().split(";")[0]!.trim();
  return MIME_SHAPE.test(value) ? value : "application/octet-stream";
}
