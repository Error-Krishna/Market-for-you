import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/features/auth/hooks/use-auth";

export function PublicRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={user?.isOnboarded ? "/dashboard" : "/onboarding"} replace />;
  }

  return <Outlet />;
}
