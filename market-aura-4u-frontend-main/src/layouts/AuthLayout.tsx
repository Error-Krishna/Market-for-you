import { Link, Outlet } from "react-router-dom";
import { Moon, Sparkles, Sun } from "lucide-react";
import { useTheme } from "@/features/theme";

export default function AuthLayout() {
  const { effectiveTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-text selection:bg-primary/20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent blur-3xl" />
      </div>

      <header className="flex h-16 items-center justify-between border-b border-border/60 bg-surface/70 px-4 backdrop-blur-md sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-text">
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/80 text-white shadow-md shadow-primary/25">
            <Sparkles className="size-4" />
          </span>
          <span className="text-base sm:text-lg">Market Aura 4U</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Toggle theme"
            className="rounded-xl border border-border/60 bg-surface/60 p-2 text-text-secondary transition hover:bg-surface-bright hover:text-text"
            onClick={toggleTheme}
          >
            {effectiveTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link
            to="/"
            className="hidden sm:inline-flex text-xs font-semibold text-text-secondary hover:text-text transition"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
        <Outlet />
      </main>

      <footer className="py-4 text-center text-xs text-text-muted border-t border-border/40">
        &copy; {new Date().getFullYear()} Market Aura 4U. Enterprise AI marketing &amp; publishing
        suite.
      </footer>
    </div>
  );
}
