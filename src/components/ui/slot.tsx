import { cloneElement, forwardRef, isValidElement, type HTMLAttributes, type ReactElement } from "react";
import { cn } from "@/lib/cn";

/** Minimal Slot: renders its single child with merged className/props (for `asChild`). */
export const Slot = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(function Slot({ children, className, ...props }, ref) {
  if (!isValidElement(children)) return null;
  const child = children as ReactElement<HTMLAttributes<HTMLElement> & { ref?: unknown }>;
  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, child.props.className),
    ref,
  } as never);
});
