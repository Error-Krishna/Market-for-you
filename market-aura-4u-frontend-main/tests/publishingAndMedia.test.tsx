// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { PublishSchedulePanel } from "../src/features/posts/PublishSchedulePanel";
import { ManualBroadcastComposer } from "../src/features/posts/ManualBroadcastComposer";
import MediaLibraryPage from "../src/pages/app/MediaLibraryPage";
import ScheduledPostsPage from "../src/pages/app/ScheduledPostsPage";
import DashboardPage from "../src/pages/app/DashboardPage";
import * as authApi from "../src/features/auth/api/auth-api";

const createPostMutateAsync = vi.fn();
const publishNowMutateAsync = vi.fn();
const retryMutateAsync = vi.fn();
const cancelMutateAsync = vi.fn();
const deletePostMutateAsync = vi.fn();
const updatePostMutateAsync = vi.fn();

const createMediaMutateAsync = vi.fn();
const updateMediaMutateAsync = vi.fn();
const deleteMediaMutateAsync = vi.fn();

vi.mock("@/features/social-accounts", () => ({
  useSocialStatus: () => ({
    data: {
      timezone: "America/New_York",
      platforms: {
        twitter: { isConnected: true, serverConfigured: true },
        linkedin: { isConnected: true, serverConfigured: true },
        instagram: { isConnected: false, serverConfigured: true },
        facebook: { isConnected: false, serverConfigured: true },
        email: { isConnected: false, serverConfigured: true },
        blog: { isConnected: false, serverConfigured: true },
      },
    },
    isLoading: false,
  }),
}));

