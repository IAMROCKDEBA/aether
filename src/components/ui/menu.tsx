"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Menu = Dropdown.Root;
export const MenuTrigger = Dropdown.Trigger;

export function MenuContent({ children, align = "end", className }: { children: ReactNode; align?: "start" | "end"; className?: string }) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          "z-50 min-w-[200px] origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-2xl border border-line-strong bg-raised/95 p-1.5 shadow-lg backdrop-blur-xl",
          "data-[state=open]:animate-[menu-in_180ms_var(--ease-out)] data-[state=closed]:animate-[menu-out_120ms_ease-in]",
          className,
        )}
      >
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
}

export function MenuItem({
  children,
  icon,
  onSelect,
  destructive,
  disabled,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onSelect?: (event: Event) => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Dropdown.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-[13.5px] outline-none select-none",
        "text-ink-soft transition-colors data-[highlighted]:bg-surface-sunken data-[highlighted]:text-ink",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        destructive && "text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger",
      )}
    >
      {icon && <span className="grid size-4 place-items-center [&>svg]:size-4">{icon}</span>}
      {children}
    </Dropdown.Item>
  );
}

export const MenuSeparator = () => <Dropdown.Separator className="mx-2 my-1 h-px bg-line" />;

export function MenuLabel({ children }: { children: ReactNode }) {
  return <Dropdown.Label className="px-2.5 pt-1.5 pb-1 text-xs text-ink-muted">{children}</Dropdown.Label>;
}
