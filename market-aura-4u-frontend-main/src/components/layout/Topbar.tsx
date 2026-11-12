import { Bell, Menu, PanelLeft, PanelLeftClose } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth";
import { navItems } from "./nav-items";

interface TopbarProps {
  onMenuClick: () => void;
  sidebarOpen?: boolean;
}

export function Topbar({ onMenuClick, sidebarOpen = true }: TopbarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const currentNav = navItems.find((item) => item.to === location.pathname);
  const pageTitle = currentNav?.label ?? "Workspace";
  const initialSource = (user?.name || user?.email || "M").trim();
  const avatarInitial = initialSource.charAt(0).toUpperCase() || "M";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          title={sidebarOpen ? "Close navigation" : "Open navigation"}
          className="rounded-lg p-2 text-text-secondary transition hover:bg-surface hover:text-text"
          onClick={onMenuClick}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="size-5 hidden lg:block" />
          ) : (
            <PanelLeft className="size-5 hidden lg:block" />
          )}
          <Menu className="size-5 lg:hidden" />
        </button>

        <div>
          <p className="text-sm font-semibold text-text">{pageTitle}</p>
          <p className="text-xs text-text-muted hidden sm:block">
            Market Aura content &amp; publishing studio
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Link
          to="/posts/scheduled"
          aria-label="Scheduled posts queue"
          className="relative rounded-lg p-2.5 text-text-secondary transition hover:bg-surface hover:text-text"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
        </Link>

        <Link
          to="/settings"
          title={user?.email ? `${user.email} (Settings)` : "Settings"}
          className="ml-2 flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white transition hover:ring-2 hover:ring-primary/40"
        >
          {avatarInitial}
        </Link>
      </div>
    </header>
  );
}
