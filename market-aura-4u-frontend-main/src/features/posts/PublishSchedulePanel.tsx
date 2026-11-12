import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { GeneratedContent } from "@/features/content";
import { getMediaAssetId, MediaPickerModal, type MediaAsset } from "@/features/media";
import { useSocialStatus, type SocialPlatform } from "@/features/social-accounts";
import { extractApiErrorMessage } from "@/lib/api/error-message";
import {
  buildEditedPlatformContent,
  defaultLocalDateTimeValue,
  extractAvailablePlatforms,
  extractEditableText,
  extractRecommendedPostingTime,
  formatRecommendedWindow,
  platformLabel,
} from "./content-helpers";
import type { ScheduledPost } from "./posts.types";
import { useCreatePost } from "./usePosts";

interface PublishSchedulePanelProps {
  jobId?: string;
  title?: string;
  content: GeneratedContent;
}

export function PublishSchedulePanel({ jobId, title, content }: PublishSchedulePanelProps) {
  const panelInstanceId = useId();
  const normalizedJobId = typeof jobId === "string" ? jobId.trim() : "";
  const canUseBackendJobId = normalizedJobId.length > 0 && !/^legacy-/i.test(normalizedJobId);
  const availablePlatforms = useMemo(() => extractAvailablePlatforms(content), [content]);
  const recommendedWindow = extractRecommendedPostingTime(content);
  const recommendedLabel = formatRecommendedWindow(recommendedWindow);

  const { data: socialStatus } = useSocialStatus();
  const createPost = useCreatePost();

  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(availablePlatforms);
  const [showCustomSchedule, setShowCustomSchedule] = useState(false);
  const [customDateTime, setCustomDateTime] = useState(() => defaultLocalDateTimeValue(60));
  const [showEditors, setShowEditors] = useState(false);

  const [draftTexts, setDraftTexts] = useState<Partial<Record<SocialPlatform, string>>>(() => {
    const initial: Partial<Record<SocialPlatform, string>> = {};
    for (const p of availablePlatforms) {
      initial[p] = extractEditableText(content, p);
    }
    return initial;
  });
  const [emailSubject, setEmailSubject] = useState(content.email?.subject ?? "");

  const [attachedMedia, setAttachedMedia] = useState<MediaAsset[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    message: string;
    post: ScheduledPost;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (availablePlatforms.length === 0) return null;

  const userTimezone =
    socialStatus?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  const disconnectedSelected = selectedPlatforms.filter(
    (p) => socialStatus && !socialStatus.platforms[p]?.isConnected,
  );

  const buildPlatformEntries = (alwaysIncludeContent: boolean) => {
    const mediaIds = attachedMedia.map(getMediaAssetId).filter(Boolean);
    const mediaUrls = attachedMedia.map((m) => m.url);

    return selectedPlatforms.map((platform) => {
      const editedText = draftTexts[platform];
      const originalText = extractEditableText(content, platform);
      const emailSubjectChanged =
        platform === "email" && emailSubject.trim() !== (content.email?.subject ?? "").trim();
      const textChanged =
        typeof editedText === "string" && editedText.trim() !== originalText.trim();

      return {
        platform,
        mediaAssetIds: mediaIds,
        mediaUrls,
        ...(alwaysIncludeContent || textChanged || emailSubjectChanged
          ? {
              content: buildEditedPlatformContent(
                content,
                platform,
                editedText ?? originalText,
                emailSubject,
              ),
            }
          : {}),
      };
    });
  };

  const handlePublishAction = async (mode: "now" | "recommended" | "custom") => {
    setErrorMsg(null);
    setSubmitResult(null);

    if (selectedPlatforms.length === 0) {
      setErrorMsg("Select at least one platform to publish or schedule.");
      return;
    }

    let scheduledAtIso: string | undefined;
    if (mode === "custom") {
      const parsed = new Date(customDateTime);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        setErrorMsg("Choose a future date and time for custom scheduling.");
        return;
      }
      scheduledAtIso = parsed.toISOString();
    }

    try {
      const res = await createPost.mutateAsync({
        mode,
        sourceType: canUseBackendJobId ? "ai_generated" : "manual_broadcast",
        ...(canUseBackendJobId ? { jobId: normalizedJobId } : {}),
        title: title?.slice(0, 120) || "AI Campaign Post",
        timezone: userTimezone,
        ...(mode === "recommended" && recommendedWindow
          ? { recommendedPostingTime: recommendedWindow }
          : {}),
        ...(scheduledAtIso ? { scheduledAt: scheduledAtIso } : {}),
        platforms: buildPlatformEntries(!canUseBackendJobId),
        mediaAssetIds: attachedMedia.map(getMediaAssetId).filter(Boolean),
        mediaUrls: attachedMedia.map((m) => m.url),
      });
      setSubmitResult(res);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, "Failed to schedule or publish content."));
    }
  };

  return (
    <Card className="space-y-5 border-primary/30 bg-surface/50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Publish & Auto-Schedule</h3>
          <p className="text-xs text-text-secondary">
            Post immediately, schedule at the AI-recommended engagement window, or pick your own
            time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftIcon={<ImagePlus className="size-4" />}
            onClick={() => setPickerOpen(true)}
          >
            Attach Media ({attachedMedia.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            rightIcon={
              showEditors ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />
            }
            onClick={() => setShowEditors((v) => !v)}
          >
            {showEditors ? "Hide Copy Editor" : "Edit Copy"}
          </Button>
        </div>
      </div>

      {/* ML Recommended Time One-Click CTA Banner */}
      {recommendedWindow && recommendedLabel && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-text">
                Recommended Posting Window: {recommendedLabel}
              </p>
              <p className="text-xs text-text-secondary">
                Auto-schedule this campaign at the peak window identified by the ML recommender.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            leftIcon={<CalendarClock className="size-4" />}
            onClick={() => handlePublishAction("recommended")}
            isLoading={createPost.isPending}
          >
            Schedule at Recommended Time
          </Button>
        </div>
      )}

      {/* Target Platform Checkboxes */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Target Platforms
        </p>
        <div className="flex flex-wrap gap-2">
          {availablePlatforms.map((platform) => {
            const checked = selectedPlatforms.includes(platform);
            const isConnected = socialStatus?.platforms[platform]?.isConnected;
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  checked
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 bg-surface-bright/40 text-text-secondary hover:text-text"
                }`}
              >
                <span>{checked ? "✓" : "+"}</span>
                <span>{platformLabel(platform)}</span>
                {socialStatus && (
                  <span
                    className={`size-2 rounded-full ${
                      isConnected ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    title={isConnected ? "Connected" : "Not connected"}
                  />
                )}
              </button>
            );
          })}
        </div>

        {disconnectedSelected.length > 0 && (
          <p className="text-xs text-amber-500">
            Not connected yet: {disconnectedSelected.map(platformLabel).join(", ")}.{" "}
            <Link to="/social-accounts" className="underline hover:text-amber-400">
              Connect accounts
            </Link>{" "}
            before publishing to avoid delivery failure.
          </p>
        )}
      </div>

      {/* Attached Media Previews */}
      {attachedMedia.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedMedia.map((asset) => {
            const id = getMediaAssetId(asset);
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface-bright px-2.5 py-1.5 text-xs"
              >
                <span className="max-w-[160px] truncate">{asset.title}</span>
                <button
                  type="button"
                  aria-label={`Remove ${asset.title}`}
                  onClick={() =>
                    setAttachedMedia((prev) => prev.filter((item) => getMediaAssetId(item) !== id))
                  }
                  className="text-text-muted hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Optional Per-Platform Copy Editor */}
      {showEditors && (
        <div className="space-y-3 rounded-xl border border-border/50 bg-surface-bright/30 p-4">
          <p className="text-xs font-semibold text-text-secondary">
            Customize Generated Copy Before Publishing
          </p>
          {selectedPlatforms.map((platform) => (
            <div key={platform} className="space-y-1.5">
              <Label htmlFor={`edit-${panelInstanceId}-${platform}`}>
                {platformLabel(platform)}
              </Label>
              {platform === "email" && (
                <Input
                  aria-label="Email subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject line"
                  className="mb-1.5"
                />
              )}
              <textarea
                id={`edit-${panelInstanceId}-${platform}`}
                rows={3}
                value={draftTexts[platform] ?? ""}
                onChange={(e) => setDraftTexts((prev) => ({ ...prev, [platform]: e.target.value }))}
                className="w-full rounded-xl border border-border bg-surface-bright p-3 text-sm text-text focus:border-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons: Post Now / Custom Schedule */}
      <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            leftIcon={<Send className="size-4" />}
            onClick={() => handlePublishAction("now")}
            isLoading={createPost.isPending}
          >
            Post Now
          </Button>
          <Button
            type="button"
            variant="outline"
            leftIcon={<CalendarClock className="size-4" />}
            onClick={() => setShowCustomSchedule((v) => !v)}
          >
            {showCustomSchedule ? "Hide Custom Time" : "Schedule Custom Time"}
          </Button>
        </div>

        {showCustomSchedule && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor={`custom-dt-${panelInstanceId}`} className="text-xs">
                Date & Time ({userTimezone})
              </Label>
              <Input
                id={`custom-dt-${panelInstanceId}`}
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() => handlePublishAction("custom")}
              isLoading={createPost.isPending}
            >
              Confirm Schedule
            </Button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {submitResult && (
        <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <div className="flex items-center justify-between gap-2 text-emerald-500 font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              {submitResult.message} (Status: {submitResult.post.status})
            </span>
            <Link to="/posts/scheduled" className="text-xs underline">
              Open Schedule Queue →
            </Link>
          </div>
          <ul className="space-y-1 text-xs text-text-secondary">
            {submitResult.post.platforms.map((entry) => (
              <li key={entry.platform} className="flex flex-wrap items-center gap-2">
                <strong>{platformLabel(entry.platform)}:</strong>
                <span>{entry.status}</span>
                {entry.externalPostUrl && (
                  <a
                    href={entry.externalPostUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    View Live Post
                  </a>
                )}
                {entry.lastError && <span className="text-danger">{entry.lastError}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <MediaPickerModal
        isOpen={pickerOpen}
        selectedIds={attachedMedia.map(getMediaAssetId)}
        onClose={() => setPickerOpen(false)}
        onConfirm={setAttachedMedia}
      />
    </Card>
  );
}
