import { ApiError, normalizeApiError } from "@/lib/api/errors";

export function generationErrorMessage(error: unknown): string {
  const { status, details } = error instanceof ApiError ? error : normalizeApiError(error);
  // Render fixed copy, never raw provider messages, response bodies or stacks.
  switch (details?.code) {
    case "GENERATION_IN_PROGRESS":
      return "Content is already being generated. Wait for it to finish, then check Content History.";
    case "GENERATION_RATE_LIMIT":
      return "You've reached the generation limit. Please wait before trying again.";
    case "GENERATION_CAPACITY":
      return "Generation is busy right now. Please try again later.";
    case "GENERATION_TIMEOUT":
      return "Generation took too long. Check Content History before trying again.";
    case "INVALID_BRAND_PROFILE":
      return "Your brand profile is incomplete. Complete onboarding before generating content.";
    case "INVALID_GENERATION_INPUT":
      return "Enter a prompt between 5 and 5000 characters.";
    case "GENERATION_FAILED":
      return "We couldn't generate complete content. Please try again later. Your prompt has been kept.";
  }
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You can't generate content yet. Check your account and onboarding.";
  if (status === 429) return "Too many requests. Please wait before trying again.";
  if (status === 504 || status === 0)
    return "We couldn't confirm generation completed. Check your connection and Content History before trying again.";
  return "We couldn't generate content. Please try again later. Your prompt has been kept.";
}
