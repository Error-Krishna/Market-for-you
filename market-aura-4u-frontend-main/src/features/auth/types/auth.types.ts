export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  isOnboarded: boolean;
  isPremium?: boolean; // add this
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  status: number;
  token: string;
  data: AuthUser & {
    credits?: { remaining: number; used: number; total: number };
    companyName?: string;
    industry?: string;
    brandVoice?: { tone: string };
    marketingGoal?: string;
    platforms?: string[];
    isUserPremium?: boolean;
  };
}

export interface ProfileResponse {
  message: string;
  status: number;
  data: AuthUser & {
    name?: string;
    companyName?: string;
    industry?: string;
    brandVoice: { tone: string; description?: string };
    marketingGoal?: string;
    platforms: string[];
    credits: { remaining: number; used: number; total: number };
    isUserPremium: boolean;
    onboardingCompleted: boolean;
  };
}
