import { apiClient } from "@/lib/api/client";

import type {
  ContentHistoryResponse,
  GenerateContentRequest,
  GenerateContentResponse,
  PublishContentRequest,
  PublishContentResponse,
} from "../types/content.types";

const CONTENT_BASE_PATH = "/v1/content";

export async function generateContent(
  request: GenerateContentRequest,
): Promise<GenerateContentResponse> {
  const response = await apiClient.post<GenerateContentResponse>(
    `${CONTENT_BASE_PATH}/generate`,
    request,
  );

  return response.data;
}

export async function getContentHistory(
  params: { limit?: number; cursor?: string } = {},
): Promise<ContentHistoryResponse> {
  const response = await apiClient.get<ContentHistoryResponse>(`${CONTENT_BASE_PATH}/history`, {
    params,
  });

  return response.data;
}

export async function publishContent(
  request: PublishContentRequest,
): Promise<PublishContentResponse> {
  const response = await apiClient.post<PublishContentResponse>(
    `${CONTENT_BASE_PATH}/publish`,
    request,
  );

  return response.data;
}
