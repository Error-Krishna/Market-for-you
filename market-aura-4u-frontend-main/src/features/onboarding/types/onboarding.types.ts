export const ONBOARDING_PLATFORMS = [
  "twitter",
  "linkedin",
  "instagram",
  "facebook",
  "email",
  "blog",
] as const;

export type OnboardingPlatform = (typeof ONBOARDING_PLATFORMS)[number];

export const ONBOARDING_INDUSTRIES = [
  "Beauty",
  "Family",
  "Fashion",
  "Fitness",
  "Food",
  "Interior",
  "Pet",
  "Travel",
] as const;

export type OnboardingIndustry = (typeof ONBOARDING_INDUSTRIES)[number];

export interface OnboardingRequest {
  companyName: string;
  industry: string;
  brandTone: string;
  uvp: string;
  targetAudience: string;
  platforms: OnboardingPlatform[];
}

export interface OnboardingResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name?: string;
    email: string;
    onboardingCompleted: boolean;
    isPremium: boolean;
    credits: {
      monthly: number;
      used: number;
    };
    brandProfile: {
      companyName: string;
      industry: string;
      uvp: string;
      targetAudience: string;
      marketingGoal: string;
      brandVoice: {
        tone: string;
        description: string;
      };
      platforms: OnboardingPlatform[];
    };
  };
}
