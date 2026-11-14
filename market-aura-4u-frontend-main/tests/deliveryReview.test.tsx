// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeliveryReview } from "../src/features/posts/DeliveryReview";
import type { ScheduledPost } from "../src/features/posts/posts.types";
import { apiClient } from "../src/lib/api/client";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test("review requires both confirmations and records the selected outcome", async () => {
  const request = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { post: {} } });
  const post = {
    id: "post-1",
    deliveryOutcomeUnknown: true,
    platforms: [{ platform: "email", outcomeUnknown: true }],
  } as ScheduledPost;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DeliveryReview post={post} />
    </QueryClientProvider>,
  );
  const button = screen.getByRole("button", {
    name: "Not published on email",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByLabelText("I checked the platform for this post."));
  expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByLabelText("I confirmed the previous attempt has ended."));
  fireEvent.click(button);
  expect(await screen.findByRole("status")).toBeTruthy();
  expect(button.disabled).toBe(true);
  expect(request).toHaveBeenCalledWith("/v1/posts/post-1/resolve-delivery", {
    platformIndex: 0,
    outcome: "not_published",
    verifiedProvider: true,
    previousAttemptEnded: true,
  });
});

test("failed review shows an error and does not claim success", async () => {
  vi.spyOn(apiClient, "post").mockRejectedValue(new Error("network error"));
  const post = {
    id: "post-2",
    deliveryOutcomeUnknown: true,
    platforms: [{ platform: "email", outcomeUnknown: true }],
  } as ScheduledPost;
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <DeliveryReview post={post} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByLabelText("I checked the platform for this post."));
  fireEvent.click(screen.getByLabelText("I confirmed the previous attempt has ended."));
  fireEvent.click(screen.getByRole("button", { name: "Already published on email" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
});
