"use client";

import { ArrowDownUp, Check, Download, ExternalLink, LayoutGrid, Link2, List, MoreHorizontal, PanelRight, Search, Trash2, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { UploadButton } from "@/components/app/app-shell";
import { useVault } from "@/components/app/vault-context";
import { ease, spring } from "@/components/motion/presets";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { copyText, fileUrl } from "@/lib/clipboard";
import { formatBytes } from "@/lib/format";
import { VISIBILITIES, type FilePage, type OwnedFileDTO, type Visibility } from "@/lib/types";
import { FileCard, FileRow } from "./file-card";
import { FileSheet } from "./file-sheet";
import { PermissionOrbit } from "./permission-orbit";
import { VISIBILITY_META } from "./visibility";

type Sort = "newest" | "oldest" | "name" | "size";
type View = "grid" | "list";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "size", label: "Largest first" },
];

const VIEW_KEY = "aether-view";
const viewListeners = new Set<() => void>();

/** Grid/list preference persisted per browser; server render always starts as grid. */
function useViewPreference(): [View, (v: View) => void] {
  const view = useSyncExternalStore(
    (cb) => {
      viewListeners.add(cb);
      return () => void viewListeners.delete(cb);
    },
    () => {
      try {
        return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
      } catch {
        return "grid";
      }
    },
    () => "grid" as View,
  );
  const set = useCallback((v: View) => {
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
    viewListeners.forEach((l) => l());
  }, []);
  return [view, set];
}

function downloadFile(id: string) {
  const a = document.createElement("a");
  a.href = `/api/files/${id}/content?disposition=attachment`;
  a.click();
}

