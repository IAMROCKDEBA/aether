"use client";

import { Check, Clock3, Copy, KeyRound, Link2 } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { FileGlyph } from "@/components/files/file-glyph";
import { VisibilityBadge } from "@/components/files/visibility";
import { ease } from "@/components/motion/presets";

/** A floating composition of real Aether UI pieces with gentle pointer parallax. */
export function HeroPreview() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / innerWidth - 0.5);
      py.set(e.clientY / innerHeight - 0.5);
    };
    addEventListener("pointermove", onMove, { passive: true });
    return () => removeEventListener("pointermove", onMove);
  }, [px, py, reduce]);


  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 30, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 1.1, ease, delay },
  });

  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[560px] [perspective:1400px] sm:h-[460px]" aria-hidden>
      {/* File card */}
      <Layer x={sx} y={sy} depth={-14} className="absolute top-2 left-[4%] w-[62%] sm:left-0">
        <motion.div
          {...enter(0.35)}
          className="edge-light rounded-[28px] border border-line bg-glass p-3 shadow-lg backdrop-blur-2xl"
        >
          <div className="aspect-[4/3] overflow-hidden rounded-[20px]">
            <FileGlyph name="Q4-board-review.pdf" mimeType="application/pdf" />
          </div>
          <div className="flex items-center justify-between gap-2 px-2 pt-3 pb-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">Q4 board review.pdf</p>
              <p className="text-xs text-ink-muted">4.2 MB · just now</p>
            </div>
            <VisibilityBadge visibility="RESTRICTED" />
          </div>
        </motion.div>
      </Layer>

      {/* Temporary link ticket */}
      <Layer x={sx} y={sy} depth={22} className="absolute top-[46%] right-[2%] w-[64%] sm:right-0">
        <motion.div {...enter(0.55)} className="ticket rounded-[22px] bg-[#16141a] p-4 text-[#f0eee9] shadow-lg dark:bg-[#211e26]">
          <div className="flex items-center gap-3">
            <div className="relative grid size-11 shrink-0 place-items-center">
              <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
                <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="3" />
                <motion.circle
                  cx="22"
                  cy="22"
                  r="19"
                  fill="none"
                  stroke="#e9d2a0"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 1 }}
                  animate={{ pathLength: reduce ? 0.68 : [1, 0.68] }}
                  transition={{ duration: 2.4, ease, delay: 0.9 }}
                />
              </svg>
              <Clock3 className="size-4 text-[#e9d2a0]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium tracking-[0.16em] text-[#e9d2a0] uppercase">Temporary link</p>
              <p className="truncate font-mono text-[12.5px] opacity-80">aether.app/s/Qm7x…k2Lp</p>
            </div>
            <span className="grid size-8 place-items-center rounded-lg bg-white/10">
              <Copy className="size-3.5" />
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-white/15 pt-3 text-[11.5px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              <Clock3 className="size-3" /> 23h 41m left
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              <KeyRound className="size-3" /> Password
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              <Link2 className="size-3" /> 2 of 5 downloads
            </span>
          </div>
        </motion.div>
      </Layer>

      {/* Access granted chip */}
      <Layer x={sx} y={sy} depth={40} className="absolute top-[30%] right-[8%] sm:right-[4%]">
        <motion.div
          {...enter(0.8)}
          className="edge-light flex items-center gap-2.5 rounded-2xl border border-line bg-raised/90 py-2 pr-4 pl-2 shadow-md backdrop-blur-xl"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-public-soft text-public">
            <Check className="size-4" strokeWidth={2.5} />
          </span>
          <span className="text-[13px]">
            <span className="font-medium text-ink">Maya</span> <span className="text-ink-muted">can now view</span>
          </span>
        </motion.div>
      </Layer>

      {/* Storage chip */}
      <Layer x={sx} y={sy} depth={40} className="absolute bottom-[2%] left-[10%]">
        <motion.div
          {...enter(1)}
          className="edge-light flex items-center gap-3 rounded-2xl border border-line bg-raised/90 px-4 py-2.5 shadow-md backdrop-blur-xl"
        >
          <span className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">Amazon S3</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
            <motion.span
              className="block h-full origin-left rounded-full bg-gradient-to-r from-gold to-gold-bright"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 0.42 }}
              transition={{ duration: 1.6, ease, delay: 1.2 }}
            />
          </span>
          <span className="text-xs font-medium text-ink">Encrypted</span>
        </motion.div>
      </Layer>
    </div>
  );
}

function Layer({ x, y, depth, className, children }: { x: MotionValue<number>; y: MotionValue<number>; depth: number; className: string; children: ReactNode }) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth);
  return (
    <motion.div style={{ x: tx, y: ty }} className={className}>
      {children}
    </motion.div>
  );
}
