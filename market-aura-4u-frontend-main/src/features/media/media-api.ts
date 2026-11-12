import { apiClient } from "@/lib/api/client";
import type { CreateMediaPayload, MediaAsset, MediaType, UpdateMediaPayload } from "./media.types";

export interface ListMediaParams {
  mediaType?: MediaType | "";
  q?: string;
}

export async function listMedia(params?: ListMediaParams): Promise<MediaAsset[]> {
  const res = await apiClient.get("/v1/media", {
    params: {
      ...(params?.mediaType ? { mediaType: params.mediaType } : {}),
      ...(params?.q?.trim() ? { q: params.q.trim() } : {}),
    },
  });
  return res.data.media ?? [];
}

export async function createMedia(payload: CreateMediaPayload): Promise<MediaAsset> {
  const res = await apiClient.post("/v1/media", payload);
  return res.data.media;
}

export async function updateMedia(id: string, payload: UpdateMediaPayload): Promise<MediaAsset> {
  const res = await apiClient.put(`/v1/media/${id}`, payload);
  return res.data.media;
}

export async function deleteMedia(id: string): Promise<void> {
  await apiClient.delete(`/v1/media/${id}`);
}
