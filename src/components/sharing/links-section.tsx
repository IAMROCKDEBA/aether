"use client";

import { Link2, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { spring } from "@/components/motion/presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { copyText } from "@/lib/clipboard";
import type { LinkDTO, Visibility } from "@/lib/types";
import { LinkTicket } from "./link-ticket";

const EXPIRY = [
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86400 },
  { label: "7 days", seconds: 7 * 86400 },
  { label: "30 days", seconds: 30 * 86400 },
];

export function LinksSection({
  fileId,
  visibility,
  links,
  onLinksChange,
  onMakeRestricted,
}: {
  fileId: string;
  visibility: Visibility;
  links: LinkDTO[];
  onLinksChange: (links: LinkDTO[]) => void;
  onMakeRestricted: () => void;
}) {
  const [composing, setComposing] = useState(false);
  const [ttl, setTtl] = useState(86400);
  const [label, setLabel] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [useLimit, setUseLimit] = useState(false);
  const [limit, setLimit] = useState(1);
  const [creating, setCreating] = useState(false);
  const paused = visibility === "PRIVATE";
  const activeCount = links.filter((l) => l.state === "active").length;

  async function create(e: FormEvent) {
    e.preventDefault();
    if (usePassword && password.length < 4) {
      toast.error("Use at least 4 characters for the link password.");
      return;
    }
    setCreating(true);
    try {
      const link = await api<LinkDTO>(`/api/files/${fileId}/links`, {
        method: "POST",
        json: {
          ttlSeconds: ttl,
          label: label.trim() || undefined,
          password: usePassword ? password : undefined,
          maxDownloads: useLimit ? limit : undefined,
        },
      });
      onLinksChange([link, ...links]);
      setComposing(false);
      setLabel("");
      setPassword("");
      setUsePassword(false);
      setUseLimit(false);
      await copyText(link.url, "Link created and copied");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    try {
      const updated = await api<LinkDTO>(`/api/links/${id}`, { method: "DELETE" });
      onLinksChange(links.map((l) => (l.id === id ? updated : l)));
      toast.success("Link revoked. It no longer works.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <section aria-labelledby="links-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="links-heading" className="text-[15px] font-medium text-ink">
            Temporary links
          </h3>
          <p className="text-[13px] text-ink-muted">
            {paused ? "Paused while the file is private." : `${activeCount} active · anyone holding one can download`}
          </p>
        </div>
        {!paused && !composing && (
          <Button size="sm" variant="secondary" onClick={() => setComposing(true)}>
            <Plus className="size-3.5" /> New link
          </Button>
        )}
      </div>

      {paused && (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line-strong p-4 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-restricted-soft text-restricted">
            <Link2 className="size-[18px]" />
          </span>
          <p className="flex-1 text-[13.5px] text-ink-soft">
            Private files can&apos;t be opened through links. Switch to <b className="font-medium text-ink">Restricted</b> to create one.
          </p>
          <Button size="sm" onClick={onMakeRestricted}>
            Make restricted
          </Button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {composing && !paused && (
          <motion.form
            onSubmit={create}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 rounded-2xl border border-line bg-surface p-4">
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-soft">Expires after</p>
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface-sunken p-1">
                  {EXPIRY.map((opt) => (
                    <button
                      type="button"
                      key={opt.seconds}
                      onClick={() => setTtl(opt.seconds)}
                      aria-pressed={ttl === opt.seconds}
                      className={cn(
                        "relative h-8 rounded-[9px] text-[12.5px] font-medium transition-colors",
                        ttl === opt.seconds ? "text-ink" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {ttl === opt.seconds && (
                        <motion.span layoutId="ttl-pill" transition={spring.snappy} className="absolute inset-0 rounded-[9px] bg-raised shadow-sm" />
                      )}
                      <span className="relative">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="Label (optional), e.g. “Client review”" aria-label="Link label" />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="link-pw" className="text-[13.5px] text-ink-soft">
                    Require a password
                  </label>
                  <Switch id="link-pw" label="Require a password" checked={usePassword} onChange={setUsePassword} />
                </div>
                <AnimatePresence initial={false}>
                  {usePassword && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Link password"
                        aria-label="Link password"
                        minLength={4}
                        maxLength={128}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="link-limit" className="text-[13.5px] text-ink-soft">
                    Limit downloads
                  </label>
                  <Switch id="link-limit" label="Limit downloads" checked={useLimit} onChange={setUseLimit} />
                </div>
                <AnimatePresence initial={false}>
                  {useLimit && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={1}
                          max={1000}
                          value={limit}
                          onChange={(e) => setLimit(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                          aria-label="Maximum downloads"
                          className="w-28"
                        />
                        <span className="text-[13px] text-ink-muted">download{limit === 1 ? "" : "s"}, then the link stops. Previews are disabled.</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setComposing(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="gold" loading={creating}>
                  <Link2 className="size-3.5" /> Create link
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {links.length > 0 && (
        <ul className={cn("mt-4 space-y-2.5", paused && "opacity-50")}>
          <AnimatePresence initial={false}>
            {links.map((link) => (
              <LinkTicket key={link.id} link={link} onRevoke={() => revoke(link.id)} onCopy={() => copyText(link.url)} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
