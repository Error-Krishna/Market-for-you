import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMedia,
  deleteMedia,
  listMedia,
  updateMedia,
  type ListMediaParams,
} from "./media-api";
import type { CreateMediaPayload, MediaAsset, UpdateMediaPayload } from "./media.types";

export const MEDIA_QUERY_KEY = ["mediaLibrary"];

export function useMediaList(params?: ListMediaParams) {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, params?.mediaType ?? "", params?.q ?? ""],
    queryFn: () => listMedia(params),
  });
}

export function useCreateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMediaPayload) => createMedia(payload),
    onSuccess: (newAsset) => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
      if (newAsset) {
        queryClient.setQueriesData<MediaAsset[]>({ queryKey: MEDIA_QUERY_KEY }, (old) => {
          if (!old) return [newAsset];
          const newId = newAsset._id || newAsset.id;
          const exists = old.some((a) => (a._id || a.id) === newId);
          return exists ? old : [newAsset, ...old];
        });
      }
    },
  });
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMediaPayload }) =>
      updateMedia(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
    },
  });
}
