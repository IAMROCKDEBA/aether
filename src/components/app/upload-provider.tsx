"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api, ApiRequestError, errorMessage } from "@/lib/api";
import type { OwnedFileDTO } from "@/lib/types";
import { useVault } from "./vault-context";

export type UploadStatus = "queued" | "uploading" | "finalizing" | "done" | "error" | "canceled";

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: UploadStatus;
  error?: string;
};

type UploadContextValue = {
  items: UploadItem[];
  enqueue: (files: FileList | File[]) => void;
  cancel: (id: string) => void;
  clearFinished: () => void;
  maxFileSize: number;
};

const UploadContext = createContext<UploadContextValue | null>(null);

const CONCURRENCY = 3;

type Job = { item: UploadItem; file: File; xhr?: XMLHttpRequest; serverId?: string };

type PresignResponse = { fileId: string; upload: { url: string; fields: Record<string, string> } };

/** Sends the file straight to S3 using the presigned POST policy, reporting progress. */
function postToS3(job: Job, presign: PresignResponse, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(presign.upload.fields)) form.append(k, v);
    form.append("file", job.file);
    const xhr = new XMLHttpRequest();
    job.xhr = xhr;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Storage rejected the upload.")));
    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.onabort = () => reject(new DOMException("Upload canceled", "AbortError"));
    xhr.open("POST", presign.upload.url);
    xhr.send(form);
  });
}

export function UploadProvider({ maxFileSize, children }: { maxFileSize: number; children: ReactNode }) {
  const { adjustUsage, announceUploaded } = useVault();
  const [items, setItems] = useState<UploadItem[]>([]);
  const jobs = useRef(new Map<string, Job>());
  const queue = useRef<string[]>([]);
  const active = useRef(0);

  const patch = useCallback((id: string, update: Partial<UploadItem>) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...update } : it)));
  }, []);

  const run = useCallback(
    async (job: Job) => {
      const { item, file } = job;
      try {
        patch(item.id, { status: "uploading", progress: 0 });
        const presign = await api<PresignResponse>("/api/files/uploads", {
          method: "POST",
          json: { name: file.name, size: file.size, mimeType: file.type || undefined },
        });
        job.serverId = presign.fileId;
        if (jobs.current.get(item.id)?.item.status === "canceled") throw new DOMException("canceled", "AbortError");

        // Throttle progress renders to animation frames.
        let frame = 0;
        await postToS3(job, presign, (p) => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => patch(item.id, { progress: p }));
        });
        cancelAnimationFrame(frame);
        patch(item.id, { status: "finalizing", progress: 1 });

        const saved = await api<OwnedFileDTO>(`/api/files/${presign.fileId}/confirm`, { method: "POST" });
        patch(item.id, { status: "done" });
        adjustUsage(saved.size, 1);
        announceUploaded(saved);
      } catch (error) {
        const canceled = (error as Error).name === "AbortError";
        if (job.serverId) {
          void api(`/api/files/${job.serverId}/abort`, { method: "POST" }).catch(() => undefined);
        }
        patch(item.id, canceled ? { status: "canceled" } : { status: "error", error: errorMessage(error) });
        if (!canceled && error instanceof ApiRequestError && error.status === 413) {
          toast.error(error.message, { description: item.name });
        }
      }
    },
    [patch, adjustUsage, announceUploaded],
  );

  const pump = useCallback(function pumpQueue() {
    while (active.current < CONCURRENCY && queue.current.length) {
      const id = queue.current.shift()!;
      const job = jobs.current.get(id);
      if (!job || job.item.status === "canceled") continue;
      active.current++;
      void run(job).finally(() => {
        active.current--;
        jobs.current.delete(id);
        pumpQueue();
      });
    }
  }, [run]);

  const enqueue = useCallback(
    (files: FileList | File[]) => {
      const accepted: UploadItem[] = [];
      for (const file of Array.from(files)) {
        if (file.size === 0) {
          toast.error("Empty files can't be uploaded.", { description: file.name });
          continue;
        }
        if (file.size > maxFileSize) {
          toast.error(`Files can be up to ${Math.round(maxFileSize / 1024 / 1024)} MB.`, { description: file.name });
          continue;
        }
        const item: UploadItem = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: "queued",
        };
        jobs.current.set(item.id, { item, file });
        queue.current.push(item.id);
        accepted.push(item);
      }
      if (!accepted.length) return;
      setItems((list) => [...accepted, ...list]);
      pump();
    },
    [maxFileSize, pump],
  );

  const cancel = useCallback(
    (id: string) => {
      const job = jobs.current.get(id);
      if (job) {
        job.item = { ...job.item, status: "canceled" };
        job.xhr?.abort();
      }
      patch(id, { status: "canceled" });
    },
    [patch],
  );

  const clearFinished = useCallback(() => {
    setItems((list) => list.filter((it) => it.status === "queued" || it.status === "uploading" || it.status === "finalizing"));
  }, []);

  // Warn before leaving while uploads are in flight.
  const busy = items.some((it) => it.status === "queued" || it.status === "uploading" || it.status === "finalizing");
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", onBeforeUnload);
    return () => removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  const value = useMemo(
    () => ({ items, enqueue, cancel, clearFinished, maxFileSize }),
    [items, enqueue, cancel, clearFinished, maxFileSize],
  );
  return <UploadContext value={value}>{children}</UploadContext>;
}

export function useUploads() {
  const ctx = use(UploadContext);
  if (!ctx) throw new Error("useUploads must be used inside UploadProvider");
  return ctx;
}
