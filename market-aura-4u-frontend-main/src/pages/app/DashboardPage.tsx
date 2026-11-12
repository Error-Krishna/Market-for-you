import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Settings,
  Share2,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { getProfile } from "@/features/auth/api/auth-api";
import type { ProfileResponse } from "@/features/auth/types/auth.types";
import { extractApiErrorMessage } from "@/lib/api/error-message";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [quickPrompt, setQuickPrompt] = useState("");

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

  const creditPercent =
    profile.credits.total > 0
      ? Math.round((profile.credits.remaining / profile.credits.total) * 100)
      : 0;

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPrompt.trim()) {
      navigate(`/content/create?prompt=${encodeURIComponent(quickPrompt.trim())}`);
    } else {
      navigate("/content/create");
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Hero Greeting */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-surface via-surface/80 to-primary/5 p-6 sm:p-8 backdrop-blur-md shadow-sm">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3" />
              <span>AI Content Engine Ready</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-text">
              Welcome back{profile.name ? `, ${profile.name}` : ""}
            </h1>
            <p className="text-sm sm:text-base text-text-secondary max-w-xl">
              {profile.companyName
                ? `Managing brand presence for ${profile.companyName}. Craft cross-platform marketing content in seconds.`
                : "Your central command center for multi-platform content generation, scheduling, and analytics."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/content/create">
              <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>
                Create New Content
              </Button>
            </Link>
            <Link to="/settings">
              <Button size="lg" variant="outline" leftIcon={<Settings className="size-4" />}>
                Workspace Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick studio prompt launcher */}
        <form
          onSubmit={handleQuickCreate}
          className="relative z-10 mt-6 pt-6 border-t border-border/40"
        >
          <label
            htmlFor="dashboard-prompt"
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2"
          >
            Quick Generation Studio
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
              <input
                id="dashboard-prompt"
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="e.g. Announce our upcoming spring launch across all channels..."
                className="w-full rounded-xl border border-border bg-background/80 pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <Button type="submit" variant="secondary" className="shrink-0">
              Launch Studio
            </Button>
          </div>
        </form>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Credits Metric Card */}
        <div className="glass-card rounded-2xl border border-border/60 bg-surface/50 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Credits Remaining
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Zap className="size-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-text">
              {profile.credits.remaining}
            </span>
            <span className="text-xs font-medium text-text-muted">
              / {profile.credits.total} total
            </span>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, creditPercent))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-text-muted">
              {profile.credits.used} generation{profile.credits.used === 1 ? "" : "s"} performed
              this cycle
            </p>
          </div>
        </div>

        {/* Subscription Plan Card */}
        <div className="glass-card rounded-2xl border border-border/60 bg-surface/50 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Plan Status
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-3xl font-extrabold tracking-tight text-text">
                {profile.isUserPremium ? "Premium" : "Free"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {profile.isUserPremium ? "Active Pro subscription" : "Standard starter tier"}
              </p>
            </div>
            <Link
              to="/settings"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-bright transition"
            >
              {profile.isUserPremium ? "Manage" : "Upgrade"}
            </Link>
          </div>
          <p className="mt-4 text-xs text-text-muted border-t border-border/40 pt-3">
            {profile.isUserPremium
              ? "Unlimited high-speed generation queue"
              : "Top up credits in Settings"}
          </p>
        </div>

        {/* Channels Configured Card */}
        <div className="glass-card rounded-2xl border border-border/60 bg-surface/50 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Active Platforms
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-text">
              {profile.platforms.length}
            </span>
            <span className="text-xs font-medium text-text-muted">channels configured</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
            {profile.platforms.length > 0 ? (
              profile.platforms.slice(0, 4).map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize"
                >
                  <CheckCircle2 className="size-3" />
                  {p}
                </span>
              ))
            ) : (
              <span className="text-xs text-text-muted">No channels connected yet</span>
            )}
            {profile.platforms.length > 4 && (
              <span className="rounded-md bg-surface-bright px-2 py-0.5 text-xs text-text-muted">
                +{profile.platforms.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Brand Profile & Platform Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Brand Intelligence Card */}
        <div className="glass-card rounded-2xl border border-border/60 bg-surface/50 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div>
              <h2 className="text-base font-semibold text-text">Brand Intelligence</h2>
              <p className="text-xs text-text-muted">
                Audience and tone guidance applied to all AI generations
              </p>
            </div>
            <Link to="/settings" className="text-xs font-medium text-primary hover:underline">
              Edit in Settings
            </Link>
          </div>

          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-border/40 bg-surface-bright/40 p-3">
              <dt className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Company
              </dt>
              <dd className="mt-1 font-medium text-text truncate">{profile.companyName || "—"}</dd>
            </div>
            <div className="rounded-xl border border-border/40 bg-surface-bright/40 p-3">
              <dt className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Industry
              </dt>
              <dd className="mt-1 font-medium text-text truncate">{profile.industry || "—"}</dd>
            </div>
            <div className="rounded-xl border border-border/40 bg-surface-bright/40 p-3">
              <dt className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Brand Voice
              </dt>
              <dd className="mt-1 font-medium text-text truncate">
                {profile.brandVoice?.tone || "Professional"}
              </dd>
            </div>
            <div className="rounded-xl border border-border/40 bg-surface-bright/40 p-3">
              <dt className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Marketing Goal
              </dt>
              <dd className="mt-1 font-medium text-text truncate">
                {profile.marketingGoal || "Growth & Engagement"}
              </dd>
            </div>
          </dl>

          {profile.brandVoice?.description && (
            <div className="mt-4 rounded-xl border border-border/40 bg-surface-bright/20 p-3 text-xs text-text-secondary">
              <span className="font-semibold text-text">Voice Guidelines: </span>
              {profile.brandVoice.description}
            </div>
          )}
        </div>

        {/* Quick Launchpad & Workflows */}
        <div className="glass-card rounded-2xl border border-border/60 bg-surface/50 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div>
              <h2 className="text-base font-semibold text-text">Workflow Launchpad</h2>
              <p className="text-xs text-text-muted">Jump straight into production operations</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/content/create"
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-surface-bright/40 p-3.5 hover:border-primary/40 hover:bg-surface-bright/80 transition"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition">
                <FileText className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition">
                  Content Studio
                </p>
                <p className="text-xs text-text-muted">Multi-platform AI drafting</p>
              </div>
            </Link>

            <Link
              to="/history"
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-surface-bright/40 p-3.5 hover:border-primary/40 hover:bg-surface-bright/80 transition"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-hover:scale-105 transition">
                <History className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition">
                  Content History
                </p>
                <p className="text-xs text-text-muted">Past jobs &amp; grounding data</p>
              </div>
            </Link>

            <Link
              to="/scheduled-posts"
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-surface-bright/40 p-3.5 hover:border-primary/40 hover:bg-surface-bright/80 transition"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 group-hover:scale-105 transition">
                <Calendar className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition">
                  Scheduled Queue
                </p>
                <p className="text-xs text-text-muted">Automated broadcast timings</p>
              </div>
            </Link>

            <Link
              to="/social-accounts"
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-surface-bright/40 p-3.5 hover:border-primary/40 hover:bg-surface-bright/80 transition"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-105 transition">
                <Share2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition">
                  Connected Channels
                </p>
                <p className="text-xs text-text-muted">OAuth &amp; Webhook status</p>
              </div>
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-border/40 bg-surface-bright/20 px-4 py-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" />
              Server Timezone: <strong className="text-text">UTC</strong>
            </span>
            <Link to="/social-accounts" className="text-primary hover:underline">
              Adjust Timezone
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
