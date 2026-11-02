"use client";

import { motion } from "motion/react";
import { VISIBILITY_META } from "@/components/files/visibility";
import { spring } from "@/components/motion/presets";
import { cn } from "@/lib/cn";
import { VISIBILITIES, type Visibility } from "@/lib/types";

const PILL: Record<Visibility, string> = {
  PRIVATE: "bg-private-soft ring-private/25",
  RESTRICTED: "bg-restricted-soft ring-restricted/30",
  PUBLIC: "bg-public-soft ring-public/30",
};

export function VisibilitySwitch({
  value,
  onChange,
  disabled,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Who can access this file" className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface p-1">
      {VISIBILITIES.map((v) => {
        const meta = VISIBILITY_META[v];
        const Icon = meta.icon;
        const active = v === value;
        return (
          <button
            key={v}
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !active && onChange(v)}
            onKeyDown={(e) => {
              const i = VISIBILITIES.indexOf(value);
              if (e.key === "ArrowRight") onChange(VISIBILITIES[Math.min(2, i + 1)]!);
              if (e.key === "ArrowLeft") onChange(VISIBILITIES[Math.max(0, i - 1)]!);
            }}
            tabIndex={active ? 0 : -1}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center transition-colors duration-300 disabled:opacity-60",
              active ? meta.text : "text-ink-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span layoutId="visibility-pill" transition={spring.snappy} className={cn("absolute inset-0 rounded-xl ring-1", PILL[v])} />
            )}
            <Icon className="relative size-[18px]" strokeWidth={1.9} />
            <span className="relative text-[13px] font-medium">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
