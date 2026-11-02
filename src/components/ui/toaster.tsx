"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/components/theme/theme-toggle";

export function Toaster() {
  const theme = useTheme();
  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      gap={10}
      offset={24}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !border-line-strong !bg-raised/95 !text-ink !shadow-lg !backdrop-blur-xl !font-sans !text-sm !px-4 !py-3.5",
          description: "!text-ink-muted",
          actionButton: "!bg-ink !text-ink-inverse !rounded-lg",
          success: "[&_[data-icon]]:!text-public",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