vi.mock("@/features/media", () => ({
  getMediaAssetId: (asset: { _id?: string; id?: string }) => asset._id || asset.id || "",
  useMediaList: () => ({
    data: [
      {
        _id: "media-1",
        title: "Launch Hero Banner",
        altText: "Product shot",
        tags: ["launch"],
        mediaType: "image",
        sourceType: "url",
        url: "https://cdn.example.com/hero.jpg",
        mimeType: "image/jpeg",
        createdAt: "2026-11-10T10:00:00.000Z",
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCreateMedia: () => ({ mutateAsync: createMediaMutateAsync, isPending: false }),
  useUpdateMedia: () => ({ mutateAsync: updateMediaMutateAsync, isPending: false }),
  useDeleteMedia: () => ({ mutateAsync: deleteMediaMutateAsync, isPending: false }),
  readFileAsDataUrl: vi.fn(),
  MediaPickerModal: () => null,
}));

vi.mock("@/features/posts/usePosts", () => ({
  useCreatePost: () => ({ mutateAsync: createPostMutateAsync, isPending: false }),
  useUpdatePost: () => ({ mutateAsync: updatePostMutateAsync, isPending: false }),
  usePublishPostNow: () => ({
    mutateAsync: publishNowMutateAsync,
    isPending: false,
    variables: undefined,
  }),
  useRetryFailedPost: () => ({
    mutateAsync: retryMutateAsync,
    isPending: false,
    variables: undefined,
  }),
  useCancelPost: () => ({ mutateAsync: cancelMutateAsync, isPending: false, variables: undefined }),
  useDeletePost: () => ({
    mutateAsync: deletePostMutateAsync,
    isPending: false,
    variables: undefined,
  }),
  useScheduledPosts: () => ({
    data: [
      {
        _id: "post-1",
        userId: "user-1",
        jobId: "job-1",
        sourceType: "ai_generated",
        title: "AI Launch Campaign",
        scheduledAt: "2026-12-01T14:00:00.000Z",
        timezone: "UTC",
        recommendedTimeUsed: true,
        status: "scheduled",
        platforms: [
          {
            platform: "twitter",
            content: [{ text: "Hello X" }],
            status: "pending",
            attempts: 0,
            lastError: null,
            retryable: false,
            externalPostId: null,
            externalPostUrl: null,
            publishedAt: null,
          },
        ],
        createdAt: "2026-11-10T10:00:00.000Z",
        updatedAt: "2026-11-10T10:00:00.000Z",
      },
      {
        _id: "post-2",
        userId: "user-1",
        jobId: null,
        sourceType: "manual_broadcast",
        title: "Partial Failure Broadcast",
        scheduledAt: "2026-11-11T10:00:00.000Z",
        timezone: "UTC",
        recommendedTimeUsed: false,
        status: "partial",
        platforms: [
          {
            platform: "linkedin",
            content: ["Live update"],
            status: "published",
            attempts: 1,
            lastError: null,
            retryable: false,
            externalPostId: "urn:li:share:123",
            externalPostUrl: "https://www.linkedin.com/feed/update/urn:li:share:123",
            publishedAt: "2026-11-11T10:00:05.000Z",
          },
          {
            platform: "twitter",
            content: [{ text: "Retry me" }],
            status: "failed",
            attempts: 1,
            lastError: "Rate limited by X API",
            retryable: true,
            externalPostId: null,
            externalPostUrl: null,
            publishedAt: null,
          },
        ],
        createdAt: "2026-11-11T09:50:00.000Z",
        updatedAt: "2026-11-11T10:00:05.000Z",
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

test("PublishSchedulePanel exposes recommended-time CTA and submits recommended schedule", async () => {
  createPostMutateAsync.mockResolvedValue({
    message: "Scheduled at ML recommended window",
    post: {
      _id: "post-rec-1",
      status: "scheduled",
      platforms: [{ platform: "twitter", status: "pending" }],
    },
  });

  render(
    <MemoryRouter>
      <PublishSchedulePanel
        jobId="job-abc"
        title="Holiday Promo"
        content={{
          twitter: [{ text: "Holiday deals are live!" }],
          linkedin: ["Holiday deals are now live across our catalog."],
          grounding: {
            grounded: true,
            recommendation: {
              recommended_posting_time: {
                day: "Tuesday",
                start: "09:00",
                end: "11:00",
                timezone: "UTC",
              },
            },
          },
        }}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText(/Recommended Posting Window: Tuesday/i)).toBeTruthy();
  const ctaBtn = screen.getByRole("button", { name: /Schedule at Recommended Time/i });
  fireEvent.click(ctaBtn);

  await waitFor(() => {
    expect(createPostMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "recommended",
        jobId: "job-abc",
        recommendedPostingTime: {
          day: "Tuesday",
          start: "09:00",
          end: "11:00",
          timezone: "UTC",
        },
      }),
    );
  });
});

test("ManualBroadcastComposer submits manual multi-platform broadcast", async () => {
  createPostMutateAsync.mockResolvedValue({
    message: "Published immediately",
    post: {
      _id: "post-man-1",
      status: "published",
      platforms: [
        { platform: "twitter", status: "published" },
        { platform: "linkedin", status: "published" },
      ],
    },
  });

  render(
    <MemoryRouter>
      <ManualBroadcastComposer />
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText(/Campaign \/ Blog Title/i), {
    target: { value: "Spring Drop" },
  });
  fireEvent.change(screen.getByLabelText(/Broadcast Content/i), {
    target: { value: "Our Spring collection just launched!" },
  });

  fireEvent.click(screen.getByRole("button", { name: /Broadcast Now/i }));

  await waitFor(() => {
    expect(createPostMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "now",
        sourceType: "manual_broadcast",
        title: "Spring Drop",
        platforms: ["twitter", "linkedin"],
        sharedContent: expect.objectContaining({
          text: "Our Spring collection just launched!",
        }),
      }),
    );
  });
});

test("MediaLibraryPage lists media and supports adding & deleting assets", async () => {
  createMediaMutateAsync.mockResolvedValue({ _id: "media-2", title: "New Banner" });
  deleteMediaMutateAsync.mockResolvedValue(undefined);

  render(
    <MemoryRouter>
      <MediaLibraryPage />
    </MemoryRouter>,
  );

  expect(screen.getByText("Launch Hero Banner")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Add Media/i }));
  fireEvent.change(screen.getByLabelText(/^Title$/i), { target: { value: "New Promo" } });
  fireEvent.change(screen.getByLabelText(/Public HTTPS Media URL/i), {
    target: { value: "https://cdn.example.com/promo.png" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Save Media Asset/i }));

  await waitFor(() => {
    expect(createMediaMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Promo",
        url: "https://cdn.example.com/promo.png",
      }),
    );
  });

  fireEvent.click(screen.getByRole("button", { name: /Delete Launch Hero Banner/i }));
  fireEvent.click(screen.getByRole("button", { name: /^Confirm$/i }));

  await waitFor(() => {
    expect(deleteMediaMutateAsync).toHaveBeenCalledWith("media-1");
  });
});

test("ScheduledPostsPage shows scheduled & partial posts with Post Now and Retry actions", async () => {
  publishNowMutateAsync.mockResolvedValue({ message: "Published", post: { status: "published" } });
  retryMutateAsync.mockResolvedValue({ message: "Retried", post: { status: "published" } });

  render(
    <MemoryRouter>
      <ScheduledPostsPage />
    </MemoryRouter>,
  );

  expect(screen.getByText("AI Launch Campaign")).toBeTruthy();
  expect(screen.getByText("ML Recommended Time")).toBeTruthy();
  expect(screen.getByText("Partial Failure Broadcast")).toBeTruthy();
  expect(screen.getByText("Rate limited by X API")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Post Now/i }));
  await waitFor(() => expect(publishNowMutateAsync).toHaveBeenCalledWith("post-1"));

  fireEvent.click(screen.getByRole("button", { name: /Retry Failed/i }));
  await waitFor(() => expect(retryMutateAsync).toHaveBeenCalledWith("post-2"));
});

test("DashboardPage renders clear error alert and retries on profile load failure", async () => {
  const spy = vi
    .spyOn(authApi, "getProfile")
    .mockRejectedValueOnce(new Error("Network error"))
    .mockResolvedValueOnce({
      message: "ok",
      status: 200,
      data: {
        id: "u1",
        email: "founder@example.com",
        name: "Krishna",
        isOnboarded: true,
        isUserPremium: false,
        onboardingCompleted: true,
        companyName: "Market Aura",
        industry: "SaaS",
        brandVoice: { tone: "Bold" },
        platforms: ["twitter"],
        credits: { remaining: 9, used: 1, total: 10 },
      },
    });

  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByText(/Failed to load dashboard/i)).toBeTruthy();
    expect(screen.getByText(/Network error/i)).toBeTruthy();
  });

  fireEvent.click(screen.getByRole("button", { name: /^Retry$/i }));
  await waitFor(() => {
    expect(screen.getByText(/Welcome back, Krishna/i)).toBeTruthy();
  });
  spy.mockRestore();
});

test("PublishSchedulePanel falls back to manual_broadcast with explicit content when given a synthetic legacy ID", async () => {
  createPostMutateAsync.mockResolvedValue({
    message: "Published immediately",
    post: {
      _id: "post-legacy-1",
      status: "published",
      platforms: [{ platform: "email", status: "published" }],
    },
  });

  render(
    <MemoryRouter>
      <PublishSchedulePanel
        jobId="legacy-0"
        title="Email Newsletter"
        content={{
          email: { subject: "Hidden Gems", body: "Visit Gokarna and Chopta!" },
        }}
      />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("button", { name: /Post Now/i }));

  await waitFor(() => {
    expect(createPostMutateAsync).toHaveBeenCalledTimes(1);
    const payload = createPostMutateAsync.mock.calls[0][0];
    expect(payload.sourceType).toBe("manual_broadcast");
    expect(payload.jobId).toBeUndefined();
    expect(payload.platforms).toEqual([
      expect.objectContaining({
        platform: "email",
        content: { subject: "Hidden Gems", body: "Visit Gokarna and Chopta!" },
      }),
    ]);
  });
});
