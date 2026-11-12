import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  getProfile,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
} from "@/features/auth/api/auth-api";

import type { AuthUser, LoginRequest, SignupRequest } from "../types/auth.types";

import { AuthContext } from "./auth-context";

const TOKEN_KEY = "market-aura-auth-token";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(localStorage.getItem(TOKEN_KEY));
  });

  /**
   * Fetch the authenticated user's latest profile.
   *
   * This is important because onboarding status can change
   * after the user completes onboarding.
   */
  const refreshProfile = useCallback(async () => {
    try {
      const response = await getProfile();

      setUser({
        id: response.data.id,
        email: response.data.email,
        isOnboarded: response.data.isOnboarded,
        isPremium: response.data.isPremium,
      });
    } catch (error) {
      console.error("Failed to refresh authentication profile:", error);

      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  /**
   * Restore authentication state when the application starts.
   */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return;
    }

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        await refreshProfile();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshProfile]);

  /**
   * Login.
   */
  const login = useCallback(async (request: LoginRequest) => {
    const response = await loginRequest(request);

    localStorage.setItem(TOKEN_KEY, response.token);

    setUser({
      id: response.data.id,
      email: response.data.email,
      isOnboarded: response.data.isOnboarded,
      isPremium: response.data.isPremium,
    });

    return {
      id: response.data.id,
      email: response.data.email,
      isOnboarded: response.data.isOnboarded,
      isPremium: response.data.isPremium,
    };
  }, []);

  /**
   * Signup.
   */
  const signup = useCallback(async (request: SignupRequest) => {
    const response = await signupRequest(request);

    localStorage.setItem(TOKEN_KEY, response.token);

    setUser({
      id: response.data.id,
      email: response.data.email,
      isOnboarded: response.data.isOnboarded,
      isPremium: response.data.isPremium,
    });

    return {
      id: response.data.id,
      email: response.data.email,
      isOnboarded: response.data.isOnboarded,
      isPremium: response.data.isPremium,
    };
  }, []);

  /**
   * Logout.
   */
  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
      refreshProfile,
    }),
    [user, isLoading, login, signup, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
