export type PreviewKind = "image" | "video" | "audio" | "pdf" | "text" | null;

// Only types browsers render without executing script. SVG and HTML are
// deliberately excluded: they are always served as downloads.
const INLINE: Record<string, PreviewKind> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/avif": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/webm": "audio",
  "application/pdf": "pdf",
  "text/plain": "text",
  "text/csv": "text",
  "text/markdown": "text",
  "application/json": "text",
};

export function previewKind(mimeType: string): PreviewKind {
  return INLINE[mimeType] ?? null;
}

/** The Content-Type S3 should send for an inline preview, if previewable. */
export function inlineContentType(mimeType: string): string | undefined {
  const kind = previewKind(mimeType);
  if (!kind) return undefined;
  return kind === "text" ? "text/plain; charset=utf-8" : mimeType;
}

export type FileFamily = "image" | "video" | "audio" | "pdf" | "doc" | "sheet" | "slides" | "archive" | "code" | "text" | "other";

export function fileFamily(mimeType: string, name: string): FileFamily {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (["doc", "docx", "odt", "rtf", "pages"].includes(ext)) return "doc";
  if (["xls", "xlsx", "ods", "csv", "numbers"].includes(ext)) return "sheet";
  if (["ppt", "pptx", "odp", "key"].includes(ext)) return "slides";
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) return "archive";
  if (["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "go", "rs", "rb", "php", "html", "css", "sh", "sql", "json", "yml", "yaml"].includes(ext)) return "code";
  if (mimeType.startsWith("text/")) return "text";
  return "other";
}
