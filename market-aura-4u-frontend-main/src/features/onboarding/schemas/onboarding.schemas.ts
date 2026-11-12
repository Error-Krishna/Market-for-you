import { z } from "zod";

import { ONBOARDING_INDUSTRIES, ONBOARDING_PLATFORMS } from "../types/onboarding.types";

export const onboardingSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  industry: z.enum(ONBOARDING_INDUSTRIES, {
    message: "Select an industry",
  }),
  brandTone: z.string().trim().min(1, "Brand tone is required"),
  uvp: z.string().trim().min(1, "Unique value proposition is required"),
  targetAudience: z.string().trim().min(1, "Target audience is required"),
  platforms: z.array(z.enum(ONBOARDING_PLATFORMS)).min(1, "Select at least one platform"),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
