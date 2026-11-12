import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import OnboardingBanner from "@/components/layout/OnboardingBanner";

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const handleToggleMenu = () => {
    // If desktop (lg and above), toggle desktop sidebar collapse
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setDesktopSidebarOpen((prev) => !prev);
    } else {
      setMobileMenuOpen((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left Navigation Bar: static and non-scrollable with page content */}
      <Sidebar
        open={desktopSidebarOpen}
        onToggleCollapse={() => setDesktopSidebarOpen((prev) => !prev)}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Right Section: Only this area scrolls if content exceeds viewport */}
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden bg-background">
        <Topbar onMenuClick={handleToggleMenu} sidebarOpen={desktopSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          <OnboardingBanner />

          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
