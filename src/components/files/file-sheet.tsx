"use client";

import { Check, Copy, Download, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ease, fadeUp, stagger } from "@/components/motion/presets";
import { ActivitySection } from "@/components/sharing/activity-section";
import { LinksSection } from "@/components/sharing/links-section";
import { PeopleSection } from "@/components/sharing/people-section";
import { VisibilitySwitch } from "@/components/sharing/visibility-switch";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api";
import { copyText, fileUrl } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import { formatBytes, formatDate } from "@/lib/format";
import type { FileDetailDTO, LinkDTO, OwnedFileDTO, ShareDTO, Visibility } from "@/lib/types";
import { FileThumb } from "./file-thumb";
import { PermissionOrbit } from "./permission-orbit";
import { VISIBILITY_META } from "./visibility";

type Props = {
  file: OwnedFileDTO | null;
  onClose: () => void;
  onChange: (file: OwnedFileDTO) => void;
  onRequestDelete: (file: OwnedFileDTO) => void;
};

const TOAST: Record<Visibility, string> = {
  PRIVATE: "Now private. Only you can open it.",
  RESTRICTED: "Now restricted to invited people and valid links.",
  PUBLIC: "Now public. Anyone with the URL can open it.",
};

export function FileSheet({ file, onClose, onChange, onRequestDelete }: Props) {
  // Keep the last file while the sheet animates out.
  const [shown, setShown] = useState(file);
  if (file && file !== shown) setShown(file);

  return (
    <Sheet open={Boolean(file)} onOpenChange={(o) => !o && onClose()} title={shown ? `${shown.name} — access` : "File"}>
      {shown && <SheetBody key={shown.id} file={shown} onChange={onChange} onRequestDelete={onRequestDelete} />}
    </Sheet>
  );
}

function SheetBody({ file, onChange, onRequestDelete }: Omit<Props, "file" | "onClose"> & { file: OwnedFileDTO }) {
  const [detail, setDetail] = useState<FileDetailDTO | null>(null);
  const [failed, setFailed] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<FileDetailDTO>(`/api/files/${file.id}`, { signal: controller.signal })
      .then(setDetail)
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        setFailed(true);
        toast.error(errorMessage(error));
      });
    return () => controller.abort();
  }, [file.id]);

  const setShares = (shares: ShareDTO[]) => {
    setDetail((d) => (d ? { ...d, shares } : d));
    onChange({ ...file, shareCount: shares.length });
  };
  const setLinks = (links: LinkDTO[]) => {
    setDetail((d) => (d ? { ...d, links } : d));
    onChange({ ...file, activeLinkCount: links.filter((l) => l.state === "active").length });
  };

  async function changeVisibility(visibility: Visibility) {
    const previous = file;
    onChange({ ...file, visibility }); // optimistic
    setSavingVisibility(true);
    try {
      const updated = await api<OwnedFileDTO>(`/api/files/${file.id}`, { method: "PATCH", json: { visibility } });
      onChange(updated);
      toast.success(TOAST[visibility]);
    } catch (error) {
      onChange(previous);
      toast.error(errorMessage(error));
    } finally {
      setSavingVisibility(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      <motion.div variants={stagger(0.05, 0.08)} initial="hidden" animate="show" className="space-y-8 p-5 pb-10 sm:p-7">
        <motion.div variants={fadeUp}>
          <div className="relative aspect-[16/9] overflow-hidden rounded-[22px] border border-line bg-sunken">
            <FileThumb id={file.id} name={file.name} mimeType={file.mimeType} className="[&_svg]:size-12" />
          </div>
          <EditableName file={file} onChange={onChange} />
          <p className="mt-1 text-[13px] text-ink-muted">
            {formatBytes(file.size)} · {file.mimeType} · Uploaded {formatDate(file.createdAt)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href={`/f/${file.id}`} target="_blank" rel="noopener">
                <ExternalLink className="size-3.5" /> Open viewer
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/files/${file.id}/content?disposition=attachment`}>
                <Download className="size-3.5" /> Download
              </a>
            </Button>
            <Button variant="danger" size="sm" className="ml-auto" onClick={() => onRequestDelete(file)}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </motion.div>

        <motion.section variants={fadeUp} aria-labelledby="access-heading" className="rounded-[26px] border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <PermissionOrbit level={file.visibility} className="w-[92px] shrink-0" />
            <div className="min-w-0">
              <h3 id="access-heading" className="text-[15px] font-medium text-ink">
                Who can open this file
              </h3>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={file.visibility}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease }}
                  className="mt-1 text-[13.5px] leading-snug text-ink-soft"
                >
                  {VISIBILITY_META[file.visibility].description}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          <div className="mt-4">
            <VisibilitySwitch value={file.visibility} onChange={changeVisibility} disabled={savingVisibility} />
          </div>
          <AnimatePresence initial={false}>
            {file.visibility === "PUBLIC" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <PublicUrl id={file.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {!detail ? (
          <motion.div variants={fadeUp} className="space-y-3" aria-busy={!failed}>
            {failed ? (
              <p className="text-sm text-danger">Couldn&apos;t load sharing details. Close and try again.</p>
            ) : (
              <>
                <div className="skeleton h-5 w-40 rounded-lg" />
                <div className="skeleton h-11 rounded-xl" />
                <div className="skeleton h-28 rounded-2xl" />
              </>
            )}
          </motion.div>
        ) : (
          <>
            <motion.div variants={fadeUp}>
              <PeopleSection fileId={file.id} visibility={file.visibility} shares={detail.shares} onSharesChange={setShares} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <LinksSection
                fileId={file.id}
                visibility={file.visibility}
                links={detail.links}
                onLinksChange={setLinks}
                onMakeRestricted={() => changeVisibility("RESTRICTED")}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <ActivitySection events={detail.events} />
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function PublicUrl({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `/f/${id}` : fileUrl(id);
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-public/25 bg-public-soft py-1.5 pr-1.5 pl-3.5">
      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-soft">{url.replace(/^https?:\/\//, "")}</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          await copyText(url, "Public link copied");
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="size-3.5 text-public" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function EditableName({ file, onChange }: { file: OwnedFileDTO; onChange: (f: OwnedFileDTO) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(file.name);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      input.current?.focus();
      const dot = file.name.lastIndexOf(".");
      input.current?.setSelectionRange(0, dot > 0 ? dot : file.name.length);
    }
  }, [editing, file.name]);

  async function save() {
    const name = value.trim();
    if (!name || name === file.name) {
      setValue(file.name);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await api<OwnedFileDTO>(`/api/files/${file.id}`, { method: "PATCH", json: { name } });
      onChange(updated);
      setValue(updated.name);
      setEditing(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={input}
        value={value}
        disabled={saving}
        maxLength={200}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(file.name);
            setEditing(false);
          }
        }}
        aria-label="File name"
        className="mt-5 w-full rounded-xl border border-gold-bright bg-raised px-3 py-1.5 font-display text-[28px] leading-tight text-ink shadow-[0_0_0_4px_var(--gold-soft)] outline-none"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="group mt-5 flex max-w-full items-center gap-2 rounded-xl text-left"
      aria-label={`Rename ${file.name}`}
    >
      <h2 className={cn("truncate font-display text-[30px] leading-tight text-ink")}>{file.name}</h2>
      <Pencil className="size-4 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}
