import { Link, useLocation } from "react-router-dom";
import { LogOut, Moon, PanelLeftClose, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth";
import { useTheme } from "@/features/theme";
import { navItems } from "./nav-items";

interface SidebarProps {
  open?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

function SidebarNavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { logout } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();

  return (
    <div className="flex h-full flex-col justify-between">
      <nav className="flex-1 space-y-1 px-3 py-4">
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
            <Icon className="size-5 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-border/50 p-4 space-y-2">
        <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-surface/30 border border-border/40">
          <span className="text-xs text-text-secondary font-medium">Theme</span>
          <button
            type="button"
            onClick={() => setTheme(effectiveTheme === "dark" ? "light" : "dark")}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-text-secondary hover:text-text hover:bg-surface transition"
            aria-label="Toggle theme"
          >
            {effectiveTheme === "dark" ? (
              <>
                <Sun className="size-3.5 text-orange-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="size-3.5 text-primary" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-text-secondary transition hover:bg-surface hover:text-text"
        >
          <LogOut className="size-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export function Sidebar({
  open = true,
  onToggleCollapse,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Static Desktop Sidebar */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r border-border/50 bg-surface/20 backdrop-blur-lg lg:flex transition-all duration-300 ease-in-out select-none",
          open
            ? "w-64 opacity-100"
            : "w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-xl font-bold truncate">
            <span className="gradient-text">Market Aura</span>
          </Link>
          {onToggleCollapse && (
            <button
              type="button"
              aria-label="Close navigation"
              title="Close navigation"
              onClick={onToggleCollapse}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-text transition"
            >
              <PanelLeftClose className="size-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNavContent />
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex h-screen w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-6">
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

            <div className="flex-1 overflow-y-auto">
              <SidebarNavContent onNavigate={onClose} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
