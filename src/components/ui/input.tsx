import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, icon, invalid, ...props }, ref) {
  return (
    <div className="group relative">
      {icon && (
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted transition-colors group-focus-within:text-gold">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full rounded-xl border border-line-strong bg-raised px-3.5 text-[15px] text-ink shadow-sm outline-none sm:text-sm",
          "placeholder:text-ink-muted/80 transition-[border-color,box-shadow] duration-300 ease-out-expo",
          "hover:border-ink/25 focus:border-gold-bright focus:shadow-[0_0_0_4px_var(--gold-soft)] focus-visible:rounded-xl",
          "aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_4px_var(--danger-soft)]",
          icon && "pl-10",
          className,
        )}
        {...props}
      />
    </div>
  );
});

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
          {label}
        </label>
        {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
