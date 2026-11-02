import { cn } from "@/lib/cn";

/** The Aether mark: a core held by two tilted orbits, echoing the permission model. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <defs>
        <linearGradient id="aether-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-bright)" />
          <stop offset="1" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="16" rx="13" ry="5.2" fill="none" stroke="url(#aether-gold)" strokeWidth="1.4" transform="rotate(-28 16 16)" />
      <ellipse cx="16" cy="16" rx="13" ry="5.2" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.1" transform="rotate(32 16 16)" />
      <circle cx="16" cy="16" r="3.6" fill="currentColor" />
      <circle cx="27.1" cy="10.3" r="1.6" fill="url(#aether-gold)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <LogoMark />
      <span className="font-display text-[26px] leading-none tracking-[-0.01em] italic">Aether</span>
    </span>
  );
}
