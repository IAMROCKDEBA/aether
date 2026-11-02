"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { spring } from "@/components/motion/presets";

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300",
        checked ? "bg-ink" : "bg-line-strong",
      )}
    >
      <motion.span
        layout
        transition={spring.snappy}
        className={cn("size-5 rounded-full shadow-sm", checked ? "ml-auto bg-gold-bright" : "bg-raised")}
      />
    </button>
  );
}
