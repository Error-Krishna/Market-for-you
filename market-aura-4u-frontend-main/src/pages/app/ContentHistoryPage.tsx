import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, History, Search, Sparkles } from "lucide-react";
import { GeneratedContentView } from "@/features/content/components/GeneratedContentView";
import { Button } from "@/components/ui/Button";
import { useContentHistory } from "@/features/content";
import type { GeneratedContent } from "@/features/content/types/content.types";
import { PublishSchedulePanel } from "@/features/posts";
import { VirtualCard } from "@/components/ui/VirtualCard";
import { useInView } from "@/lib/hooks/useInView";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils/cn";

const validStatuses = new Set(["completed", "processing", "failed"]);

interface HistoryItem {
  id: string;
  createdAt?: Date;
  originalContent?: string;
  status: string;
  platforms: string[];
  generatedContent?: GeneratedContent;
  error?: string;
}

export default function ContentHistoryPage() {
  const [expandedPostJobId, setExpandedPostJobId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const debouncedQuery = useDebounce(filterQuery, 250);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useContentHistory();

  // Infinite scroll auto-trigger: Observe bottom sentinel
  const [sentinelRef, sentinelInView] = useInView<HTMLDivElement>({
    rootMargin: "400px 0px",
    triggerOnce: false,
    fallbackInView: false,
  });

  useEffect(() => {
    if (sentinelInView && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [sentinelInView, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading content history"
        className="flex h-96 items-center justify-center"
      >
        <div className="size-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (error && !data?.pages.length) {
    return (
      <p role="alert" className="text-danger">
        Failed to load history.
      </p>
    );
  }

  const allItems = normalizeJobs(data?.pages.flatMap((page) => page.jobs ?? []) ?? []);

  // Filter items using debounced search query
  const items = allItems.filter((item) => {
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      const promptMatch = item.originalContent?.toLowerCase().includes(q) ?? false;
      const platformMatch = item.platforms.some((p) => p.toLowerCase().includes(q));
      if (!promptMatch && !platformMatch) return false;
    }
    return true;
  });

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <History className="size-3.5" />
            <span>Generation Archive</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text">Content History</h1>
          <p className="mt-1 text-sm text-text-secondary">
            All your generated content in one place.
          </p>
        </div>

        {allItems.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Filter history..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="h-9 w-48 sm:w-60 rounded-xl border border-border bg-surface/60 pl-8 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
          </div>
        )}
      </div>

      {allItems.length === 0 && !hasNextPage ? (
        <div className="rounded-3xl border border-border/60 bg-surface/50 p-12 text-center text-text-secondary backdrop-blur-md shadow-sm space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <p className="font-semibold text-text text-base">
            You haven't generated any content yet.
          </p>
          <p className="text-sm text-text-muted">Head to "Create Content" to get started.</p>
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <VirtualCard key={item.id} estimatedHeight={220}>
              <article className="rounded-3xl border border-border/60 bg-surface/60 p-6 backdrop-blur-md shadow-sm transition hover:border-border/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Clock className="size-3.5" />
                      <span>
                        {item.createdAt
                          ? formatDistanceToNow(item.createdAt, { addSuffix: true })
                          : "Date unavailable"}
                      </span>
                    </div>
                    <p className="line-clamp-1 font-semibold text-text text-sm sm:text-base">
                      {item.originalContent ?? "Prompt unavailable"}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                      item.status === "completed" &&
                        "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                      item.status === "processing" &&
                        "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                      item.status === "failed" &&
                        "bg-danger/10 text-danger border border-danger/20",
                      item.status === "unknown" &&
                        "bg-surface-bright text-text-muted border border-border",
                    )}
                  >
                    {item.status}
                  </span>
                </div>

                {item.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.platforms.map((platform, index) => (
                      <span
                        key={`${platform}-${index}`}
                        className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary capitalize"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                )}

                {item.status === "failed" && item.error && (
                  <p className="text-sm text-danger font-medium">{item.error}</p>
                )}

                <GeneratedContentView content={item.generatedContent} />

                {item.status === "completed" && item.generatedContent && (
                  <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setExpandedPostJobId((prev) => (prev === item.id ? null : item.id))
                      }
                    >
                      {expandedPostJobId === item.id
                        ? "Hide Publish & Schedule"
                        : "Publish / Auto-Schedule"}
                    </Button>

                    {expandedPostJobId === item.id && (
                      <PublishSchedulePanel
                        jobId={OBJECT_ID_REGEX.test(item.id) ? item.id : undefined}
                        title={item.originalContent}
                        content={item.generatedContent}
                      />
                    )}
                  </div>
                )}
              </article>
            </VirtualCard>
          ))}
        </div>
      ) : allItems.length > 0 && items.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-8 text-center text-text-muted text-sm">
          No generated content matches your filter.
        </div>
      ) : null}

      {/* Infinite Scroll Sentinel: triggers fetchNextPage when scrolled near */}
      {hasNextPage && <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />}

      {isFetchNextPageError && (
        <p role="alert" className="text-danger text-sm font-medium">
          Failed to load more history. Your loaded results are still available.
        </p>
      )}

      {hasNextPage && (
        <div className="text-center pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isFetchingNextPage}
            isLoading={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchNextPageError ? "Retry loading more" : "Load more"}
          </Button>
        </div>
      )}

      {allItems.length > 0 && !hasNextPage && (
        <p className="text-center text-xs text-text-muted pt-2">You’re all caught up.</p>
      )}
    </div>
  );
}

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function extractRecordId(candidate: Record<string, unknown>, index: number): string {
  const rawOid =
    isRecord(candidate._id) && typeof candidate._id.$oid === "string" ? candidate._id.$oid : null;
  for (const raw of [candidate.id, candidate._id, rawOid, candidate.jobId]) {
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
  }
  return `legacy-${index}`;
}

function normalizeJobs(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  return value.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];

    const recordId = extractRecordId(candidate, index);
    if (seenIds.has(recordId)) return [];
    seenIds.add(recordId);
    const status =
      typeof candidate.status === "string" && validStatuses.has(candidate.status)
        ? candidate.status
        : "unknown";
    const timestamp =
      typeof candidate.createdAt === "string" || candidate.createdAt instanceof Date
        ? new Date(candidate.createdAt)
        : undefined;
    const createdAt = timestamp && Number.isFinite(timestamp.getTime()) ? timestamp : undefined;

    return [
      {
        id: `${recordId}-${index}`,
        createdAt,
        originalContent:
          typeof candidate.originalContent === "string" ? candidate.originalContent : undefined,
        status,
        platforms: Array.isArray(candidate.platforms)
          ? candidate.platforms.filter(
              (platform): platform is string => typeof platform === "string",
            )
          : [],
        generatedContent: isRecord(candidate.generatedContent)
          ? (candidate.generatedContent as GeneratedContent)
          : undefined,
        error: typeof candidate.error === "string" ? candidate.error : undefined,
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
