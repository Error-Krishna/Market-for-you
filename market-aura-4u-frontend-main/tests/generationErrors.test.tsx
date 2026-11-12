// @vitest-environment jsdom
import { afterAll, afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { apiClient } from "../src/lib/api/client";
import { ApiError } from "../src/lib/api/errors";
import { generationErrorMessage } from "../src/features/content/api/generation-error";
import CreateContentPage from "../src/pages/app/CreateContentPage";

// Keep this regression suite independent of an ignored local .env file.
vi.hoisted(() => {
  vi.stubEnv("VITE_API_URL", "https://api.example.invalid/api");
});
afterAll(() => vi.unstubAllEnvs());

const sensitive = "SENSITIVE_SENTINEL provider-body Bearer credential stack";
const prompt = "Give me a scenario where a dog licks Uday";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function requestError(status: number, code?: string) {
  return Object.assign(new Error("Request failed with status code 500"), {
    isAxiosError: true,
    response: { status, data: { code, message: sensitive, error: sensitive } },
  });
}

test.each([
  [500, "GENERATION_FAILED", "We couldn't generate complete content."],
  [500, undefined, "We couldn't generate content."],
  [504, "GENERATION_TIMEOUT", "Generation took too long."],
  [429, "GENERATION_RATE_LIMIT", "You've reached the generation limit."],
  [429, "GENERATION_IN_PROGRESS", "Content is already being generated."],
  [503, "GENERATION_CAPACITY", "Generation is busy right now."],
  [400, "INVALID_BRAND_PROFILE", "Your brand profile is incomplete."],
  [400, "INVALID_GENERATION_INPUT", "Enter a prompt between 5 and 5000 characters."],
  [401, undefined, "Your session has expired."],
  [403, undefined, "You can't generate content yet."],
  [429, undefined, "Too many requests."],
  [0, undefined, "We couldn't confirm generation completed."],
] as const)(
  "HTTP %s / %s shows useful copy, keeps prompt and never retries",
  async (status, code, expected) => {
    const post = vi.spyOn(apiClient, "post").mockRejectedValue(requestError(status, code));
    // The generation hook must disable retries even if a surrounding client enables them.
    const client = new QueryClient({ defaultOptions: { mutations: { retry: 2, retryDelay: 0 } } });
    render(
      <QueryClientProvider client={client}>
        <CreateContentPage />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("Your Idea / Prompt"), { target: { value: prompt } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Content" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain(expected));
    expect(screen.getByRole("alert").textContent).not.toContain(sensitive);
    expect(screen.getByRole("alert").textContent).not.toContain("status code 500");
    expect((screen.getByLabelText("Your Idea / Prompt") as HTMLTextAreaElement).value).toBe(prompt);
    expect(screen.queryByText("Generated Content")).toBeNull();
    expect(post).toHaveBeenCalledExactlyOnceWith("/v1/content/generate", { prompt });
    client.clear();
  },
);

test("unknown exceptions and arbitrary response metadata are never displayed", () => {
  for (const error of [
    new Error(sensitive),
    { message: sensitive },
    new ApiError(sensitive, 500, { code: sensitive, message: sensitive }),
    new ApiError(sensitive, 504),
  ]) {
    const message = generationErrorMessage(error);
    expect(message).not.toContain(sensitive);
    expect(message).toMatch(/try|trying/);
  }
});

test("already normalized API errors retain their safe code mapping", () => {
  expect(generationErrorMessage(new ApiError(sensitive, 504, { code: "GENERATION_TIMEOUT" }))).toBe(
    "Generation took too long. Check Content History before trying again.",
  );
});
