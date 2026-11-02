"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ease } from "@/components/motion/presets";
import { formatBytes, timeAgo } from "@/lib/format";
import type { SharedFileDTO } from "@/lib/types";
import { FileCard } from "./file-card";
import { PermissionOrbit } from "./permission-orbit";

export function SharedView({ files }: { files: SharedFileDTO[] }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-[1400px]">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
        <h1 className="font-display text-[44px] leading-none tracking-[-0.02em] text-ink sm:text-[56px]">
          Shared <em>with me</em>
        </h1>
        <p className="mt-2 text-sm text-ink-muted">Files other people have invited you to. Access ends the moment they change it.</p>
      </motion.header>

      {files.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
          className="flex flex-col items-center px-4 py-20 text-center sm:py-28"
        >
          <div className="relative w-52">
            <div className="pearl absolute inset-[10%] rounded-full opacity-80 blur-2xl" />
            <PermissionOrbit level="RESTRICTED" className="relative" />
          </div>
          <h2 className="mt-8 font-display text-[34px] leading-tight text-ink">
            Nothing shared <em>yet</em>
          </h2>
          <p className="mt-2 max-w-sm text-[15px] text-ink-soft">
            When someone invites your email to a restricted file, it appears here.
          </p>
        </motion.div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {files.map((file, i) => (
            <FileCard
              key={file.id}
              index={i}
              file={file}
              onOpen={() => router.push(`/f/${file.id}`)}
              subtitle={`${file.owner.name} · ${formatBytes(file.size)} · ${timeAgo(file.sharedAt)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
