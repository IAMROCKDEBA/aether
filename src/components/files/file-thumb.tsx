"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { previewKind } from "@/lib/mime";
import { FileGlyph } from "./file-glyph";

/** Image thumbnail through the authorising content route, with a glyph fallback. */
export function FileThumb({
  id,
  name,
  mimeType,
  src,
  className,
}: {
  id: string;
  name: string;
  mimeType: string;
  /** Override the preview URL (e.g. temporary-link pages). */
  src?: string;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const isImage = previewKind(mimeType) === "image";

  if (!isImage || state === "failed") return <FileGlyph name={name} mimeType={mimeType} className={className} />;

  return (
    <div className={cn("relative size-full overflow-hidden", state === "loading" && "skeleton", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs; next/image would proxy private files */}
      <img
        src={src ?? `/api/files/${id}/content?disposition=inline`}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setState("ready")}
        onError={() => setState("failed")}
        className={cn(
          "size-full object-cover transition-[opacity,transform] duration-700 ease-out-expo",
          state === "ready" ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
        )}
      />
    </div>
  );
}
