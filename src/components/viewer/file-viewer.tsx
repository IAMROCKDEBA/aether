"use client";

import { Download } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { VisibilityBadge } from "@/components/files/visibility";
import { ease } from "@/components/motion/presets";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/format";
import type { FileDTO } from "@/lib/types";
import { FilePreview } from "./file-preview";

export function FileViewer({
  file,
  ownerName,
  previewSrc,
  downloadHref,
  onDownload,
  badge,
  details,
  notice,
}: {
  file: FileDTO;
  ownerName: string;
  previewSrc: string | null;
  downloadHref: string;
  onDownload?: () => void;
  badge?: ReactNode;
  details?: ReactNode;
  notice?: ReactNode;
}) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease }}
        className="edge-light relative overflow-hidden rounded-[30px] border border-line bg-raised/80 shadow-lg backdrop-blur-2xl"
      >
        <FilePreview src={previewSrc} name={file.name} mimeType={file.mimeType} />
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.12 }}
        className="edge-light relative rounded-[30px] border border-line bg-raised/85 p-6 shadow-lg backdrop-blur-2xl lg:sticky lg:top-6"
      >
        {badge ?? <VisibilityBadge visibility={file.visibility} />}
        <h1 className="mt-4 font-display text-[32px] leading-[1.05] break-words text-ink">{file.name}</h1>
        <p className="mt-2 text-sm text-ink-muted">Shared by {ownerName}</p>

        <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-[13.5px]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Size</dt>
            <dd className="text-ink">{formatBytes(file.size)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Type</dt>
            <dd className="truncate text-ink">{file.mimeType}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Uploaded</dt>
            <dd className="text-ink">{formatDate(file.createdAt)}</dd>
          </div>
          {details}
        </dl>

        <Button asChild variant="gold" size="lg" className="mt-6 w-full">
          <a href={downloadHref} onClick={onDownload}>
            <Download className="size-4" /> Download
          </a>
        </Button>
        {notice && <p className="mt-3 text-center text-xs text-ink-muted">{notice}</p>}
      </motion.aside>
    </div>
  );
}
