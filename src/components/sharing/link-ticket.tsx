"use client";

import { Ban, Check, Clock3, Copy, Download, KeyRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { spring } from "@/components/motion/presets";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRemaining } from "@/lib/format";
import type { LinkDTO } from "@/lib/types";
import { useNow } from "@/lib/use-now";

const STATE_LABEL = { expired: "Expired", revoked: "Revoked", exhausted: "Limit reached" } as const;

function CountdownRing({ createdAt, expiresAt, now }: { createdAt: string; expiresAt: string; now: number }) {
  const start = new Date(createdAt).getTime();
  const end = new Date(expiresAt).getTime();
  const left = Math.max(0, Math.min(1, (end - now) / (end - start)));
  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-11 shrink-0 place-items-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="#e9d2a0"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - left)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <Clock3 className="size-4 text-[#e9d2a0]" />
    </span>
  );
}

/** A temporary link rendered as a perforated ticket with a live expiry ring. */
export function LinkTicket({ link, onRevoke, onCopy }: { link: LinkDTO; onRevoke: () => Promise<void>; onCopy: () => void }) {
  const now = useNow();
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const expiredNow = link.state === "active" && new Date(link.expiresAt).getTime() <= now;
  const state = expiredNow ? "expired" : link.state;
  const active = state === "active";

  const copy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={spring.smooth}
      className={cn(
        "ticket rounded-[22px] p-4 [--notch-y:62px]",
        active ? "bg-[#16141a] text-[#f0eee9] dark:bg-[#211e26]" : "border border-dashed border-line-strong bg-surface text-ink-muted",
      )}
    >
      <div className="flex items-center gap-3">
        {active ? (
          <CountdownRing createdAt={link.createdAt} expiresAt={link.expiresAt} now={now} />
        ) : (
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-sunken">
            <Ban className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-[13.5px] font-medium", active ? "text-[#f0eee9]" : "text-ink-soft")}>
            {link.label || "Temporary link"}
          </p>
          <p className={cn("truncate font-mono text-[12px]", active ? "text-[#f0eee9]/60" : "")}>
            {link.url.replace(/^https?:\/\//, "")}
          </p>
        </div>
        {active && (
          <button
            onClick={copy}
            aria-label="Copy link"
            className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 transition-[background-color,transform] hover:bg-white/15 active:scale-90"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={copied ? "y" : "n"}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={spring.snappy}
              >
                {copied ? <Check className="size-4 text-[#7fc9ac]" strokeWidth={2.6} /> : <Copy className="size-4" />}
              </motion.span>
            </AnimatePresence>
          </button>
        )}
      </div>

      <div
        className={cn(
          "mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-dashed pt-3 text-[11.5px]",
          active ? "border-white/15" : "border-line-strong",
        )}
      >
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", active ? "bg-white/10" : "bg-surface-sunken")}>
          <Clock3 className="size-3" />
          {active ? `${formatRemaining(new Date(link.expiresAt).getTime() - now)} left` : STATE_LABEL[state as keyof typeof STATE_LABEL]}
        </span>
        {link.hasPassword && (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", active ? "bg-white/10" : "bg-surface-sunken")}>
            <KeyRound className="size-3" /> Password
          </span>
        )}
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", active ? "bg-white/10" : "bg-surface-sunken")}>
          <Download className="size-3" />
          {link.maxDownloads ? `${link.downloadCount} of ${link.maxDownloads}` : `${link.downloadCount} download${link.downloadCount === 1 ? "" : "s"}`}
        </span>

        <span className="ml-auto">
          {active &&
            (confirming ? (
              <span className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    setRevoking(true);
                    await onRevoke().finally(() => setRevoking(false));
                    setConfirming(false);
                  }}
                  disabled={revoking}
                  className="rounded-full bg-[#f08a7c] px-2.5 py-1 font-medium text-[#16141a] transition-opacity disabled:opacity-60"
                >
                  {revoking ? "Revoking…" : "Revoke now"}
                </button>
                <button onClick={() => setConfirming(false)} className="rounded-full px-2 py-1 opacity-70 hover:opacity-100">
                  Keep
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirming(true)} className="rounded-full px-2 py-1 opacity-70 transition-opacity hover:opacity-100">
                Revoke
              </button>
            ))}
          {!active && <span className="opacity-80">expires {formatDateTime(link.expiresAt)}</span>}
        </span>
      </div>
    </motion.li>
  );
}
