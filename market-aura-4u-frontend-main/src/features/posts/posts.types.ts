import type { RecommendedPostingTime } from "@/features/content";
import type { SocialPlatform } from "@/features/social-accounts";

export type PublishMode = "now" | "recommended" | "custom";
export type PostSourceType = "ai_generated" | "manual_broadcast";
export type ScheduledPostStatus =
  "scheduled" | "processing" | "published" | "partial" | "failed" | "cancelled";

export type PlatformDeliveryStatus =
  "pending" | "processing" | "published" | "failed" | "cancelled";

export interface PlatformDelivery {
  platform: SocialPlatform;
  content: unknown;
  mediaAssetIds?: string[];
  mediaUrls?: string[];
  status: PlatformDeliveryStatus;
  attempts: number;
  lastError: string | null;
  retryable: boolean;
  outcomeUnknown?: boolean;
  externalPostId: string | null;
  externalPostUrl: string | null;
  publishedAt: string | null;
}

export interface ScheduledPost {
  _id?: string;
  id?: string;
  userId: string;
  jobId: string | null;
  sourceType: PostSourceType;
  title: string;
  scheduledAt: string;
  timezone: string;
  recommendedTimeUsed: boolean;
  status: ScheduledPostStatus;
  platforms: PlatformDelivery[];
  deliveryOutcomeUnknown?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostPlatformEntry {
  platform: SocialPlatform;
  content?: unknown;
  mediaAssetIds?: string[];
  mediaUrls?: string[];
}

export interface SharedBroadcastContent {
  text: string;
  subject?: string;
  title?: string;
  body?: string;
}

export interface CreatePostPayload {
  mode: PublishMode;
  sourceType?: PostSourceType;
  jobId?: string;
  title?: string;
  scheduledAt?: string;
  timezone?: string;
  recommendedPostingTime?: RecommendedPostingTime | string;
  platforms: Array<SocialPlatform | CreatePostPlatformEntry>;
  sharedContent?: SharedBroadcastContent;
  platformOverrides?: Partial<Record<SocialPlatform, unknown>>;
  mediaAssetIds?: string[];
  mediaUrls?: string[];
}

export interface UpdatePostPayload {
  title?: string;
  scheduledAt?: string;
  timezone?: string;
  platforms?: CreatePostPlatformEntry[];
}

export function getScheduledPostId(post: ScheduledPost): string {
  return post._id || post.id || "";
}
