// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useContentHistory } from "../src/features/content/hooks/useContentHistory";

const mocks = vi.hoisted(() => ({
  getContentHistory: vi.fn(),
  userId: "user-one" as string | null,
}));
vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.userId ? { id: mocks.userId } : null }),
}));
vi.mock("../src/features/content/api/content-api", () => ({
  getContentHistory: mocks.getContentHistory,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

test("history hook requests cursor pages and stops when the backend marks the last page", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.userId = "user-one";
  mocks.getContentHistory
    .mockResolvedValueOnce({
      success: true,
      count: 21,
      jobs: [{ id: "job-1" }],
      pagination: { limit: 20, hasMore: true, nextCursor: "64b000000000000000000001" },
    })
    .mockResolvedValueOnce({
      success: true,
      count: 21,
      jobs: [{ id: "job-2" }],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    });
  const { result } = renderHook(() => useContentHistory(), { wrapper: createWrapper(client) });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);
  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  expect(result.current.hasNextPage).toBe(false);
  expect(mocks.getContentHistory).toHaveBeenNthCalledWith(1, { limit: 20 });
  expect(mocks.getContentHistory).toHaveBeenNthCalledWith(2, {
    limit: 20,
    cursor: "64b000000000000000000001",
  });
  client.clear();
});

test("history cache and cursor reset when the authenticated user changes", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.userId = "user-one";
  mocks.getContentHistory
    .mockResolvedValueOnce({
      success: true,
      count: 2,
      jobs: [{ id: "one" }],
      pagination: { limit: 20, hasMore: true, nextCursor: "64b000000000000000000001" },
    })
    .mockResolvedValueOnce({
      success: true,
      count: 1,
      jobs: [{ id: "two" }],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    });
  const { result, rerender } = renderHook(() => useContentHistory(), {
    wrapper: createWrapper(client),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  mocks.userId = "user-two";
  rerender();
  await waitFor(() => {
    expect(mocks.getContentHistory).toHaveBeenCalledTimes(2);
    expect(result.current.data?.pages[0].jobs[0].id).toBe("two");
  });
  expect(mocks.getContentHistory).toHaveBeenLastCalledWith({ limit: 20 });
  client.clear();
});
