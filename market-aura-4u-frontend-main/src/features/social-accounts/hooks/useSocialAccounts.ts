import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectBlogChannel,
  connectEmailChannel,
  disconnectInstagram,
  disconnectSocialPlatform,
  getSocialAccounts,
  getSocialStatus,
  initiateOAuthConnect,
  selectFacebookPage,
  updateTimezone,
} from "../api/social-api";
import type {
  ConnectBlogPayload,
  ConnectEmailPayload,
  OAuthPlatform,
  SocialPlatform,
} from "../types/social.types";

const SOCIAL_QUERY_KEY = ["socialStatus"];

export function useSocialStatus() {
  return useQuery({
    queryKey: SOCIAL_QUERY_KEY,
    queryFn: getSocialStatus,
  });
}

export function useUpdateTimezone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (timezone: string) => updateTimezone(timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOCIAL_QUERY_KEY });
    },
  });
}

export function useInitiateOAuthConnect() {
  return useMutation({
    mutationFn: (platform: OAuthPlatform) => initiateOAuthConnect(platform),
  });
}

export function useSelectFacebookPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => selectFacebookPage(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOCIAL_QUERY_KEY });
    },
  });
}

export function useConnectEmailChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConnectEmailPayload) => connectEmailChannel(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOCIAL_QUERY_KEY });
    },
  });
}

export function useConnectBlogChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConnectBlogPayload) => connectBlogChannel(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOCIAL_QUERY_KEY });
    },
  });
}

export function useDisconnectSocialPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (platform: SocialPlatform) => disconnectSocialPlatform(platform),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOCIAL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["socialAccounts"] });
    },
  });
}

export function useSocialAccounts() {
  return useQuery({
    queryKey: ["socialAccounts"],
    queryFn: getSocialAccounts,
  });
}

export function useDisconnectInstagram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectInstagram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["socialAccounts"] });
      queryClient.invalidateQueries({ queryKey: SOCIAL_QUERY_KEY });
    },
  });
}
