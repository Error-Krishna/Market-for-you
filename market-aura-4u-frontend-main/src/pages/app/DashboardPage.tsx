import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Zap, Sparkles, TrendingUp } from "lucide-react";
import { getProfile } from "@/features/auth/api/auth-api";
import type { ProfileResponse } from "@/features/auth/types/auth.types";
import { extractApiErrorMessage } from "@/lib/api/error-message";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let mounted = true;
    getProfile()
      .then((res) => {
        if (mounted) {
          setProfile(res.data);
          setLoadError(null);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setLoadError(extractApiErrorMessage(err, "Unable to load your workspace profile."));
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [retryToken]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div
        role="alert"
        className="max-w-lg rounded-2xl border border-danger/30 bg-danger/10 p-6 space-y-3"
      >
        <div className="flex items-center gap-2 text-danger font-semibold">
          <AlertCircle className="size-5" />
          <span>Failed to load dashboard</span>
        </div>
        <p className="text-sm text-text-secondary">
          {loadError || "Workspace profile data was unavailable."}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsLoading(true);
            setLoadError(null);
            setRetryToken((n) => n + 1);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const stats = [
    {
      label: "Credits Remaining",
      value: profile.credits.remaining,
      sub: `${profile.credits.used} used of ${profile.credits.total}`,
      icon: Zap,
    },
    {
      label: "Plan",
      value: profile.isUserPremium ? "Premium" : "Free",
      sub: "Current status",
      icon: Sparkles,
    },
    {
      label: "Platforms",
      value: profile.platforms.length,
      sub: "Configured",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{profile.name ? `, ${profile.name}` : ""}
          </h1>
          <p className="mt-1 text-text-secondary">
            {profile.companyName || "Your brand dashboard"}
          </p>
        </div>
        <Link to="/content/create">
          <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>
            Create New Content
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="glass-card rounded-2xl bg-surface/40 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">{label}</span>
              <Icon className="size-5 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-text-muted">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl bg-surface/40 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold">Brand Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">Company</dt>
              <dd className="font-medium">{profile.companyName || "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Industry</dt>
              <dd className="font-medium">{profile.industry || "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Brand Voice</dt>
              <dd className="font-medium">{profile.brandVoice.tone}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Marketing Goal</dt>
              <dd className="font-medium">{profile.marketingGoal || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="glass-card rounded-2xl bg-surface/40 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold">Active Platforms</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.platforms.length > 0 ? (
              profile.platforms.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
                >
                  {p}
                </span>
              ))
            ) : (
              <p className="text-text-muted">No platforms configured</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
