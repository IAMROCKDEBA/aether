"use client";

import { useEffect, useState } from "react";
import { FileGlyph } from "@/components/files/file-glyph";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { previewKind } from "@/lib/mime";

const TEXT_LIMIT = 200 * 1024;

/** Reads at most 200 KB so huge text files never stall the page. */
function TextPreview({ src }: { src: string }) {
  const [text, setText] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(src, { signal: controller.signal });
        if (!res.ok || !res.body) throw new Error("preview failed");
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (size < TEXT_LIMIT) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          size += value.length;
        }
        const cut = size >= TEXT_LIMIT;
        if (cut) void reader.cancel();
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const c of chunks) {
          bytes.set(c, offset);
          offset += c.length;
        }
        setText(new TextDecoder().decode(bytes.subarray(0, TEXT_LIMIT)));
        setTruncated(cut);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setFailed(true);
      }
    })();
    return () => controller.abort();
  }, [src]);

  if (failed) return <p className="p-8 text-center text-sm text-ink-muted">This text couldn&apos;t be previewed. Download it instead.</p>;
  if (text === null)
    return (
      <div className="grid h-80 place-items-center">
        <Spinner className="text-ink-muted" />
      </div>
    );
  return (
    <div className="max-h-[70vh] overflow-auto">
      <pre className="p-6 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-ink-soft">{text}</pre>
      {truncated && <p className="border-t border-line px-6 py-3 text-xs text-ink-muted">Showing the first 200 KB. Download for the full file.</p>}
    </div>
  );
}

export function FilePreview({ src, name, mimeType }: { src: string | null; name: string; mimeType: string }) {
  const kind = src ? previewKind(mimeType) : null;
  const [loaded, setLoaded] = useState(false);

  if (!src || !kind) {
    return (
      <div className="grid aspect-[4/3] place-items-center sm:aspect-[16/10]">
        <FileGlyph name={name} mimeType={mimeType} size="lg" className="shadow-lg" />
      </div>
    );
  }

  switch (kind) {
    case "image":
      return (
        <div className={cn("grid min-h-64 place-items-center", !loaded && "skeleton")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned private object */}
          <img
            src={src}
            alt={name}
            onLoad={() => setLoaded(true)}
            className={cn("max-h-[72vh] w-auto object-contain transition-opacity duration-700", loaded ? "opacity-100" : "opacity-0")}
          />
        </div>
      );
    case "video":
      return <video src={src} controls playsInline preload="metadata" className="max-h-[72vh] w-full bg-black" />;
    case "audio":
      return (
        <div className="grid place-items-center gap-6 p-10">
          <FileGlyph name={name} mimeType={mimeType} size="lg" />
          <audio src={src} controls preload="metadata" className="w-full max-w-md" />
        </div>
      );
    case "pdf":
      return <iframe src={src} title={name} className="h-[72vh] w-full bg-white" />;
    case "text":
      return <TextPreview src={src} />;
  }
}
