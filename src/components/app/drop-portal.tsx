"use client";

import { CloudUpload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { spring } from "@/components/motion/presets";
import { useUploads } from "./upload-provider";

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

/** Drag files anywhere in the app: the page dims and a glowing portal opens. */
export function DropPortal() {
  const { enqueue } = useUploads();
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setActive(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setActive(false);
      if (e.dataTransfer?.files.length) enqueue(e.dataTransfer.files);
    };
    addEventListener("dragenter", onEnter);
    addEventListener("dragover", onOver);
    addEventListener("dragleave", onLeave);
    addEventListener("drop", onDrop);
    return () => {
      removeEventListener("dragenter", onEnter);
      removeEventListener("dragover", onOver);
      removeEventListener("dragleave", onLeave);
      removeEventListener("drop", onDrop);
    };
  }, [enqueue]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-canvas/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={spring.smooth}
            className="relative grid size-[min(72vw,380px)] place-items-center"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border border-gold-bright/60"
                initial={{ scale: 0.55, opacity: 0 }}
                animate={{ scale: [0.55, 1.15], opacity: [0.9, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
              />
            ))}
            <span className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,var(--gold-soft),transparent_70%)]" />
            <div className="relative flex flex-col items-center text-center">
              <span className="grid size-20 place-items-center rounded-[28px] bg-ink text-ink-inverse shadow-lg">
                <CloudUpload className="size-9" strokeWidth={1.5} />
              </span>
              <p className="mt-6 font-display text-4xl text-ink">
                Release to <em>upload</em>
              </p>
              <p className="mt-2 text-sm text-ink-muted">Files land in your vault as private.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
