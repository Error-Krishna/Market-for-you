import { useMutation } from "@tanstack/react-query";

import { completeOnboarding } from "../api/onboarding-api";

export function useOnboarding() {
  return useMutation({
    mutationFn: completeOnboarding,
  });
}
