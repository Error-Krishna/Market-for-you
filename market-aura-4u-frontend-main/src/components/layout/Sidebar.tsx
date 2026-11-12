import { Link, useLocation } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth";
import { navItems } from "./nav-items";

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

function SidebarNavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <>
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
              location.pathname === to
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-text-secondary hover:bg-surface hover:text-text",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border/50 p-4">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-text-secondary transition hover:bg-surface hover:text-text"
        >
          <LogOut className="size-5" />
          Logout
        </button>
      </div>
    </>
  );
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/50 bg-surface/20 backdrop-blur-lg lg:flex">
        <div className="flex h-16 items-center border-b border-border/50 px-6">
          <Link to="/dashboard" className="flex items-center gap-2 text-xl font-bold">
            <span className="gradient-text">Market Aura</span>
          </Link>
        </div>

        <SidebarNavContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border/50 px-6">
              <Link
                to="/dashboard"
                onClick={onClose}
                className="flex items-center gap-2 text-xl font-bold"
              >
                <span className="gradient-text">Market Aura</span>
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-text"
              >
                <X className="size-5" />
              </button>
            </div>

            <SidebarNavContent onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
