import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { AetherShader } from "@/components/landing/aether-shader";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/** Shared chrome for the public file viewer and temporary-link pages. */
export function ViewerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <div className="fixed inset-0 -z-10 opacity-75">
        <AetherShader />
      </div>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <Link href="/" aria-label="Aether home" className="rounded-lg">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-10 sm:px-8">{children}</main>
      <footer className="pb-6 text-center text-xs text-ink-muted">
        Shared securely with Aether · served from a private Amazon S3 bucket
      </footer>
    </div>
  );
}

export function StateCard({
  icon,
  title,
  children,
  action,
  tone = "neutral",
}: {
  icon: ReactNode;
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger" ? "bg-danger-soft text-danger" : tone === "warn" ? "bg-restricted-soft text-restricted" : "bg-surface-sunken text-ink-soft";
  return (
    <div className="edge-light relative mx-auto w-full max-w-md rounded-[32px] border border-line bg-raised/85 p-8 text-center shadow-lg backdrop-blur-2xl sm:p-10">
      <span className={`mx-auto grid size-16 place-items-center rounded-[22px] ${toneClass}`}>{icon}</span>
      <h1 className="mt-6 font-display text-[36px] leading-tight text-ink">{title}</h1>
      <div className="mt-2 text-[15px] leading-relaxed text-ink-soft">{children}</div>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
