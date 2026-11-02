import { Globe2, LockKeyhole, UsersRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Visibility } from "@/lib/types";

export const VISIBILITY_META: Record<
  Visibility,
  { label: string; short: string; description: string; icon: LucideIcon; text: string; bg: string; dot: string }
> = {
  PRIVATE: {
    label: "Private",
    short: "Only you",
    description: "Only you can open this file. Invitations and links are paused.",
    icon: LockKeyhole,
    text: "text-private",
    bg: "bg-private-soft",
    dot: "bg-private",
  },
  RESTRICTED: {
    label: "Restricted",
    short: "People & links",
    description: "Only people you invite, or anyone holding a valid temporary link.",
    icon: UsersRound,
    text: "text-restricted",
    bg: "bg-restricted-soft",
    dot: "bg-restricted",
  },
  PUBLIC: {
    label: "Public",
    short: "Anyone with the URL",
    description: "Anyone with the file's address can view and download it, no sign-in needed.",
    icon: Globe2,
    text: "text-public",
    bg: "bg-public-soft",
    dot: "bg-public",
  },
};

export function VisibilityBadge({ visibility, className }: { visibility: Visibility; className?: string }) {
  const meta = VISIBILITY_META[visibility];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium tracking-wide",
        meta.bg,
        meta.text,
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}
