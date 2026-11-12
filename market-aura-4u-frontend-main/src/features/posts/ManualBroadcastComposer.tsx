import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ImagePlus,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getMediaAssetId, MediaPickerModal, type MediaAsset } from "@/features/media";
import { useSocialStatus, type SocialPlatform } from "@/features/social-accounts";
import { extractApiErrorMessage } from "@/lib/api/error-message";
import { ALL_PLATFORMS, defaultLocalDateTimeValue, platformLabel } from "./content-helpers";
import type { ScheduledPost } from "./posts.types";
import { useCreatePost } from "./usePosts";

export function ManualBroadcastComposer() {
  const { data: socialStatus } = useSocialStatus();
  const createPost = useCreatePost();

  const [title, setTitle] = useState("");
  const [sharedText, setSharedText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    "twitter",
    "linkedin",
  ]);
  const [customizePerPlatform, setCustomizePerPlatform] = useState(false);
  const [overrides, setOverrides] = useState<Partial<Record<SocialPlatform, string>>>({});
  const [attachedMedia, setAttachedMedia] = useState<MediaAsset[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [publishMode, setPublishMode] = useState<"now" | "custom">("now");
  const [customDateTime, setCustomDateTime] = useState(() => defaultLocalDateTimeValue(60));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; post: ScheduledPost } | null>(null);

  const userTimezone =
    socialStatus?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    if (selectedPlatforms.length === 0) {
      setErrorMsg("Select at least one target platform.");
      return;
    }

    if (!sharedText.trim() && !customizePerPlatform) {
      setErrorMsg("Enter your post content before broadcasting.");
      return;
    }

    let scheduledAtIso: string | undefined;
    if (publishMode === "custom") {
      const parsed = new Date(customDateTime);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        setErrorMsg("Please choose a future date and time for scheduled delivery.");
        return;
      }
      scheduledAtIso = parsed.toISOString();
    }

    const mediaAssetIds = attachedMedia.map(getMediaAssetId).filter(Boolean);
    const mediaUrls = attachedMedia.map((m) => m.url);

    const platformOverrides: Partial<Record<SocialPlatform, unknown>> = {};
    if (customizePerPlatform) {
      for (const platform of selectedPlatforms) {
        const custom = overrides[platform]?.trim();
        if (!custom) continue;
        if (platform === "twitter") {
          platformOverrides.twitter = [
            { text: custom, ...(mediaUrls[0] ? { image_url: mediaUrls[0] } : {}) },
          ];
        } else if (platform === "instagram") {
          platformOverrides.instagram = {
            caption: custom,
            ...(mediaUrls[0] ? { image_url: mediaUrls[0] } : {}),
            content_type: "image",
          };
        } else if (platform === "email") {
          platformOverrides.email = {
            subject: emailSubject.trim() || title.trim() || "Campaign Update",
            body: custom,
          };
        } else if (platform === "blog") {
          platformOverrides.blog = title.trim() ? { title: title.trim(), body: custom } : [custom];
        } else {
          platformOverrides[platform] = [custom];
        }
      }
    }

    try {
      const res = await createPost.mutateAsync({
        mode: publishMode,
        sourceType: "manual_broadcast",
        title: title.trim() || "Manual Broadcast Post",
        ...(scheduledAtIso ? { scheduledAt: scheduledAtIso } : {}),
        timezone: userTimezone,
        platforms: selectedPlatforms,
        sharedContent: {
          text: sharedText.trim(),
          subject: emailSubject.trim() || title.trim() || "Campaign Update",
          title: title.trim() || undefined,
          body: sharedText.trim(),
        },
        platformOverrides,
        mediaAssetIds,
        mediaUrls,
      });
      setResult(res);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, "Failed to send or schedule broadcast."));
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Manual Broadcast Composer</h2>
          <p className="text-sm text-text-secondary">
            Write your own post, attach media from your library, and broadcast or schedule across
            every selected channel at once.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="broadcast-title">Campaign / Blog Title</Label>
            <Input
              id="broadcast-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Spring Product Drop"
            />
          </div>

          {selectedPlatforms.includes("email") && (
            <div>
              <Label htmlFor="broadcast-email-subject">Email Subject (optional)</Label>
              <Input
                id="broadcast-email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Big news for subscribers"
              />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="broadcast-text">Broadcast Content</Label>
          <textarea
            id="broadcast-text"
            rows={5}
            value={sharedText}
            onChange={(e) => setSharedText(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-border bg-surface-bright/40 p-4 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Write the message you want to publish across your connected channels..."
          />
          <p className="mt-1 text-xs text-text-muted">
            {sharedText.length} characters (Twitter/X limit is 280 chars unless customized below)
          </p>
        </div>

        {/* Media Attachments */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Media Attachments</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<ImagePlus className="size-4" />}
              onClick={() => setPickerOpen(true)}
            >
              Attach / Upload Media ({attachedMedia.length})
            </Button>
          </div>

          {attachedMedia.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedMedia.map((asset) => {
                const id = getMediaAssetId(asset);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface-bright px-3 py-1.5 text-xs"
                  >
                    <span className="max-w-[180px] truncate">{asset.title}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${asset.title}`}
                      onClick={() =>
                        setAttachedMedia((prev) =>
                          prev.filter((item) => getMediaAssetId(item) !== id),
                        )
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
        </div>

        {/* Platform Checkboxes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Target Platforms</Label>
            <button
              type="button"
              onClick={() => setCustomizePerPlatform((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <SlidersHorizontal className="size-3.5" />
              {customizePerPlatform ? "Hide Per-Platform Overrides" : "Customize Per Platform"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORMS.map(({ key, label }) => {
              const checked = selectedPlatforms.includes(key);
              const connected = socialStatus?.platforms[key]?.isConnected;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    checked
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 bg-surface-bright/40 text-text-secondary hover:text-text"
                  }`}
                >
                  <span>{checked ? "✓" : "+"}</span>
                  <span>{label}</span>
                  {socialStatus && (
                    <span
                      className={`size-2 rounded-full ${
                        connected ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      title={connected ? "Connected" : "Not connected"}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {customizePerPlatform && selectedPlatforms.length > 0 && (
          <div className="space-y-3 rounded-xl border border-border/50 bg-surface-bright/30 p-4">
            <p className="text-xs text-text-secondary">
              Optional overrides — leave blank to use your Broadcast Content above.
            </p>
            {selectedPlatforms.map((platform) => (
              <div key={platform}>
                <Label htmlFor={`override-${platform}`}>{platformLabel(platform)} Override</Label>
                <textarea
                  id={`override-${platform}`}
                  rows={2}
                  value={overrides[platform] ?? ""}
                  onChange={(e) =>
                    setOverrides((prev) => ({ ...prev, [platform]: e.target.value }))
                  }
                  placeholder={`Custom text for ${platformLabel(platform)}...`}
                  className="mt-1 w-full rounded-xl border border-border bg-surface-bright p-2.5 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Delivery Timing */}
        <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={publishMode === "now" ? "primary" : "outline"}
              onClick={() => setPublishMode("now")}
            >
              Publish Immediately
            </Button>
            <Button
              type="button"
              size="sm"
              variant={publishMode === "custom" ? "primary" : "outline"}
              onClick={() => setPublishMode("custom")}
            >
              Schedule Later
            </Button>
          </div>

          {publishMode === "custom" && (
            <div className="w-full sm:w-auto">
              <Label htmlFor="broadcast-schedule-dt" className="text-xs">
                Schedule Time ({userTimezone})
              </Label>
              <Input
                id="broadcast-schedule-dt"
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
              />
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            leftIcon={
              publishMode === "now" ? (
                <Send className="size-4" />
              ) : (
                <CalendarClock className="size-4" />
              )
            }
            isLoading={createPost.isPending}
          >
            {publishMode === "now" ? "Broadcast Now" : "Schedule Broadcast"}
          </Button>
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

        {result && (
          <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            <div className="flex items-center justify-between gap-2 font-medium text-emerald-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                {result.message} (Status: {result.post.status})
              </span>
              <Link to="/posts/scheduled" className="text-xs underline">
                View Schedule Queue →
              </Link>
            </div>
            <ul className="space-y-1 text-xs text-text-secondary">
              {result.post.platforms.map((entry) => (
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
      </form>

      <MediaPickerModal
        isOpen={pickerOpen}
        selectedIds={attachedMedia.map(getMediaAssetId)}
        onClose={() => setPickerOpen(false)}
        onConfirm={setAttachedMedia}
      />
    </Card>
  );
}
