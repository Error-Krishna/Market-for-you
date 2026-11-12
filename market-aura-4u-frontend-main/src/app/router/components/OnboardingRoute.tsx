import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/features/auth/hooks/use-auth";

export function OnboardingRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
