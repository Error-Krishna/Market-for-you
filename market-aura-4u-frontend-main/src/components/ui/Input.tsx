import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightElement, error, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-text-muted)]">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          className={cn(
            "h-11 w-full rounded-xl border bg-[var(--color-surface-bright)] px-3 text-sm text-[var(--color-text)] outline-none transition",
            "placeholder:text-[var(--color-text-muted)]",
            "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15",
            "disabled:cursor-not-allowed disabled:opacity-60",
            leftIcon && "pl-10",
            rightElement && "pr-10",
            error
              ? "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/15"
              : "border-[var(--color-border)]",
            className,
          )}
          {...props}
        />

        {rightElement && (
          <span className="absolute inset-y-0 right-3 flex items-center">{rightElement}</span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
