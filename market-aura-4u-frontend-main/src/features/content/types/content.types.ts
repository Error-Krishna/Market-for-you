export type ContentPlatform = "twitter" | "linkedin" | "facebook" | "blog" | "instagram" | "email";

export type ContentJobStatus = "processing" | "completed" | "failed";

export interface TwitterContent {
  text: string;
  image_url?: string;
}

export interface InstagramContent {
  caption: string;
  image_url?: string;
  content_type?: "image" | "carousel";
  slides?: InstagramCarouselSlide[];
}

export interface InstagramCarouselSlide {
  slide_number: number;
  headline: string;
  body: string;
}

export interface EmailContent {
  subject: string;
  body: string;
}

export interface GroundingMetadata {
  isGrounded: boolean;
  recommendation?: GroundingRecommendation | null;
  reason?: string;
}

export interface RecommendedPostingTime {
  day?: string;
  start?: string;
  end?: string;
  timezone?: string;
}

export interface GroundingRecommendation {
  recommended_content_type?: { value?: string; label?: string };
  recommended_format?: string;
  predicted_engagement?: { value?: number; label?: string };
  engagement_prediction?: { predicted_likes?: number };
  recommended_posting_time?: RecommendedPostingTime | string;
  recommended_hashtags?: string[];
  [key: string]: unknown;
}

export interface GeneratedContent {
  twitter?: TwitterContent[];
  linkedin?: string[];
  facebook?: string[];
  blog?: string[];
  instagram?: InstagramContent;
  email?: EmailContent;
  imageUrl?: string;
  grounding?: GroundingMetadata;
}

export interface GenerateContentRequest {
  prompt: string;
}

export interface ContentJob {
  id: string;
  userId: string;
  status: ContentJobStatus;
  platforms: string[];
  originalContent: string;
  generatedContent?: GeneratedContent;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GenerateContentResponse {
  success: boolean;
  message: string;
  job: ContentJob;
}

export interface ContentHistoryResponse {
  success: boolean;
  count: number;
  jobs: ContentJob[];
  pagination?: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface PublishContentRequest {
  jobId: string;
  platforms: ContentPlatform[];
}

export interface PublishResult {
  platform: string;
  success: boolean;
  message?: string;
  url?: string;
  tweetId?: string;
  real?: boolean;
  simulated?: boolean;
}

export interface PublishContentResponse {
  success: boolean;
  message: string;
  results: PublishResult[];
}
