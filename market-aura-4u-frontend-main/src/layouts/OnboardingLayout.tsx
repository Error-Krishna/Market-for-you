import { Outlet } from "react-router-dom";

export default function OnboardingLayout() {
  return (
    <div className="min-h-screen bg-background text-text">
      <Outlet />
    </div>
  );
}
