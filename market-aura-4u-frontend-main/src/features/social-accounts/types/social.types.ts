export type SocialPlatform = "twitter" | "linkedin" | "instagram" | "facebook" | "email" | "blog";

export type OAuthPlatform = "twitter" | "linkedin" | "instagram" | "facebook";
export type EmailProvider = "resend" | "sendgrid" | "webhook";
export type BlogProvider = "wordpress" | "hashnode" | "ghost" | "webhook";

export interface InstagramConnection {
  isConnected: boolean;
  instagramId?: string | null;
}

export interface SocialAccounts {
  instagram: InstagramConnection;
}

export interface TwitterConnectionStatus {
  isConnected: boolean;
  serverConfigured: boolean;
  username: string | null;
  name: string | null;
  expiresAt: string | null;
  connectedAt: string | null;
}

export interface LinkedInConnectionStatus {
  isConnected: boolean;
  serverConfigured: boolean;
  name: string | null;
  email: string | null;
  expiresAt: string | null;
  connectedAt: string | null;
}

export interface InstagramConnectionStatus {
  isConnected: boolean;
  serverConfigured: boolean;
  username: string | null;
  instagramId: string | null;
  accountType: string | null;
  expiresAt: string | null;
  connectedAt: string | null;
}

export interface FacebookPageOption {
  id: string;
  name: string;
}

export interface FacebookConnectionStatus {
  isConnected: boolean;
  serverConfigured: boolean;
  pageId: string | null;
  pageName: string | null;
  pages: FacebookPageOption[];
  expiresAt: string | null;
  connectedAt: string | null;
}

export interface EmailConnectionStatus {
  isConnected: boolean;
  serverConfigured: boolean;
  provider: EmailProvider | null;
  fromName: string | null;
  fromEmail: string | null;
  defaultRecipients: string[];
  webhookUrl: string | null;
  connectedAt: string | null;
}

export interface BlogConnectionStatus {
  isConnected: boolean;
  serverConfigured: boolean;
  provider: BlogProvider | null;
  siteUrl: string | null;
  username: string | null;
  publicationId: string | null;
  connectedAt: string | null;
}

export interface SocialStatusData {
  timezone: string;
  platforms: {
    twitter: TwitterConnectionStatus;
    linkedin: LinkedInConnectionStatus;
    instagram: InstagramConnectionStatus;
    facebook: FacebookConnectionStatus;
    email: EmailConnectionStatus;
    blog: BlogConnectionStatus;
  };
}

export interface ConnectEmailPayload {
  provider: EmailProvider;
  fromName?: string;
  fromEmail: string;
  defaultRecipients: string[];
  apiKey?: string;
  webhookUrl?: string;
}

export interface ConnectBlogPayload {
  provider: BlogProvider;
  siteUrl: string;
  username?: string;
  publicationId?: string;
  apiSecret?: string;
}