export function VaultView({ initial }: { initial: FilePage }) {
  const { setUsage, adjustUsage, onUploaded } = useVault();
  const [files, setFiles] = useState(initial.files);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<Visibility | null>(null);
  const [sort, setSort] = useState<Sort>("newest");
  const [view, changeView] = useViewPreference();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<OwnedFileDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const firstRender = useRef(true);
  const sentinel = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses search, like most pro tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable=true]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  const buildUrl = useCallback(
    (after?: string | null) => {
      const params = new URLSearchParams({ sort });
      if (debounced) params.set("q", debounced);
      if (filter) params.set("visibility", filter);
      if (after) params.set("cursor", after);
      return `/api/files?${params}`;
    },
    [sort, debounced, filter],
  );

  // Refetch on query changes; stale responses are aborted.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    api<FilePage>(buildUrl(), { signal: controller.signal })
      .then((page) => {
        setFiles(page.files);
        setCursor(page.nextCursor);
        setUsage(page.usage);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") toast.error(errorMessage(error));
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [buildUrl, setUsage]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api<FilePage>(buildUrl(cursor));
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => f.id));
        return [...prev, ...page.files.filter((f) => !seen.has(f.id))];
      });
      setCursor(page.nextCursor);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildUrl]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && loadMore(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  // New uploads appear at the top when they belong to the current view.
  useEffect(
    () =>
      onUploaded((file) => {
        const matches =
          (!filter || filter === file.visibility) &&
          (!debounced || file.name.toLowerCase().includes(debounced.toLowerCase()));
        if (!matches) return;
        setFiles((prev) => (sort === "newest" ? [file, ...prev] : [...prev, file]));
      }),
    [onUploaded, filter, debounced, sort],
  );

  const updateFile = useCallback(
    (updated: OwnedFileDTO) => {
      setFiles((prev) =>
        prev
          .map((f) => (f.id === updated.id ? updated : f))
          .filter((f) => !filter || f.visibility === filter || f.id === openId),
      );
    },
    [filter, openId],
  );

  const removeFile = useCallback(
    (file: OwnedFileDTO) => {
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      adjustUsage(-file.size, -1);
    },
    [adjustUsage],
  );

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/files/${toDelete.id}`, { method: "DELETE" });
      removeFile(toDelete);
      if (openId === toDelete.id) setOpenId(null);
      toast.success("File deleted", { description: toDelete.name });
      setToDelete(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const isFiltered = Boolean(debounced || filter);
  const openFile = useMemo(() => files.find((f) => f.id === openId) ?? null, [files, openId]);
  const { usage } = useVault();

  const actionsFor = (file: OwnedFileDTO) => (
    <Menu>
      <MenuTrigger asChild>
        <button
          aria-label={`Actions for ${file.name}`}
          className="grid size-8 place-items-center rounded-full bg-raised/90 text-ink-soft shadow-sm backdrop-blur-md transition-colors hover:text-ink data-[state=open]:text-ink"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem icon={<PanelRight />} onSelect={() => setOpenId(file.id)}>
          Access &amp; sharing
        </MenuItem>
        <MenuItem icon={<ExternalLink />} onSelect={() => window.open(`/f/${file.id}`, "_blank", "noopener")}>
          Open viewer
        </MenuItem>
        <MenuItem icon={<Download />} onSelect={() => downloadFile(file.id)}>
          Download
        </MenuItem>
        {file.visibility === "PUBLIC" && (
          <MenuItem icon={<Link2 />} onSelect={() => copyText(fileUrl(file.id), "Public link copied")}>
            Copy public link
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem icon={<Trash2 />} destructive onSelect={() => setToDelete(file)}>
          Delete
        </MenuItem>
      </MenuContent>
    </Menu>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-[44px] leading-none tracking-[-0.02em] text-ink sm:text-[56px]">
            My <em>vault</em>
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {usage.count} file{usage.count === 1 ? "" : "s"} · {formatBytes(usage.used)} stored on Amazon S3
          </p>
        </div>
      </motion.header>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.08 }}
        className="sticky top-16 z-20 -mx-4 mt-7 flex flex-wrap items-center gap-2 bg-canvas/80 px-4 py-3 backdrop-blur-2xl sm:-mx-8 sm:px-8 lg:top-0 lg:-mx-12 lg:px-12"
      >
        <div className="group relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted transition-colors group-focus-within:text-gold" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Search files"
            aria-label="Search files"
            className="h-10 w-full rounded-xl border border-line-strong bg-raised pr-16 pl-10 text-[15px] text-ink shadow-sm transition-[border-color,box-shadow] duration-300 outline-none placeholder:text-ink-muted/80 focus:border-gold-bright focus:shadow-[0_0_0_4px_var(--gold-soft)] focus-visible:rounded-xl sm:text-sm"
          />
          <span className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1">
            {loading && <Spinner className="text-ink-muted" />}
            {query ? (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="grid size-6 place-items-center rounded-md text-ink-muted hover:text-ink">
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-line-strong px-1.5 font-mono text-[11px] text-ink-muted sm:block">/</kbd>
            )}
          </span>
        </div>

        <LayoutGroup id="filters">
          <div role="radiogroup" aria-label="Filter by visibility" className="flex items-center rounded-xl border border-line bg-surface p-1">
            {([null, ...VISIBILITIES] as (Visibility | null)[]).map((v) => {
              const active = filter === v;
              const meta = v ? VISIBILITY_META[v] : null;
              return (
                <button
                  key={v ?? "all"}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFilter(v)}
                  className={cn(
                    "relative flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[13px] font-medium transition-colors duration-300 sm:px-3",
                    active ? "text-ink" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span layoutId="filter-pill" transition={spring.snappy} className="absolute inset-0 rounded-[9px] bg-raised shadow-sm" />
                  )}
                  {meta && <span className={cn("relative size-1.5 rounded-full", meta.dot)} />}
                  <span className="relative">{meta ? meta.label : "All"}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        <div className="ml-auto flex items-center gap-1">
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Sort">
                <ArrowDownUp className="size-4" />
                <span className="hidden md:inline">{SORTS.find((s) => s.value === sort)!.label}</span>
              </Button>
            </MenuTrigger>
            <MenuContent>
              {SORTS.map((s) => (
                <MenuItem key={s.value} onSelect={() => setSort(s.value)} icon={s.value === sort ? <Check /> : <span />}>
                  {s.label}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
          <div className="flex items-center rounded-xl border border-line bg-surface p-1">
            {(["grid", "list"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => changeView(v)}
                aria-label={v === "grid" ? "Grid view" : "List view"}
                aria-pressed={view === v}
                className={cn(
                  "relative grid size-8 place-items-center rounded-[9px] transition-colors",
                  view === v ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {view === v && <motion.span layoutId="view-pill" transition={spring.snappy} className="absolute inset-0 rounded-[9px] bg-raised shadow-sm" />}
                {v === "grid" ? <LayoutGrid className="relative size-4" /> : <List className="relative size-4" />}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className={cn("mt-4 transition-opacity duration-300", loading && "opacity-60")}>
        {files.length === 0 ? (
          <EmptyState filtered={isFiltered} onReset={() => (setQuery(""), setFilter(null))} />
        ) : view === "grid" ? (
          <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {files.map((file, i) => (
                <FileCard
                  key={file.id}
                  index={i}
                  file={file}
                  shareCount={file.shareCount}
                  linkCount={file.activeLinkCount}
                  onOpen={() => setOpenId(file.id)}
                  actions={actionsFor(file)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <ul className="-mx-2 sm:-mx-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {files.map((file, i) => (
                <FileRow
                  key={file.id}
                  index={i}
                  file={file}
                  shareCount={file.shareCount}
                  linkCount={file.activeLinkCount}
                  onOpen={() => setOpenId(file.id)}
                  actions={actionsFor(file)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
        <div ref={sentinel} className="flex h-20 items-center justify-center">
          {loadingMore && <Spinner className="text-ink-muted" />}
        </div>
      </div>

      <FileSheet
        file={openFile}
        onClose={() => setOpenId(null)}
        onChange={updateFile}
        onRequestDelete={(f) => setToDelete(f)}
      />

      <Dialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && !deleting && setToDelete(null)}
        title="Delete this file?"
        description={
          toDelete
            ? `“${toDelete.name}” will be permanently removed from Amazon S3. Everyone you shared it with, and every link, loses access immediately.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} loading={deleting} className="bg-danger text-white">
            <Trash2 className="size-4" /> Delete forever
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function EmptyState({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease }}
      className="flex flex-col items-center px-4 py-16 text-center sm:py-24"
    >
      <div className="relative w-56 sm:w-64">
        <div className="pearl absolute inset-[10%] rounded-full opacity-80 blur-2xl" />
        <PermissionOrbit level={filtered ? "PRIVATE" : "RESTRICTED"} className="relative" />
      </div>
      <h2 className="mt-8 font-display text-[34px] leading-tight text-ink">
        {filtered ? (
          <>
            Nothing <em>matches</em>
          </>
        ) : (
          <>
            Your vault is <em>waiting</em>
          </>
        )}
      </h2>
      <p className="mt-2 max-w-sm text-[15px] text-ink-soft">
        {filtered
          ? "Try a different search or clear the filters."
          : "Upload your first file. It starts private: you decide who else may open it."}
      </p>
      <div className="mt-8 flex items-center gap-3">
        {filtered ? (
          <Button variant="secondary" onClick={onReset}>
            Clear filters
          </Button>
        ) : (
          <>
            <UploadButton size="lg" />
            <span className="hidden text-sm text-ink-muted sm:inline">or drop files anywhere</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
