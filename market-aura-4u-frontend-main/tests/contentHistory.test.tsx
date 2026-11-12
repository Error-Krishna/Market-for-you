// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ContentHistoryPage from "../src/pages/app/ContentHistoryPage";

const historyHooks = vi.hoisted(() => ({ useContentHistory: vi.fn(), fetchNextPage: vi.fn() }));
vi.mock("@/features/content", () => ({ useContentHistory: historyHooks.useContentHistory }));

const defaultHookResult = () => ({
  isLoading: false,
  error: null,
  data: { pages: [{ jobs: [] }] },
  fetchNextPage: historyHooks.fetchNextPage,
  hasNextPage: false,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  historyHooks.useContentHistory.mockReturnValue(defaultHookResult());
});
afterEach(cleanup);

test("history renders saved content, carousel slides, and available ML recommendation data", () => {
  historyHooks.useContentHistory.mockReturnValue({
    ...defaultHookResult(),
    data: {
      pages: [
        {
          jobs: [
            {
              id: "job-1",
              userId: "user-1",
              status: "completed",
              platforms: ["instagram"],
              originalContent: "Launch our product",
              createdAt: "2026-10-01T12:00:00.000Z",
              generatedContent: {
                instagram: {
                  caption: "A saved launch caption #creators",
                  content_type: "carousel",
                  slides: [{ slide_number: 1, headline: "Meet us", body: "Made for creators." }],
                },
                grounding: {
                  isGrounded: true,
                  recommendation: {
                    recommended_content_type: { value: "carousel" },
                    predicted_engagement: { value: 0.08 },
                    recommended_hashtags: ["#creators", "#makeuponpoint"],
                  },
                },
              },
            },
          ],
        },
      ],
    },
  });

  render(<ContentHistoryPage />);
  expect(screen.getByText("Launch our product")).toBeTruthy();
  expect(screen.getByText("A saved launch caption #creators")).toBeTruthy();
  expect(screen.getByText("Meet us")).toBeTruthy();
  expect(screen.getByText("Made for creators.")).toBeTruthy();
  expect(screen.getByText("8.00%")).toBeTruthy();
  const guidance = screen.getByRole("region", { name: "ML recommendation grounding" });
  expect(within(guidance).queryByText("Suggested hashtags")).toBeNull();
  expect(within(guidance).queryByText(/#creators|#makeuponpoint/)).toBeNull();
  expect(screen.queryByText("#makeuponpoint")).toBeNull();
});

test("legacy content without grounding metadata remains readable", () => {
  historyHooks.useContentHistory.mockReturnValue({
    ...defaultHookResult(),
    data: {
      pages: [
        {
          jobs: [
            {
              _id: "legacy-1",
              status: "completed",
              generatedContent: { linkedin: ["Saved LinkedIn copy"] },
            },
          ],
        },
      ],
    },
  });

  render(<ContentHistoryPage />);
  expect(screen.getByText("Saved LinkedIn copy")).toBeTruthy();
  expect(screen.getByText("Prompt unavailable")).toBeTruthy();
  expect(screen.getByText("Date unavailable")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "ML recommendation grounding" })).toBeNull();
});

test("ungrounded history displays the recommendation fallback status", () => {
  historyHooks.useContentHistory.mockReturnValue({
    ...defaultHookResult(),
    data: {
      pages: [
        {
          jobs: [
            {
              id: "job-2",
              status: "completed",
              generatedContent: {
                grounding: {
                  isGrounded: false,
                  recommendation: null,
                  reason: "Recommender offline",
                },
              },
            },
          ],
        },
      ],
    },
  });

  render(<ContentHistoryPage />);
  expect(
    screen.getByText("This content was generated without ML recommendation guidance."),
  ).toBeTruthy();
  expect(screen.getByText("Recommender offline")).toBeTruthy();
});

test("malformed legacy records are skipped or rendered with safe fallbacks", () => {
  historyHooks.useContentHistory.mockReturnValue({
    ...defaultHookResult(),
    data: {
      pages: [
        {
          jobs: [
            null,
            "bad record",
            {
              id: "broken",
              status: "unexpected",
              createdAt: "invalid date",
              platforms: [null, 7],
              generatedContent: {
                instagram: null,
                twitter: [null, { text: "Valid saved tweet" }],
                grounding: { isGrounded: "yes", recommendation: { recommended_hashtags: "bad" } },
              },
            },
          ],
        },
      ],
    },
  });

  render(<ContentHistoryPage />);
  expect(screen.getByText("Valid saved tweet")).toBeTruthy();
  expect(screen.getByText("unknown")).toBeTruthy();
  expect(screen.getByText("Date unavailable")).toBeTruthy();
  expect(screen.getAllByText("Prompt unavailable")).toHaveLength(1);
  expect(screen.queryByRole("region", { name: "ML recommendation grounding" })).toBeNull();
});

test("empty history and loading states are clear", () => {
  historyHooks.useContentHistory.mockReturnValueOnce({
    ...defaultHookResult(),
    isLoading: true,
    data: undefined,
  });
  const loading = render(<ContentHistoryPage />);
  expect(screen.getByRole("status", { name: "Loading content history" })).toBeTruthy();
  loading.unmount();

  historyHooks.useContentHistory.mockReturnValue(defaultHookResult());
  render(<ContentHistoryPage />);
  expect(screen.getByText("You haven't generated any content yet.")).toBeTruthy();
});

test("history backend failures including unauthorized responses show a safe error state", () => {
  historyHooks.useContentHistory.mockReturnValue({
    ...defaultHookResult(),
    error: Object.assign(new Error("Unauthorized"), { response: { status: 401 } }),
    data: undefined,
  });

  render(<ContentHistoryPage />);
  expect(screen.getByRole("alert").textContent).toBe("Failed to load history.");
});

test("Load more keeps loaded entries, requests another page, and avoids duplicate jobs", async () => {
  const fetchNextPage = vi.fn().mockResolvedValue(undefined);
  historyHooks.useContentHistory.mockReturnValue({
    ...defaultHookResult(),
    data: {
      pages: [
        { jobs: [{ id: "job-1", status: "completed", originalContent: "First prompt" }] },
        {
          jobs: [
            { id: "job-1", status: "completed", originalContent: "Duplicate prompt" },
            { id: "job-2", status: "completed", originalContent: "Second prompt" },
          ],
        },
      ],
    },
    fetchNextPage,
    hasNextPage: true,
  });

  render(<ContentHistoryPage />);
  expect(screen.getByText("First prompt")).toBeTruthy();
  expect(screen.getByText("Second prompt")).toBeTruthy();
  expect(screen.queryByText("Duplicate prompt")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  await waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(1));
});

test("next-page failures retain loaded content and offer retry", () => {
  historyHooks.useContentHistory.mockReturnValue({
    ...defaultHookResult(),
    data: {
      pages: [{ jobs: [{ id: "job-1", status: "completed", originalContent: "Still here" }] }],
    },
    hasNextPage: true,
    isFetchNextPageError: true,
  });

  render(<ContentHistoryPage />);
  expect(screen.getByText("Still here")).toBeTruthy();
  expect(screen.getByRole("alert").textContent).toMatch(/Failed to load more history/);
  expect(screen.getByRole("button", { name: "Retry loading more" })).toBeTruthy();
});
