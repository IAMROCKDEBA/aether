"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { spring } from "@/components/motion/presets";

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

const Overlay = () => (
  <RadixDialog.Overlay asChild forceMount>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-[#0c0b0e]/35 backdrop-blur-[3px] dark:bg-black/55"
    />
  </RadixDialog.Overlay>
);

/** Centered modal for confirmations. */
export function Dialog({ open, onOpenChange, title, description, children, className }: BaseProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <Overlay />
            <RadixDialog.Content
              forceMount
              className="fixed inset-0 z-50 grid place-items-center p-4 outline-none"
              onPointerDown={(e) => e.target === e.currentTarget && onOpenChange(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                transition={spring.snappy}
                className={cn(
                  "edge-light relative w-full max-w-md rounded-[28px] border border-line bg-raised p-6 shadow-lg sm:p-7",
                  className,
                )}
              >
                <RadixDialog.Title className="font-display text-[30px] leading-tight text-ink">{title}</RadixDialog.Title>
                {description ? (
                  <RadixDialog.Description className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
                    {description}
                  </RadixDialog.Description>
                ) : (
                  <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
                )}
                <div className="mt-6">{children}</div>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

/** Right-side sheet on desktop, bottom sheet on phones. */
export function Sheet({ open, onOpenChange, title, children, className }: BaseProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <Overlay />
            <RadixDialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside
                initial={{ opacity: 0, x: 48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 48 }}
                transition={spring.sheet}
                className={cn(
                  "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-canvas shadow-lg outline-none sm:inset-y-2 sm:right-2 sm:w-[min(560px,calc(100vw-16px))]",
                  "sm:rounded-[30px] sm:border sm:border-line",
                  className,
                )}
              >
                <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
                <RadixDialog.Close
                  aria-label="Close"
                  className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-raised/80 text-ink-soft shadow-sm backdrop-blur-xl transition-[color,transform] duration-300 hover:rotate-90 hover:text-ink"
                >
                  <X className="size-4" />
                </RadixDialog.Close>
                {children}
              </motion.aside>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
