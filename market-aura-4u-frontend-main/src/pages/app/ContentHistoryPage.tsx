import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { GeneratedContentView } from "@/features/content/components/GeneratedContentView";
import { Button } from "@/components/ui/Button";
import { useContentHistory } from "@/features/content";
import type { GeneratedContent } from "@/features/content/types/content.types";
import { PublishSchedulePanel } from "@/features/posts";
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
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useContentHistory();

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

  const items = normalizeJobs(data?.pages.flatMap((page) => page.jobs ?? []) ?? []);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Content History</h1>
        <p className="mt-1 text-text-secondary">All your generated content in one place.</p>
      </div>

      {items.length === 0 && !hasNextPage ? (
        <div className="rounded-2xl border border-border bg-surface/30 p-12 text-center text-text-secondary">
          <p>You haven't generated any content yet.</p>
          <p className="mt-2">Head to "Create Content" to get started.</p>
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border bg-surface/30 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm text-text-muted">
                    {item.createdAt
                      ? formatDistanceToNow(item.createdAt, { addSuffix: true })
                      : "Date unavailable"}
                  </p>
                  <p className="line-clamp-1 font-medium">
                    {item.originalContent ?? "Prompt unavailable"}
                  </p>
                </div>

                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    item.status === "completed" && "bg-success/20 text-success",
                    item.status === "processing" && "bg-yellow-500/20 text-yellow-500",
                    item.status === "failed" && "bg-danger/20 text-danger",
                    item.status === "unknown" && "bg-surface text-text-muted",
                  )}
                >
                  {item.status}
                </span>
              </div>

              {item.platforms.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.platforms.map((platform, index) => (
                    <span
                      key={`${platform}-${index}`}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              )}

              {item.status === "failed" && item.error && (
                <p className="mt-4 text-sm text-danger">{item.error}</p>
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
                      jobId={item.id}
                      title={item.originalContent}
                      content={item.generatedContent}
                    />
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : null}

      {isFetchNextPageError && (
        <p role="alert" className="text-danger">
          Failed to load more history. Your loaded results are still available.
        </p>
      )}

      {hasNextPage && (
        <Button
          type="button"
          variant="outline"
          disabled={isFetchingNextPage}
          isLoading={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchNextPageError ? "Retry loading more" : "Load more"}
        </Button>
      )}

      {items.length > 0 && !hasNextPage && (
        <p className="text-center text-sm text-text-muted">You’re all caught up.</p>
      )}
    </div>
  );
}

function normalizeJobs(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  return value.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];

    const recordId =
      typeof candidate.id === "string"
        ? candidate.id
        : typeof candidate._id === "string"
          ? candidate._id
          : `legacy-${index}`;
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
