import { Link, Outlet } from "react-router-dom";
import { Sparkles } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <header className="flex h-16 items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
            <Sparkles className="size-4" />
          </span>

          <span>Market Aura</span>
        </Link>
      </header>

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
