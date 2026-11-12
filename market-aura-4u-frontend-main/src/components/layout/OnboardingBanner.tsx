import { ArrowRight, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/features/auth/hooks/use-auth";

export default function OnboardingBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.isOnboarded || dismissed) {
    return null;
  }

  return (
    <div className="border-b border-primary/20 bg-primary-soft">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">Complete your workspace setup</p>

          <p className="text-xs text-text-secondary">
            Add your brand details to get personalized AI-generated content.
          </p>
        </div>

        <Link
          to="/onboarding"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          Complete setup
          <ArrowRight className="size-4" />
        </Link>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss onboarding reminder"
          className="shrink-0 rounded-md p-1.5 text-text-muted transition hover:bg-black/5 hover:text-text"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
