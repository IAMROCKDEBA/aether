import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { PermissionOrbit } from "@/components/files/permission-orbit";
import { AetherShader } from "@/components/landing/aether-shader";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getCurrentUser } from "@/server/session";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (await getCurrentUser()) redirect("/files");

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="relative flex flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Aether home" className="rounded-lg">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center justify-center py-12">{children}</div>
        <p className="text-center text-xs text-ink-muted">Protected by rate limiting and httpOnly sessions.</p>
      </main>

      <aside className="relative m-3 hidden overflow-hidden rounded-[36px] lg:block">
        <AetherShader />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="ml-auto w-[min(70%,420px)]">
            <PermissionOrbit level="RESTRICTED" />
          </div>
          <blockquote className="max-w-md">
            <p className="font-display text-[40px] leading-[1.05] tracking-[-0.015em] text-ink">
              “Private until <em>you</em> decide otherwise.”
            </p>
            <footer className="mt-4 font-mono text-[11.5px] tracking-[0.2em] text-ink-muted uppercase">
              The Aether principle
            </footer>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
