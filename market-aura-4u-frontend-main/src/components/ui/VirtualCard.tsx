import { type ReactNode } from "react";
import { useInView, type UseInViewOptions } from "@/lib/hooks/useInView";
import { cn } from "@/lib/utils/cn";

export interface VirtualCardProps extends UseInViewOptions {
  children: ReactNode;
  /**
   * Approximate or minimum height in pixels to preserve layout stability while off-screen.
   * Default: 180.
   */
  estimatedHeight?: number | string;
  className?: string;
  placeholderClassName?: string;
}

export function VirtualCard({
  children,
  estimatedHeight = 180,
  className,
  placeholderClassName,
  rootMargin = "250px 0px",
  threshold = 0.01,
  triggerOnce = true,
}: VirtualCardProps) {
  const [ref, inView] = useInView<HTMLDivElement>({
    rootMargin,
    threshold,
    triggerOnce,
  });

  const heightStyle =
    typeof estimatedHeight === "number"
      ? { minHeight: `${estimatedHeight}px` }
      : { minHeight: estimatedHeight };

  return (
    <div
      ref={ref}
      className={cn("w-full transition-opacity duration-300", className)}
      style={!inView ? heightStyle : undefined}
    >
      {inView ? (
        children
      ) : (
        <div
          className={cn(
            "w-full rounded-2xl border border-border/40 bg-surface/30 p-6 animate-pulse flex items-center justify-center",
            placeholderClassName,
          )}
          style={heightStyle}
        >
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <div className="size-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <span className="text-xs">Loading preview...</span>
          </div>
        </div>
      )}
    </div>
  );
}
