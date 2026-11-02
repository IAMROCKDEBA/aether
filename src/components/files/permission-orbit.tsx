"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import type { Visibility } from "@/lib/types";
import { spring } from "@/components/motion/presets";

const RANK: Record<Visibility, number> = { PRIVATE: 0, RESTRICTED: 1, PUBLIC: 2 };

/**
 * The permission model as a picture: the file is the core; invited people and
 * links orbit it when Restricted; the outer world ring opens when Public.
 * Layers are HTML boxes so every animation is a pure transform/opacity change.
 */
export function PermissionOrbit({ level, className }: { level: Visibility; className?: string }) {
  const rank = RANK[level];
  const layer = (show: boolean, scaleFrom = 0.6) => ({
    initial: false as const,
    animate: { opacity: show ? 1 : 0, scale: show ? 1 : scaleFrom },
    transition: spring.gentle,
  });

  return (
    <div className={cn("relative aspect-square select-none", className)} aria-hidden>
      {/* Outer world ring — Public */}
      <motion.div className="absolute inset-0" {...layer(rank >= 2, 0.75)}>
        <svg viewBox="0 0 200 200" className="size-full">
          <circle cx="100" cy="100" r="92" fill="none" stroke="var(--public)" strokeOpacity="0.35" strokeDasharray="2 6" strokeWidth="1.2" />
          <circle cx="100" cy="100" r="92" fill="url(#orbit-public-glow)" opacity="0.5" />
          <defs>
            <radialGradient id="orbit-public-glow">
              <stop offset="0.6" stopColor="var(--public)" stopOpacity="0" />
              <stop offset="1" stopColor="var(--public)" stopOpacity="0.12" />
            </radialGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 animate-[spin_48s_linear_infinite] motion-reduce:animate-none">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 size-[3.2%] rounded-full bg-public"
              style={{ transform: `rotate(${i * 36}deg) translateY(-1430%) translate(-50%, -50%)`, transformOrigin: "0 0", opacity: 0.5 + (i % 3) * 0.2 }}
            />
          ))}
        </div>
      </motion.div>

      {/* Inner circle — Restricted: people + a temporary link */}
      <motion.div className="absolute inset-[22%]" {...layer(rank >= 1)}>
        <svg viewBox="0 0 100 100" className="size-full">
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--restricted)" strokeOpacity="0.55" strokeWidth="0.9" />
        </svg>
        <div className="absolute inset-0 animate-[spin_26s_linear_infinite] motion-reduce:animate-none">
          {[0, 120, 240].map((deg) => (
            <span
              key={deg}
              className="absolute top-1/2 left-1/2 grid size-[15%] place-items-center rounded-full border border-restricted/50 bg-raised shadow-sm"
              style={{ transform: `rotate(${deg}deg) translateY(-320%) translate(-50%, -50%)`, transformOrigin: "0 0" }}
            >
              <span className="size-[38%] rounded-full bg-restricted" />
            </span>
          ))}
          <span
            className="absolute top-1/2 left-1/2 h-[10%] w-[20%] rounded-[3px] bg-gold-bright shadow-sm"
            style={{ transform: `rotate(60deg) translateY(-480%) translate(-50%, -50%)`, transformOrigin: "0 0" }}
          />
        </div>
      </motion.div>

      {/* Private seal */}
      <motion.div className="absolute inset-[38%]" {...layer(rank === 0, 1.4)}>
        <svg viewBox="0 0 100 100" className="size-full">
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--private)" strokeOpacity="0.6" strokeWidth="2.2" strokeDasharray="5 5" />
        </svg>
      </motion.div>

      {/* Core: the file */}
      <div className="absolute inset-[43%] rounded-full bg-ink shadow-[0_0_0_6px_var(--gold-soft),0_10px_30px_-6px_rgb(0_0_0/0.35)]">
        <div className="absolute inset-[22%] rounded-full bg-gradient-to-br from-gold-bright to-gold opacity-90" />
      </div>
    </div>
  );
}
