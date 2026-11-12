import { apiClient } from "@/lib/api/client";
import type {
  ConnectBlogPayload,
  ConnectEmailPayload,
  OAuthPlatform,
  SocialAccounts,
  SocialPlatform,
  SocialStatusData,
} from "../types/social.types";

export async function getSocialStatus(): Promise<SocialStatusData> {
  const res = await apiClient.get("/v1/auth/social/status");
  return res.data.data;
}

export async function updateTimezone(timezone: string): Promise<string> {
  const res = await apiClient.put("/v1/auth/social/timezone", { timezone });
  return res.data.timezone;
}

export async function initiateOAuthConnect(platform: OAuthPlatform): Promise<{ url: string }> {
  const res = await apiClient.get(`/v1/auth/social/${platform}/connect`);
  return { url: res.data.url };
}

export async function selectFacebookPage(pageId: string): Promise<void> {
  await apiClient.post("/v1/auth/social/facebook/select-page", { pageId });
}

export async function connectEmailChannel(payload: ConnectEmailPayload): Promise<void> {
  await apiClient.post("/v1/auth/social/email/connect", payload);
}

export async function connectBlogChannel(payload: ConnectBlogPayload): Promise<void> {
  await apiClient.post("/v1/auth/social/blog/connect", payload);
}

export async function disconnectSocialPlatform(platform: SocialPlatform): Promise<void> {
  await apiClient.delete(`/v1/auth/social/${platform}`);
}

export async function getSocialAccounts(): Promise<SocialAccounts> {
  const status = await getSocialStatus();
  return {
    instagram: {
      isConnected: status.platforms.instagram.isConnected,
      instagramId: status.platforms.instagram.instagramId,
    },
  };
}

export async function disconnectInstagram(): Promise<void> {
  await disconnectSocialPlatform("instagram");
}
