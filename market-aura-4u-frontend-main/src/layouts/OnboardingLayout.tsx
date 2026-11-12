import { Outlet } from "react-router-dom";
import { Moon, Sparkles, Sun } from "lucide-react";
import { useTheme } from "@/features/theme";

export default function OnboardingLayout() {
  const { effectiveTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-text selection:bg-primary/20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-[400px] w-[600px] rounded-full bg-gradient-to-bl from-primary/10 to-transparent blur-3xl" />
      </div>

      <header className="flex h-16 items-center justify-between border-b border-border/60 bg-surface/70 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-2.5 font-bold tracking-tight text-text">
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/80 text-white shadow-md shadow-primary/25">
            <Sparkles className="size-4" />
          </span>
          <span className="text-base sm:text-lg">Market Aura 4U</span>
          <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Workspace Setup
          </span>
        </div>

        <button
          type="button"
          aria-label="Toggle theme"
          className="rounded-xl border border-border/60 bg-surface/60 p-2 text-text-secondary transition hover:bg-surface-bright hover:text-text"
          onClick={toggleTheme}
        >
          {effectiveTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </header>

      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="py-4 text-center text-xs text-text-muted border-t border-border/40">
        Market Aura 4U &bull; Complete onboarding to personalize content generation models
      </footer>
    </div>
  );
}
