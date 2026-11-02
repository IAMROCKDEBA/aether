"use client";

import { Mail, UserPlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { spring } from "@/components/motion/presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { ShareDTO, Visibility } from "@/lib/types";

export function PeopleSection({
  fileId,
  visibility,
  shares,
  onSharesChange,
}: {
  fileId: string;
  visibility: Visibility;
  shares: ShareDTO[];
  onSharesChange: (shares: ShareDTO[]) => void;
}) {
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const paused = visibility === "PRIVATE";

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const share = await api<ShareDTO>(`/api/files/${fileId}/shares`, { method: "POST", json: { email: email.trim() } });
      onSharesChange([...shares.filter((s) => s.userId !== share.userId), share]);
      setEmail("");
      toast.success(`${share.name} can now ${paused ? "open it once it's restricted" : "open this file"}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  async function remove(share: ShareDTO) {
    setRemoving(share.userId);
    try {
      await api(`/api/files/${fileId}/shares/${share.userId}`, { method: "DELETE" });
      onSharesChange(shares.filter((s) => s.userId !== share.userId));
      toast.success(`Removed ${share.name}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section aria-labelledby="people-heading">
      <h3 id="people-heading" className="text-[15px] font-medium text-ink">
        People with access
      </h3>
      <p className="text-[13px] text-ink-muted">
        {paused ? "Invitations are paused while the file is private." : "Invite Aether users by email. They'll find it under Shared with me."}
      </p>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <div className="flex-1">
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="name@example.com"
            aria-label="Email to invite"
            icon={<Mail className="size-4" />}
            invalid={Boolean(error)}
          />
        </div>
        <Button type="submit" variant="secondary" loading={adding} disabled={!email.trim()} className="h-11">
          <UserPlus className="size-4" /> Invite
        </Button>
      </form>
      <AnimatePresence>
        {error && (
          <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-[13px] text-danger">
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {shares.length > 0 && (
        <ul className={cn("mt-3 divide-y divide-line rounded-2xl border border-line bg-surface", paused && "opacity-50")}>
          <AnimatePresence initial={false}>
            {shares.map((s) => (
              <motion.li
                key={s.userId}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring.smooth}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-restricted-soft text-[12px] font-semibold text-restricted">
                    {s.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{s.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{s.email}</span>
                  </span>
                  <span className="hidden text-xs text-ink-muted sm:block">Can view</span>
                  <button
                    onClick={() => remove(s)}
                    disabled={removing === s.userId}
                    aria-label={`Remove ${s.name}`}
                    className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
