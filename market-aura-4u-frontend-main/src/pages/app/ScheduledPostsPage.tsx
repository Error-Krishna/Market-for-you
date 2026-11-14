import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Ban,
  CalendarClock,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  getScheduledPostId,
  useCancelPost,
  useDeletePost,
  usePublishPostNow,
  useRetryFailedPost,
  useScheduledPosts,
  useUpdatePost,
  type ScheduledPost,
  type ScheduledPostStatus,
} from "@/features/posts";
import { platformLabel } from "@/features/posts/content-helpers";
import { extractApiErrorMessage } from "@/lib/api/error-message";
import { VirtualCard } from "@/components/ui/VirtualCard";
import { DeliveryReview } from "@/features/posts/DeliveryReview";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "partial", label: "Partial" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

function statusBadgeClass(status: ScheduledPostStatus | string): string {
  switch (status) {
    case "published":
      return "bg-emerald-500/15 text-emerald-500";
    case "scheduled":
      return "bg-primary/15 text-primary";
    case "processing":
      return "bg-amber-500/15 text-amber-500";
    case "partial":
      return "bg-amber-500/15 text-amber-500";
    case "failed":
      return "bg-danger/15 text-danger";
    default:
      return "bg-surface-bright text-text-muted";
  }
}

function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduledPostsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const {
    data: posts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useScheduledPosts(statusFilter ? { status: statusFilter } : undefined);

  const updatePost = useUpdatePost();
  const publishNow = usePublishPostNow();
  const retryFailed = useRetryFailedPost();
  const cancelPost = useCancelPost();
  const deletePost = useDeletePost();

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDateTime, setEditDateTime] = useState("");

  const startEdit = (post: ScheduledPost) => {
    setEditingId(getScheduledPostId(post));
    setEditTitle(post.title);
    setEditDateTime(toDateTimeLocalValue(post.scheduledAt));
  };

  const handleSaveEdit = async (post: ScheduledPost) => {
    const id = getScheduledPostId(post);
    setBanner(null);
    const parsed = new Date(editDateTime);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      setBanner({ type: "error", text: "Rescheduled time must be in the future." });
      return;
    }

    try {
      await updatePost.mutateAsync({
        id,
        payload: {
          title: editTitle.trim(),
          scheduledAt: parsed.toISOString(),
        },
      });
      setEditingId(null);
      setBanner({ type: "success", text: "Scheduled post updated." });
    } catch (err) {
      setBanner({ type: "error", text: extractApiErrorMessage(err, "Failed to update post.") });
    }
  };

  const handlePublishNow = async (id: string) => {
    setBanner(null);
    try {
      const res = await publishNow.mutateAsync(id);
      setBanner({
        type: res.post.status === "failed" ? "error" : "success",
        text: res.message,
      });
    } catch (err) {
      setBanner({ type: "error", text: extractApiErrorMessage(err, "Failed to publish post.") });
    }
  };

  const handleRetry = async (id: string) => {
    setBanner(null);
    try {
      const res = await retryFailed.mutateAsync(id);
      setBanner({
        type: res.post.status === "failed" ? "error" : "success",
        text: res.message,
      });
    } catch (err) {
      setBanner({ type: "error", text: extractApiErrorMessage(err, "Retry failed.") });
    }
  };

  const handleCancel = async (id: string) => {
    setBanner(null);
    try {
      await cancelPost.mutateAsync(id);
      setBanner({ type: "success", text: "Scheduled post cancelled." });
    } catch (err) {
      setBanner({ type: "error", text: extractApiErrorMessage(err, "Could not cancel post.") });
    }
  };

  const handleDelete = async (id: string) => {
    setBanner(null);
    try {
      await deletePost.mutateAsync(id);
      setBanner({ type: "success", text: "Post deleted from schedule queue." });
    } catch (err) {
      setBanner({ type: "error", text: extractApiErrorMessage(err, "Could not delete post.") });
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule &amp; Publish Queue</h1>
          <p className="mt-1 text-text-secondary">
            Track upcoming auto-scheduled campaigns, delivery results across platforms, and retry
            any partial failures.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className="size-4" />}
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Link to="/content/create">
            <Button size="sm" leftIcon={<Plus className="size-4" />}>
              New Post / Broadcast
            </Button>
          </Link>
        </div>
      </div>

      {banner && (
        <div
          role="alert"
          className={
            banner.type === "success"
              ? "flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500"
              : "flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          }
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span className="flex-1">{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.label}
            size="sm"
            variant={statusFilter === tab.value ? "primary" : "outline"}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {extractApiErrorMessage(error, "Could not load scheduled posts.")}
        </div>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-text-secondary">Loading scheduled posts...</p>
      ) : posts.length === 0 ? (
        <Card className="py-12 text-center space-y-3">
          <CalendarClock className="mx-auto size-10 text-text-muted" />
          <p className="text-base font-medium">No posts in this view</p>
          <p className="text-sm text-text-secondary">
            Generate AI content or compose a manual broadcast to publish or schedule across your
            platforms.
          </p>
          <Link to="/content/create" className="inline-block">
            <Button size="sm">Create &amp; Schedule Post</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const id = getScheduledPostId(post);
            const isEditing = editingId === id;
            const needsReview =
              post.deliveryOutcomeUnknown ||
              post.platforms.some((entry) => entry.outcomeUnknown || entry.retryable);
            const formattedDate = new Date(post.scheduledAt).toLocaleString();

            return (
              <VirtualCard key={id} estimatedHeight={180}>
                <Card className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{post.title}</h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(post.status)}`}
                        >
                          {post.status}
                        </span>
                        <span className="rounded-full bg-surface-bright px-2.5 py-0.5 text-[11px] text-text-secondary">
                          {post.sourceType === "ai_generated" ? "AI Generated" : "Manual Broadcast"}
                        </span>
                        {post.recommendedTimeUsed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                            <Sparkles className="size-3" />
                            ML Recommended Time
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-secondary">
                        Scheduled for: <strong>{formattedDate}</strong> ({post.timezone || "UTC"})
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {post.status === "scheduled" && !needsReview && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            leftIcon={<Send className="size-3.5" />}
                            onClick={() => handlePublishNow(id)}
                            isLoading={publishNow.isPending && publishNow.variables === id}
                          >
                            Post Now
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Edit2 className="size-3.5" />}
                            onClick={() => (isEditing ? setEditingId(null) : startEdit(post))}
                          >
                            {isEditing ? "Close" : "Reschedule"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Ban className="size-3.5" />}
                            onClick={() => handleCancel(id)}
                            isLoading={cancelPost.isPending && cancelPost.variables === id}
                          >
                            Cancel
                          </Button>
                        </>
                      )}

                      {(post.status === "failed" || post.status === "partial") && !needsReview && (
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<RotateCcw className="size-3.5" />}
                          onClick={() => handleRetry(id)}
                          isLoading={retryFailed.isPending && retryFailed.variables === id}
                        >
                          Retry Failed
                        </Button>
                      )}

                      {post.status !== "processing" && !needsReview && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${post.title}`}
                          onClick={() => handleDelete(id)}
                          isLoading={deletePost.isPending && deletePost.variables === id}
                        >
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="grid gap-3 rounded-xl border border-border/60 bg-surface-bright/40 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                      <div>
                        <Label htmlFor={`edit-title-${id}`}>Post Title</Label>
                        <Input
                          id={`edit-title-${id}`}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-dt-${id}`}>New Schedule Time</Label>
                        <Input
                          id={`edit-dt-${id}`}
                          type="datetime-local"
                          value={editDateTime}
                          onChange={(e) => setEditDateTime(e.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(post)}
                        isLoading={updatePost.isPending}
                      >
                        Save Schedule
                      </Button>
                    </div>
                  )}

                  {needsReview && <DeliveryReview post={post} />}

                  {/* Per-platform delivery matrix */}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {post.platforms.map((entry) => (
                      <div
                        key={entry.platform}
                        className="rounded-xl border border-border/50 bg-surface-bright/30 p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{platformLabel(entry.platform)}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${statusBadgeClass(entry.status)}`}
                          >
                            {entry.status}
                          </span>
                        </div>

                        {entry.externalPostUrl && (
                          <a
                            href={entry.externalPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary underline"
                          >
                            View Published Post
                            <ExternalLink className="size-3" />
                          </a>
                        )}

                        {entry.lastError && (
                          <p className="text-danger leading-snug">{entry.lastError}</p>
                        )}

                        {Array.isArray(entry.mediaUrls) && entry.mediaUrls.length > 0 && (
                          <p className="text-[11px] text-text-muted">
                            {entry.mediaUrls.length} media attachment(s)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </VirtualCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
