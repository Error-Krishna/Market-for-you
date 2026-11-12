import type { ThemeMode } from "@/features/theme";

export interface UserProfileSettings {
  id: string;
  name: string;
  email: string;
  joinedAt?: string;
}

export interface BrandSettings {
  companyName: string;
  industry: string;
  description: string;
  uvp: string;
  targetAudience: string;
  marketingGoal: string;
  brandVoice: {
    tone: string;
    description?: string;
  };
  platforms: string[];
  timezone: string;
}

export interface AppearanceSettings {
  theme: ThemeMode;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  weeklyDigest: boolean;
}

export interface BillingSettings {
  status: string;
  plan: string;
  startDate?: string;
  isPremium: boolean;
}

export interface CreditsSettings {
  monthly: number;
  used: number;
  remaining: number;
}

export interface SettingsData {
  profile: UserProfileSettings;
  brand: BrandSettings;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  billing: BillingSettings;
  credits: CreditsSettings;
}
