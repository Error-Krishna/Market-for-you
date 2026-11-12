// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CreateContentPage from "../src/pages/app/CreateContentPage";

const contentHooks = vi.hoisted(() => ({
  useGenerateContent: vi.fn(),
  mutateAsync: vi.fn(),
}));
vi.mock("@/features/content", () => ({
  useGenerateContent: contentHooks.useGenerateContent,
}));

beforeEach(() => {
  vi.clearAllMocks();
  contentHooks.useGenerateContent.mockReturnValue({
    mutateAsync: contentHooks.mutateAsync,
    isPending: false,
    isError: false,
    isSuccess: true,
  });
});
afterEach(cleanup);

test("generated results render Facebook and Blog text and tolerate malformed legacy entries", async () => {
  await showResult({
    facebook: ["A useful Facebook announcement", null, {}, ""],
    blog: ["A concise blog draft"],
  });
  expect(screen.getByText("Facebook")).toBeTruthy();
  expect(screen.getByText("A useful Facebook announcement")).toBeTruthy();
  expect(screen.getByText("Blog")).toBeTruthy();
  expect(screen.getByText("A concise blog draft")).toBeTruthy();
  expect(screen.queryByText("[object Object]")).toBeNull();
});

async function showResult(generatedContent: Record<string, unknown>) {
  contentHooks.mutateAsync.mockResolvedValue({ job: { generatedContent } });
  render(<CreateContentPage />);
  fireEvent.change(screen.getByLabelText("Your Idea / Prompt"), {
    target: { value: "Create a launch post" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generate Content" }));
  await waitFor(() => expect(screen.getByText("Generated Content")).toBeTruthy());
}

test("generated results show ML recommendation details and Instagram carousel slides", async () => {
  await showResult({
    instagram: {
      caption: "A launch caption",
      content_type: "carousel",
      slides: [
        { slide_number: 1, headline: "Meet the product", body: "Built for busy teams." },
        { slide_number: 2, headline: "Why it helps", body: "Save time each week." },
        { slide_number: 3, headline: "Get started", body: "Try it today." },
      ],
    },
    grounding: {
      isGrounded: true,
      recommendation: {
        recommended_content_type: { value: "carousel" },
        predicted_engagement: { value: 0.125, label: "Estimated" },
        recommended_posting_time: {
          day: "Thursday",
          start: "06:00",
          end: "07:00",
          timezone: "UTC",
        },
        recommended_hashtags: ["#launch", "#smallbusiness"],
      },
    },
  });

  expect(screen.getByText("This content was guided by the ML recommender.")).toBeTruthy();
  expect(screen.getByText("Suggested format").parentElement?.textContent).toContain("carousel");
  expect(screen.getByText("Recommended posting time").parentElement?.textContent).toContain(
    "Thursday, 06:00 – 07:00 (UTC)",
  );
  expect(screen.getByText("12.50% (Estimated)")).toBeTruthy();
  const guidance = screen.getByRole("region", { name: "ML recommendation grounding" });
  expect(within(guidance).queryByText("Suggested hashtags")).toBeNull();
  expect(within(guidance).queryByText("#launch")).toBeNull();
  expect(screen.getByRole("region", { name: "Instagram carousel slides" })).toBeTruthy();
  expect(screen.getByText("Meet the product")).toBeTruthy();
  expect(screen.getByText("Save time each week.")).toBeTruthy();
});

test("guidance hides raw hashtags without changing metadata or generated caption hashtags", async () => {
  const content = {
    instagram: { caption: "A useful launch caption #launch", content_type: "image" },
    grounding: {
      isGrounded: true,
      recommendation: {
        recommended_format: "image",
        engagement_prediction: { predicted_likes: 42 },
        recommended_hashtags: ["#launch", "#eyebrows"],
      },
    },
  };
  const original = structuredClone(content);
  Object.freeze(content.grounding.recommendation.recommended_hashtags);
  Object.freeze(content.grounding.recommendation);
  Object.freeze(content.grounding);
  Object.freeze(content);

  await showResult(content);

  const guidance = screen.getByRole("region", { name: "ML recommendation grounding" });
  expect(within(guidance).queryByText("Suggested hashtags")).toBeNull();
  expect(within(guidance).queryByText(/#launch|#eyebrows/)).toBeNull();
  expect(within(guidance).getByText("image")).toBeTruthy();
  expect(within(guidance).getByText("42")).toBeTruthy();
  expect(screen.getByText("A useful launch caption #launch")).toBeTruthy();
  expect(screen.queryByText("#eyebrows")).toBeNull();
  expect(content).toEqual(original);
});

test("ungrounded results explain the fallback and tolerate missing recommendation data", async () => {
  await showResult({
    instagram: { caption: "Fallback caption", content_type: "image" },
    grounding: { isGrounded: false, recommendation: null, reason: "Recommender unavailable" },
  });

  expect(
    screen.getByText("This content was generated without ML recommendation guidance."),
  ).toBeTruthy();
  expect(screen.getByText("Recommender unavailable")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Instagram carousel slides" })).toBeNull();
  expect(screen.queryByText("Suggested format")).toBeNull();
});
