"use client";

import { Link2, UsersRound } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode, Ref } from "react";
import { spring } from "@/components/motion/presets";
import { cn } from "@/lib/cn";
import { formatBytes, timeAgo } from "@/lib/format";
import { trackSpotlight } from "@/lib/spotlight";
import type { FileDTO } from "@/lib/types";
import { FileThumb } from "./file-thumb";
import { VisibilityBadge } from "./visibility";

type CardProps = {
  file: FileDTO;
  onOpen: () => void;
  subtitle?: ReactNode;
  shareCount?: number;
  linkCount?: number;
  actions?: ReactNode;
  index?: number;
  /** Forwarded by AnimatePresence (popLayout) to measure exiting items. */
  ref?: Ref<HTMLElement>;
};

const enter = (index = 0) => ({
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.2 } },
  transition: { ...spring.smooth, delay: Math.min(index, 12) * 0.035 },
});

function AccessHints({ shareCount = 0, linkCount = 0 }: { shareCount?: number; linkCount?: number }) {
  if (!shareCount && !linkCount) return null;
  return (
    <span className="flex items-center gap-2 text-ink-muted">
      {shareCount > 0 && (
        <span className="inline-flex items-center gap-1" title={`${shareCount} ${shareCount === 1 ? "person" : "people"}`}>
          <UsersRound className="size-3.5" />
          {shareCount}
        </span>
      )}
      {linkCount > 0 && (
        <span className="inline-flex items-center gap-1" title={`${linkCount} active link${linkCount === 1 ? "" : "s"}`}>
          <Link2 className="size-3.5" />
          {linkCount}
        </span>
      )}
    </span>
  );
}

export function FileCard({ file, onOpen, subtitle, shareCount, linkCount, actions, index, ref }: CardProps) {
  return (
    <motion.article
      ref={ref}
      layout
      {...enter(index)}
      onPointerMove={trackSpotlight}
      className="spotlight edge-light group relative rounded-[26px] border border-line bg-surface p-2.5 shadow-sm transition-[box-shadow,border-color] duration-500 ease-out-expo hover:border-line-strong hover:shadow-lg"
    >
      <button
        onClick={onOpen}
        className="block w-full text-left focus-visible:rounded-[20px]"
        aria-label={`Open ${file.name}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-[19px] bg-sunken">
          <div className="size-full transition-transform duration-700 ease-out-expo group-hover:scale-[1.035]">
            <FileThumb id={file.id} name={file.name} mimeType={file.mimeType} />
          </div>
          <VisibilityBadge visibility={file.visibility} className="absolute top-2.5 left-2.5 bg-raised/85 shadow-sm backdrop-blur-md" />
        </div>
        <div className="px-1.5 pt-3 pb-1">
          <p className="truncate pr-8 text-[14.5px] font-medium text-ink">{file.name}</p>
          <div className="mt-1 flex items-center justify-between gap-2 text-[12.5px] text-ink-muted">
            <span className="truncate">{subtitle ?? `${formatBytes(file.size)} · ${timeAgo(file.createdAt)}`}</span>
            <AccessHints shareCount={shareCount} linkCount={linkCount} />
          </div>
        </div>
      </button>
      {actions && <div className="absolute right-3 bottom-[52px] sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [&:has([data-state=open])]:opacity-100">{actions}</div>}
    </motion.article>
  );
}

export function FileRow({ file, onOpen, subtitle, shareCount, linkCount, actions, index, ref }: CardProps) {
  return (
    <motion.li
      ref={ref as Ref<HTMLLIElement>}
      layout
      {...enter(index)}
      className="group relative flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-surface sm:gap-4 sm:px-3"
    >
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4" aria-label={`Open ${file.name}`}>
        <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-sunken">
          <FileThumb id={file.id} name={file.name} mimeType={file.mimeType} className="[&_svg]:size-[18px] [&_span]:hidden" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-medium text-ink">{file.name}</p>
          <p className="truncate text-[12.5px] text-ink-muted">{subtitle ?? timeAgo(file.createdAt)}</p>
        </div>
        <span className="hidden w-20 text-right text-[13px] text-ink-muted tabular-nums sm:block">{formatBytes(file.size)}</span>
        <span className="hidden w-16 justify-end text-[13px] md:flex">
          <AccessHints shareCount={shareCount} linkCount={linkCount} />
        </span>
        <VisibilityBadge visibility={file.visibility} className={cn("hidden w-[104px] justify-center sm:inline-flex")} />
      </button>
      {actions && <div className="shrink-0">{actions}</div>}
    </motion.li>
  );
}
