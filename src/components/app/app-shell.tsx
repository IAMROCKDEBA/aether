"use client";

import { FolderLock, LogOut, Plus, UsersRound } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { spring } from "@/components/motion/presets";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import type { UsageDTO } from "@/lib/types";
import { DropPortal } from "./drop-portal";
import { UploadProvider, useUploads } from "./upload-provider";
import { UploadTray } from "./upload-tray";
import { useVault, VaultProvider } from "./vault-context";

type ShellUser = { name: string; email: string };

const NAV = [
  { href: "/files", label: "My vault", short: "Vault", icon: FolderLock },
  { href: "/shared", label: "Shared with me", short: "Shared", icon: UsersRound },
];

export function AppShell({
  user,
  usage,
  maxFileSize,
  children,
}: {
  user: ShellUser;
  usage: UsageDTO;
  maxFileSize: number;
  children: ReactNode;
}) {
  return (
    <VaultProvider initialUsage={usage}>
      <UploadProvider maxFileSize={maxFileSize}>
        <div className="min-h-[100dvh] lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
          <Sidebar user={user} />
          <MobileHeader user={user} />
          <main className="min-w-0 px-4 pt-4 pb-28 sm:px-8 sm:pt-8 lg:px-12 lg:pt-10 lg:pb-16">{children}</main>
          <MobileTabs />
        </div>
        <DropPortal />
        <UploadTray />
      </UploadProvider>
    </VaultProvider>
  );
}

export function UploadButton({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const { enqueue } = useUploads();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant="gold" size={size} className={cn("group", className)} onClick={() => input.current?.click()}>
        <Plus className="size-4 transition-transform duration-500 group-hover:rotate-90" strokeWidth={2.4} />
        Upload
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) enqueue(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}

function NavLinks({ layoutId }: { layoutId: string }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 items-center gap-3 rounded-xl px-3.5 text-[14.5px] transition-colors duration-300",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={spring.smooth}
                className="edge-light absolute inset-0 rounded-xl border border-line bg-raised shadow-sm"
              />
            )}
            <Icon className={cn("relative size-[18px]", active && "text-gold")} strokeWidth={1.8} />
            <span className="relative font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StorageMeter() {
  const { usage } = useVault();
  const ratio = Math.min(1, usage.used / usage.quota);
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-ink">Storage</p>
        <p className="font-mono text-[11px] text-ink-muted">{Math.round(ratio * 100)}%</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        <motion.div
          className={cn(
            "h-full origin-left rounded-full",
            ratio > 0.9 ? "bg-danger" : "bg-gradient-to-r from-gold to-gold-bright",
          )}
          initial={false}
          animate={{ scaleX: Math.max(ratio, 0.012) }}
          transition={spring.gentle}
        />
      </div>
      <p className="mt-2.5 text-xs text-ink-muted">
        {formatBytes(usage.used)} of {formatBytes(usage.quota, 0)} · {usage.count} file{usage.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function UserMenu({ user, compact }: { user: ShellUser; compact?: boolean }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const { error } = await authClient.signOut();
    if (error) {
      setSigningOut(false);
      toast.error("Couldn't sign out. Please try again.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 rounded-2xl text-left transition-colors hover:bg-surface",
            compact ? "p-1" : "w-full p-2",
          )}
          aria-label="Account menu"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-bright to-gold text-[13px] font-semibold text-[#16141a]">
            {initials(user.name) || "A"}
          </span>
          {!compact && (
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium text-ink">{user.name}</span>
              <span className="block truncate text-xs text-ink-muted">{user.email}</span>
            </span>
          )}
        </button>
      </MenuTrigger>
      <MenuContent align={compact ? "end" : "start"}>
        <MenuLabel>Signed in as {user.email}</MenuLabel>
        <MenuSeparator />
        <MenuItem icon={<LogOut />} onSelect={signOut} disabled={signingOut}>
          Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function Sidebar({ user }: { user: ShellUser }) {
  return (
    <aside className="sticky top-0 hidden h-[100dvh] flex-col gap-8 border-r border-line px-5 py-7 lg:flex">
      <div className="flex items-center justify-between px-1.5">
        <Link href="/" aria-label="Aether home" className="rounded-lg">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>
      <UploadButton className="w-full" />
      <NavLinks layoutId="nav-desktop" />
      <div className="mt-auto space-y-3">
        <StorageMeter />
        <UserMenu user={user} />
      </div>
    </aside>
  );
}

function MobileHeader({ user }: { user: ShellUser }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-canvas/80 px-4 backdrop-blur-2xl sm:px-8 lg:hidden">
      <Link href="/" aria-label="Aether home" className="rounded-lg">
        <Logo />
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu user={user} compact />
      </div>
    </header>
  );
}

function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center gap-2 rounded-[22px] border border-line bg-raised/90 p-1.5 shadow-lg backdrop-blur-2xl lg:hidden">
      {NAV.map(({ href, short, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-medium transition-colors",
              active ? "text-ink" : "text-ink-muted",
            )}
          >
            {active && (
              <motion.span layoutId="nav-mobile" transition={spring.smooth} className="absolute inset-0 rounded-2xl bg-surface-sunken" />
            )}
            <Icon className={cn("relative size-[18px]", active && "text-gold")} />
            <span className="relative">{short}</span>
          </Link>
        );
      })}
      <UploadButton className="h-12 rounded-2xl px-4" />
    </nav>
  );
}
