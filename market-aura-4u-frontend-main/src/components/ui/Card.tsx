// src/components/ui/Card.tsx
import { cn } from "@/lib/utils/cn";
import { type HTMLAttributes, forwardRef } from "react";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "glass-card p-6 bg-surface/60 backdrop-blur-md border border-border/50",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-4", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

export { Card, CardContent };
