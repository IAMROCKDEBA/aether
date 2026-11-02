"use client";

import { AlertCircle, Check, ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { FileGlyph } from "@/components/files/file-glyph";
import { spring } from "@/components/motion/presets";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { useUploads, type UploadItem } from "./upload-provider";

function ProgressRing({ value, status }: { value: number; status: UploadItem["status"] }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  if (status === "done")
    return (
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.snappy} className="grid size-6 place-items-center rounded-full bg-public text-white">
        <Check className="size-3.5" strokeWidth={3} />
      </motion.span>
    );
  if (status === "error") return <AlertCircle className="size-5 text-danger" />;
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6 -rotate-90", status === "finalizing" && "animate-spin")}>
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="2.5" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="var(--gold-bright)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - (status === "finalizing" ? 0.75 : value))}
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  );
}

const STATUS_TEXT: Record<UploadItem["status"], string> = {
  queued: "Waiting…",
  uploading: "",
  finalizing: "Verifying in S3…",
  done: "Uploaded · Private",
  error: "",
  canceled: "Canceled",
};

export function UploadTray() {
  const { items, cancel, clearFinished } = useUploads();
  const [collapsed, setCollapsed] = useState(false);
  const busy = items.filter((i) => i.status === "queued" || i.status === "uploading" || i.status === "finalizing");
  const visible = items.length > 0;

  // Tidy away the tray a few seconds after everything finished successfully.
  useEffect(() => {
    if (!items.length || busy.length) return;
    if (items.some((i) => i.status === "error")) return;
    const t = setTimeout(clearFinished, 4000);
    return () => clearTimeout(t);
  }, [items, busy.length, clearFinished]);

  const title = busy.length
    ? `Uploading ${busy.length} file${busy.length > 1 ? "s" : ""}`
    : items.some((i) => i.status === "error")
      ? "Some uploads failed"
      : "Uploads complete";

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          aria-label="Uploads"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={spring.smooth}
          className="edge-light fixed right-3 bottom-[84px] left-3 z-40 overflow-hidden rounded-3xl border border-line bg-raised/95 shadow-lg backdrop-blur-2xl sm:right-6 sm:bottom-6 sm:left-auto sm:w-[380px]"
        >
          <header className="flex items-center justify-between gap-2 py-3 pr-2.5 pl-4">
            <p className="text-sm font-medium text-ink" aria-live="polite">
              {title}
            </p>
            <div className="flex items-center">
              <button
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Expand uploads" : "Collapse uploads"}
                className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                <ChevronDown className={cn("size-4 transition-transform duration-300", collapsed && "rotate-180")} />
              </button>
              {!busy.length && (
                <button
                  onClick={clearFinished}
                  aria-label="Dismiss"
                  className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </header>
          <motion.ul
            initial={false}
            animate={{ height: collapsed ? 0 : "auto" }}
            transition={spring.smooth}
            className="max-h-[50vh] overflow-y-auto"
          >
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring.smooth}
                  className="border-t border-line"
                >
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <FileGlyph name={item.name} mimeType={item.type} size="sm" className="size-9 rounded-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] text-ink">{item.name}</p>
                      <p className={cn("truncate text-xs", item.status === "error" ? "text-danger" : "text-ink-muted")}>
                        {item.status === "uploading"
                          ? `${Math.round(item.progress * 100)}% · ${formatBytes(item.size * item.progress)} of ${formatBytes(item.size)}`
                          : item.status === "error"
                            ? item.error
                            : STATUS_TEXT[item.status]}
                      </p>
                    </div>
                    {item.status === "queued" || item.status === "uploading" ? (
                      <button
                        onClick={() => cancel(item.id)}
                        aria-label={`Cancel ${item.name}`}
                        className="group relative grid size-7 place-items-center"
                      >
                        <span className="transition-opacity group-hover:opacity-0">
                          <ProgressRing value={item.progress} status={item.status} />
                        </span>
                        <X className="absolute size-4 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ) : (
                      <span className="grid size-7 place-items-center">
                        {item.status !== "canceled" && <ProgressRing value={item.progress} status={item.status} />}
                      </span>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
