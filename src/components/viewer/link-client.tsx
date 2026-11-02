"use client";

import { ArrowRight, Clock3, Download, KeyRound, LockKeyhole } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { ease, spring } from "@/components/motion/presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatRemaining } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import type { FileDTO } from "@/lib/types";
import { FileViewer } from "./file-viewer";

/** Renders only after hydration so server and client never disagree on the time. */
function Remaining({ expiresAt }: { expiresAt: string }) {
  const now = useNow();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const router = useRouter();
  const ms = new Date(expiresAt).getTime() - now;
  useEffect(() => {
    if (mounted && ms <= 0) router.refresh();
  }, [mounted, ms, router]);
  if (!mounted) return <span className="tabular-nums">—</span>;
  return <span className="tabular-nums">{formatRemaining(ms)}</span>;
}

export function UnlockForm({ token, expiresAt }: { token: string; expiresAt: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/s/${encodeURIComponent(token)}/unlock`, { method: "POST", json: { password } });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setShake((s) => s + 1);
      setPending(false);
    }
  }

  return (
    <motion.div
      key={shake}
      initial={shake ? { x: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
      animate={shake ? { x: [0, -10, 9, -6, 4, 0] } : { opacity: 1, y: 0, scale: 1 }}
      transition={shake ? { duration: 0.45 } : { duration: 0.8, ease }}
      className="edge-light relative mx-auto w-full max-w-md rounded-[32px] border border-line bg-raised/85 p-8 shadow-lg backdrop-blur-2xl sm:p-10"
    >
      <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[#16141a] text-[#e9d2a0] shadow-md ring-1 ring-[#e9d2a0]/25 dark:bg-[#2a2530]">
        <LockKeyhole className="size-7" strokeWidth={1.5} />
      </span>
      <h1 className="mt-6 text-center font-display text-[36px] leading-tight text-ink">
        Protected <em>file</em>
      </h1>
      <p className="mt-2 text-center text-[15px] text-ink-soft">Enter the password the owner gave you.</p>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <Input
          type="password"
          autoFocus
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Link password"
          aria-label="Link password"
          icon={<KeyRound className="size-4" />}
          invalid={Boolean(error)}
          maxLength={128}
        />
        <AnimatePresence>
          {error && (
            <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-center text-[13.5px] text-danger">
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!password}>
          Unlock <ArrowRight className="size-4" />
        </Button>
      </form>
      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
        <Clock3 className="size-3.5" /> Link expires {formatDateTime(expiresAt)}
      </p>
    </motion.div>
  );
}

type OpenState = {
  file: FileDTO;
  ownerName: string;
  expiresAt: string;
  canPreview: boolean;
  downloadsLeft: number | null;
};

export function LinkOpen({ token, state }: { token: string; state: OpenState }) {
  const router = useRouter();
  const base = `/api/s/${encodeURIComponent(token)}/content`;
  return (
    <FileViewer
      file={state.file}
      ownerName={state.ownerName}
      previewSrc={state.canPreview ? `${base}?intent=view` : null}
      downloadHref={`${base}?intent=download`}
      // Limited links: refresh afterwards so the remaining count (or exhausted state) is current.
      onDownload={state.downloadsLeft !== null ? () => setTimeout(() => router.refresh(), 1500) : undefined}
      badge={
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-gold-soft px-2.5 text-[11.5px] font-medium tracking-wide text-gold">
          <Clock3 className="size-3" /> Temporary link
        </span>
      }
      details={
        <>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Expires in</dt>
            <dd className="text-ink">
              <Remaining expiresAt={state.expiresAt} />
            </dd>
          </div>
          {state.downloadsLeft !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Downloads left</dt>
              <dd className="text-ink">
                <motion.span key={state.downloadsLeft} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring.snappy} className="inline-flex items-center gap-1">
                  <Download className="size-3.5 text-gold" />
                  {state.downloadsLeft}
                </motion.span>
              </dd>
            </div>
          )}
        </>
      }
      notice={
        state.downloadsLeft !== null
          ? "Previews are off for download-limited links."
          : !state.canPreview
            ? "This file type can't be previewed in the browser."
            : undefined
      }
    />
  );
}
