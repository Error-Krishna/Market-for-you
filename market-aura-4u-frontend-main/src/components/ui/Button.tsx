import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth,
      isLoading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] border-transparent",
      secondary:
        "bg-secondary text-background shadow-lg shadow-secondary/20 hover:shadow-secondary/30 hover:scale-[1.02] active:scale-[0.98] border-transparent",
      outline: "border-border bg-transparent text-text hover:bg-surface hover:border-text/20",
      ghost:
        "border-transparent bg-transparent text-text-secondary hover:bg-surface hover:text-text",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-6 text-sm",
      lg: "h-14 px-8 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && (
          <span className="mr-1 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
