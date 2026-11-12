import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getContentHistory } from "../api/content-api";

export function useContentHistory() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ["contentHistory", user?.id],
    queryFn: ({ pageParam }) =>
      getContentHistory({ limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore && lastPage.pagination.nextCursor
        ? lastPage.pagination.nextCursor
        : undefined,
    enabled: Boolean(user?.id),
  });
}
