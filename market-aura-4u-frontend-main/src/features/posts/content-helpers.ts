import type { GeneratedContent, RecommendedPostingTime } from "@/features/content";
import type { SocialPlatform } from "@/features/social-accounts";

export const ALL_PLATFORMS: Array<{ key: SocialPlatform; label: string }> = [
  { key: "twitter", label: "Twitter / X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "email", label: "Email" },
  { key: "blog", label: "Blog" },
];

export function platformLabel(platform: SocialPlatform): string {
  return ALL_PLATFORMS.find((p) => p.key === platform)?.label ?? platform;
}

export function extractAvailablePlatforms(content: GeneratedContent): SocialPlatform[] {
  const available: SocialPlatform[] = [];
  if (Array.isArray(content.twitter) && content.twitter.length > 0) available.push("twitter");
  if (Array.isArray(content.linkedin) && content.linkedin.length > 0) available.push("linkedin");
  if (content.instagram && typeof content.instagram.caption === "string") {
    available.push("instagram");
  }
  if (Array.isArray(content.facebook) && content.facebook.length > 0) available.push("facebook");
  if (content.email && typeof content.email.body === "string") available.push("email");
  if (Array.isArray(content.blog) && content.blog.length > 0) available.push("blog");
  return available;
}

export function extractEditableText(content: GeneratedContent, platform: SocialPlatform): string {
  switch (platform) {
    case "twitter":
      return content.twitter?.[0]?.text ?? "";
    case "linkedin":
      return content.linkedin?.[0] ?? "";
    case "facebook":
      return content.facebook?.[0] ?? "";
    case "blog":
      return content.blog?.[0] ?? "";
    case "instagram":
      return content.instagram?.caption ?? "";
    case "email":
      return content.email?.body ?? "";
    default:
      return "";
  }
}

export function buildEditedPlatformContent(
  original: GeneratedContent,
  platform: SocialPlatform,
  editedText: string,
  editedEmailSubject?: string,
): unknown {
  const trimmed = editedText.trim();
  switch (platform) {
    case "twitter":
      return [{ ...(original.twitter?.[0] ?? {}), text: trimmed }];
    case "linkedin":
      return [trimmed];
    case "facebook":
      return [trimmed];
    case "blog":
      return [trimmed];
    case "instagram":
      return { ...(original.instagram ?? { content_type: "image" }), caption: trimmed };
    case "email":
      return {
        subject: (editedEmailSubject ?? original.email?.subject ?? "Newsletter Update").trim(),
        body: trimmed,
      };
    default:
      return trimmed;
  }
}

export function extractRecommendedPostingTime(
  content: GeneratedContent,
): RecommendedPostingTime | string | undefined {
  return content.grounding?.recommendation?.recommended_posting_time;
}

export function formatRecommendedWindow(
  rec?: RecommendedPostingTime | string | null,
): string | null {
  if (!rec) return null;
  if (typeof rec === "string") return rec.trim() || null;
  const parts = [
    rec.day,
    rec.start && rec.end ? `${rec.start}–${rec.end}` : rec.start,
    rec.timezone,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function defaultLocalDateTimeValue(minutesFromNow = 30): string {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
