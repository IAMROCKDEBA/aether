"use client";

import { Slot } from "./slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

const variants = {
  primary:
    "bg-ink text-ink-inverse shadow-md hover:shadow-lg hover:-translate-y-px active:translate-y-0 active:scale-[0.98] edge-light",
  gold: "bg-gold-bright text-[#16141a] shadow-md hover:shadow-lg hover:-translate-y-px hover:brightness-[1.04] active:translate-y-0 active:scale-[0.98] edge-light",
  secondary:
    "bg-raised text-ink border border-line-strong shadow-sm hover:border-ink/25 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  ghost: "text-ink-soft hover:text-ink hover:bg-surface-sunken active:scale-[0.97]",
  danger: "text-danger hover:bg-danger-soft active:scale-[0.97]",
} as const;

const sizes = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-2xl",
  icon: "size-9 rounded-xl",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  asChild?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, asChild, className, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap select-none",
        "transition-[transform,box-shadow,background-color,color,border-color,filter] duration-300 ease-out-expo",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span className="invisible contents">{children}</span>
          <span className="absolute inset-0 grid place-items-center">
            <Spinner />
          </span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
});
