import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelPost,
  createPost,
  deletePost,
  listPosts,
  publishPostNow,
  retryFailedPost,
  resolveDelivery,
  updatePost,
  type ListPostsParams,
} from "./posts-api";
import type { CreatePostPayload, UpdatePostPayload } from "./posts.types";

export const POSTS_QUERY_KEY = ["scheduledPosts"];

export function useResolveDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      platformIndex,
      outcome,
    }: {
      id: string;
      platformIndex: number;
      outcome: "published" | "not_published";
    }) => resolveDelivery(id, platformIndex, outcome),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY }),
  });
}

export function useScheduledPosts(params?: ListPostsParams) {
  return useQuery({
    queryKey: [...POSTS_QUERY_KEY, params?.status ?? "", params?.sourceType ?? ""],
    queryFn: () => listPosts(params),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePostPayload) => createPost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePostPayload }) =>
      updatePost(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}

export function usePublishPostNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishPostNow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}

export function useRetryFailedPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retryFailedPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}

export function useCancelPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}
