import { apiClient } from "@/lib/api/client";
import type { CreatePostPayload, ScheduledPost, UpdatePostPayload } from "./posts.types";

export interface ListPostsParams {
  status?: string;
  sourceType?: string;
}

export async function createPost(payload: CreatePostPayload): Promise<{
  message: string;
  post: ScheduledPost;
}> {
  const res = await apiClient.post("/v1/posts", payload);
  return { message: res.data.message, post: res.data.post };
}

export async function listPosts(params?: ListPostsParams): Promise<ScheduledPost[]> {
  const res = await apiClient.get("/v1/posts", {
    params: {
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.sourceType ? { sourceType: params.sourceType } : {}),
    },
  });
  return res.data.posts ?? [];
}

export async function getPost(id: string): Promise<ScheduledPost> {
  const res = await apiClient.get(`/v1/posts/${id}`);
  return res.data.post;
}

export async function updatePost(id: string, payload: UpdatePostPayload): Promise<ScheduledPost> {
  const res = await apiClient.put(`/v1/posts/${id}`, payload);
  return res.data.post;
}

export async function publishPostNow(id: string): Promise<{
  message: string;
  post: ScheduledPost;
}> {
  const res = await apiClient.post(`/v1/posts/${id}/publish-now`);
  return { message: res.data.message, post: res.data.post };
}

export async function retryFailedPost(id: string): Promise<{
  message: string;
  post: ScheduledPost;
}> {
  const res = await apiClient.post(`/v1/posts/${id}/retry`);
  return { message: res.data.message, post: res.data.post };
}

export async function cancelPost(id: string): Promise<ScheduledPost> {
  const res = await apiClient.post(`/v1/posts/${id}/cancel`);
  return res.data.post;
}

export async function deletePost(id: string): Promise<void> {
  await apiClient.delete(`/v1/posts/${id}`);
}
