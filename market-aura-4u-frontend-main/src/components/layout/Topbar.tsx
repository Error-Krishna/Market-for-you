import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth";
import { navItems } from "./nav-items";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const location = useLocation();
  const { user } = useAuth();

  const currentNav = navItems.find((item) => item.to === location.pathname);
  const pageTitle = currentNav?.label ?? "Workspace";
  const initialSource = (user?.name || user?.email || "M").trim();
  const avatarInitial = initialSource.charAt(0).toUpperCase() || "M";

  const toggleTheme = () => {
    const next = !dark;

    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("market-aura-theme", next ? "dark" : "light");
    setDark(next);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        aria-label="Open navigation"
        className="rounded-lg p-2 text-text-secondary hover:bg-surface-muted lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden lg:block">
        <p className="text-sm font-medium text-text">{pageTitle}</p>
        <p className="text-xs text-text-muted">Market Aura content &amp; publishing studio</p>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label="Toggle theme"
          className="rounded-lg p-2.5 text-text-secondary transition hover:bg-surface-muted hover:text-text"
          onClick={toggleTheme}
        >
          {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>

        <Link
          to="/posts/scheduled"
          aria-label="Scheduled posts queue"
          className="relative rounded-lg p-2.5 text-text-secondary transition hover:bg-surface-muted hover:text-text"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
        </Link>

        <div
          title={user?.email || "Account"}
          className="ml-2 flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
        >
          {avatarInitial}
        </div>
      </div>
    </header>
  );
}
