import { apiClient } from "@/lib/api/client";

import type { OnboardingRequest, OnboardingResponse } from "../types/onboarding.types";

const ONBOARDING_PATH = "/v1/auth/onboarding";

export async function completeOnboarding(request: OnboardingRequest): Promise<OnboardingResponse> {
  const response = await apiClient.post<OnboardingResponse>(ONBOARDING_PATH, request);

  return response.data;
}
