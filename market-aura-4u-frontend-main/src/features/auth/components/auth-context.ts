import { createContext } from "react";
import type { AuthUser, LoginRequest, SignupRequest } from "../types/auth.types";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<AuthUser>;
  signup: (request: SignupRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
