import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Building2,
  Check,
  CreditCard,
  Laptop,
  Moon,
  Palette,
  Share2,
  Shield,
  Sun,
  User,
  Zap,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useTheme, type ThemeMode } from "@/features/theme";
import {
  useSettings,
  useUpdateProfile,
  useUpdateBrand,
  useChangePassword,
  type BrandSettings,
} from "@/features/settings";
import { useSocialStatus } from "@/features/social-accounts";

type SettingsTab =
  | "profile"
  | "brand"
  | "appearance"
  | "social"
  | "notifications"
  | "security"
  | "billing"
  | "usage";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { data: settings, isLoading, isError, refetch } = useSettings();
  const { data: socialStatus } = useSocialStatus();
  const { theme, setTheme } = useTheme();

  const updateProfile = useUpdateProfile();
  const updateBrand = useUpdateBrand();
  const changePassword = useChangePassword();

  // Toast / feedback message states
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Profile form state
  const [nameInput, setNameInput] = useState("");
  const [nameInitialized, setNameInitialized] = useState(false);
  if (settings?.profile?.name && !nameInitialized) {
    setNameInput(settings.profile.name);
    setNameInitialized(true);
  }

  // Password change form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Brand form state
  const [brandForm, setBrandForm] = useState<Partial<BrandSettings>>({});
  const [brandInitialized, setBrandInitialized] = useState(false);
  if (settings?.brand && !brandInitialized) {
    setBrandForm(settings.brand);
    setBrandInitialized(true);
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({ name: nameInput });
      showFeedback("success", "Profile updated successfully.");
    } catch {
      showFeedback("error", "Failed to update profile. Please try again.");
    }
  };

  const handleBrandSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBrand.mutateAsync(brandForm);
      showFeedback("success", "Brand intelligence settings updated.");
    } catch {
      showFeedback("error", "Failed to update brand settings.");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showFeedback("error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 10) {
      showFeedback("error", "New password must be at least 10 characters.");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showFeedback("success", "Password changed successfully.");
    } catch {
      showFeedback("error", "Incorrect current password or invalid request.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="max-w-md rounded-2xl border border-danger/30 bg-danger/10 p-6 space-y-4">
        <div className="flex items-center gap-2 text-danger font-semibold">
          <AlertCircle className="size-5" />
          <span>Failed to load settings</span>
        </div>
        <p className="text-sm text-text-secondary">Unable to retrieve your workspace settings.</p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "brand", label: "Brand Profile", icon: Building2 },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "social", label: "Social Accounts", icon: Share2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "billing", label: "Subscription", icon: CreditCard },
    { id: "usage", label: "Usage & Credits", icon: Zap },
  ] as const;

  const creditPercent = Math.min(
    100,
    Math.round((settings.credits.used / Math.max(1, settings.credits.monthly)) * 100),
  );

  return (
    <div className="max-w-5xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your account preferences, brand intelligence, themes, and subscription.
        </p>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium transition-all ${
            feedback.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="size-5" />
          ) : (
            <AlertCircle className="size-5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Horizontal Tab Strip on Desktop, scrollable on mobile */}
      <div className="flex overflow-x-auto border-b border-border/60 pb-1 gap-2 no-scrollbar">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-surface hover:text-text"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Profile & Account */}
      {activeTab === "profile" && (
        <Card className="max-w-2xl space-y-6 p-6">
          <div>
            <h2 className="text-xl font-semibold">General Profile</h2>
            <p className="text-sm text-text-secondary">
              Update your personal details and how you appear in Market Aura.
            </p>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your full name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="accountEmail">Email Address</Label>
              <Input
                id="accountEmail"
                value={settings.profile.email}
                disabled
                className="mt-1 opacity-70 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-text-muted">
                Your primary registered email cannot be changed directly for security.
              </p>
            </div>

            {settings.profile.joinedAt && (
              <div className="rounded-xl border border-border/40 bg-surface/30 p-3 text-xs text-text-secondary">
                Account registered on{" "}
                <span className="font-semibold text-text">
                  {new Date(settings.profile.joinedAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 2: Brand Profile Intelligence */}
      {activeTab === "brand" && (
        <Card className="max-w-3xl space-y-6 p-6">
          <div>
            <h2 className="text-xl font-semibold">Company &amp; Brand Intelligence</h2>
            <p className="text-sm text-text-secondary">
              This context fuels every AI generation and ML recommendation to match your brand.
            </p>
          </div>

          <form onSubmit={handleBrandSave} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="companyName">Company / Brand Name</Label>
                <Input
                  id="companyName"
                  value={brandForm.companyName || ""}
                  onChange={(e) =>
                    setBrandForm((prev) => ({ ...prev, companyName: e.target.value }))
                  }
                  placeholder="e.g. Aura Marketing"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry / Niche</Label>
                <Input
                  id="industry"
                  value={brandForm.industry || ""}
                  onChange={(e) => setBrandForm((prev) => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g. B2B SaaS, Health & Wellness"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Business Description</Label>
              <textarea
                id="description"
                rows={3}
                value={brandForm.description || ""}
                onChange={(e) => setBrandForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What does your company do and what makes your products/services unique?"
                className="mt-1 w-full rounded-xl border border-border bg-surface/50 p-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <Label htmlFor="uvp">Unique Value Proposition (UVP)</Label>
              <Input
                id="uvp"
                value={brandForm.uvp || ""}
                onChange={(e) => setBrandForm((prev) => ({ ...prev, uvp: e.target.value }))}
                placeholder="e.g. All-in-one AI marketing suite that saves 15 hours per week"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="targetAudience">Target Audience Summary</Label>
              <Input
                id="targetAudience"
                value={brandForm.targetAudience || ""}
                onChange={(e) =>
                  setBrandForm((prev) => ({ ...prev, targetAudience: e.target.value }))
                }
                placeholder="e.g. Startup founders and digital marketers seeking automated social reach"
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tone">Brand Voice Tone</Label>
                <Input
                  id="tone"
                  value={brandForm.brandVoice?.tone || ""}
                  onChange={(e) =>
                    setBrandForm((prev) => ({
                      ...prev,
                      brandVoice: { ...(prev.brandVoice || {}), tone: e.target.value },
                    }))
                  }
                  placeholder="e.g. Confident, Educational, Friendly"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone (IANA)</Label>
                <Input
                  id="timezone"
                  value={brandForm.timezone || "UTC"}
                  onChange={(e) => setBrandForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  placeholder="e.g. America/New_York, Asia/Kolkata"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="marketingGoal">Primary Marketing Goal</Label>
              <Input
                id="marketingGoal"
                value={brandForm.marketingGoal || ""}
                onChange={(e) =>
                  setBrandForm((prev) => ({ ...prev, marketingGoal: e.target.value }))
                }
                placeholder="e.g. Build community and drive product waitlist signups"
                className="mt-1"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={updateBrand.isPending}>
                {updateBrand.isPending ? "Saving Brand Intelligence..." : "Save Brand Profile"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 3: Appearance & Themes */}
      {activeTab === "appearance" && (
        <Card className="max-w-2xl space-y-6 p-6">
          <div>
            <h2 className="text-xl font-semibold">Theme &amp; Appearance</h2>
            <p className="text-sm text-text-secondary">
              Customize how Market Aura looks on your devices. Preferences persist across sessions.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                mode: "light" as ThemeMode,
                label: "Light Mode",
                icon: Sun,
                desc: "Crisp & high contrast",
              },
              {
                mode: "dark" as ThemeMode,
                label: "Dark Mode",
                icon: Moon,
                desc: "Easy on the eyes",
              },
              {
                mode: "system" as ThemeMode,
                label: "System Sync",
                icon: Laptop,
                desc: "Follow OS settings",
              },
            ].map(({ mode, label, icon: Icon, desc }) => {
              const selected = theme === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTheme(mode);
                    void updateProfile.mutateAsync({ appearance: { theme: mode } });
                  }}
                  className={`flex flex-col items-start rounded-2xl border p-5 text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border bg-surface/30 hover:border-border hover:bg-surface/50"
                  }`}
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl mb-3 ${
                      selected ? "bg-primary text-white" : "bg-surface text-text-secondary"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-text">{label}</h3>
                  <p className="mt-1 text-xs text-text-secondary">{desc}</p>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border/50 bg-surface/30 p-4 text-sm text-text-secondary">
            Current active theme:{" "}
            <span className="font-semibold text-primary capitalize">{theme}</span>
          </div>
        </Card>
      )}

      {/* Tab 4: Social Accounts */}
      {activeTab === "social" && (
        <Card className="max-w-3xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Connected Social Accounts</h2>
              <p className="text-sm text-text-secondary">
                Manage OAuth connections and authorizations for multi-channel publishing.
              </p>
            </div>
            <Link to="/social-accounts">
              <Button size="sm" variant="outline" rightIcon={<ExternalLink className="size-3.5" />}>
                Manage Channels
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                platform: "Instagram Business",
                connected: socialStatus?.platforms?.instagram?.isConnected,
                details: socialStatus?.platforms?.instagram?.username
                  ? `@${socialStatus.platforms.instagram.username}`
                  : "Not connected",
              },
              {
                platform: "X / Twitter",
                connected: socialStatus?.platforms?.twitter?.isConnected,
                details: socialStatus?.platforms?.twitter?.username
                  ? `@${socialStatus.platforms.twitter.username}`
                  : "Not connected",
              },
              {
                platform: "LinkedIn",
                connected: socialStatus?.platforms?.linkedin?.isConnected,
                details: socialStatus?.platforms?.linkedin?.name || "Not connected",
              },
              {
                platform: "Facebook Page",
                connected: socialStatus?.platforms?.facebook?.isConnected,
                details: socialStatus?.platforms?.facebook?.pageName || "Not connected",
              },
            ].map((channel) => (
              <div
                key={channel.platform}
                className="flex items-center justify-between rounded-xl border border-border bg-surface/30 p-4"
              >
                <div>
                  <h3 className="font-semibold text-text">{channel.platform}</h3>
                  <p className="text-xs text-text-secondary">{channel.details}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    channel.connected
                      ? "bg-success/15 text-success"
                      : "bg-surface-muted text-text-muted"
                  }`}
                >
                  {channel.connected ? "Connected" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 5: Notifications */}
      {activeTab === "notifications" && (
        <Card className="max-w-2xl space-y-6 p-6">
          <div>
            <h2 className="text-xl font-semibold">Notification Preferences</h2>
            <p className="text-sm text-text-secondary">
              Configure how and when Market Aura notifies you about generation and publishing
              events.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface/30 p-4">
              <div>
                <h4 className="font-medium text-text">Content Generation Alerts</h4>
                <p className="text-xs text-text-secondary">
                  Receive an email whenever asynchronous generation or long batches complete.
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={settings.notifications.emailAlerts}
                onChange={(e) =>
                  void updateProfile.mutateAsync({
                    notifications: {
                      emailAlerts: e.target.checked,
                      weeklyDigest: settings.notifications.weeklyDigest,
                    },
                  })
                }
                className="size-4 accent-primary"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-surface/30 p-4">
              <div>
                <h4 className="font-medium text-text">Weekly Marketing Digest</h4>
                <p className="text-xs text-text-secondary">
                  Weekly performance recap with AI recommendations for upcoming peak posting
                  windows.
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={settings.notifications.weeklyDigest}
                onChange={(e) =>
                  void updateProfile.mutateAsync({
                    notifications: {
                      emailAlerts: settings.notifications.emailAlerts,
                      weeklyDigest: e.target.checked,
                    },
                  })
                }
                className="size-4 accent-primary"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 6: Security */}
      {activeTab === "security" && (
        <Card className="max-w-2xl space-y-6 p-6">
          <div>
            <h2 className="text-xl font-semibold">Account Security</h2>
            <p className="text-sm text-text-secondary">
              Update your password and maintain strict protection of your workspace.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 10 characters"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="mt-1"
                required
              />
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Updating Password..." : "Update Password"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 7: Subscription & Billing */}
      {activeTab === "billing" && (
        <Card className="max-w-3xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Subscription &amp; Plans</h2>
              <p className="text-sm text-text-secondary">
                View your active plan entitlements or upgrade your generation bandwidth.
              </p>
            </div>
            <Link to="/billing">
              <Button size="sm" variant="outline" rightIcon={<ExternalLink className="size-3.5" />}>
                Billing Portal
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Active Tier
                </span>
                <h3 className="text-2xl font-bold capitalize text-text">
                  {settings.billing.plan} Plan
                </h3>
              </div>
              <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success capitalize">
                {settings.billing.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              Includes {settings.credits.monthly.toLocaleString()} generation credits per monthly
              cycle.
            </p>
          </div>
        </Card>
      )}

      {/* Tab 8: Usage & Credits */}
      {activeTab === "usage" && (
        <Card className="max-w-2xl space-y-6 p-6">
          <div>
            <h2 className="text-xl font-semibold">Generation Credits &amp; Metering</h2>
            <p className="text-sm text-text-secondary">
              Monitor monthly credit usage and consumption history.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-text">
                  {settings.credits.remaining.toLocaleString()}
                </div>
                <div className="text-xs text-text-secondary">Credits remaining this cycle</div>
              </div>
              <div className="text-right text-xs text-text-secondary">
                {settings.credits.used} used of {settings.credits.monthly}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-muted border border-border">
              <div
                className="h-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-500"
                style={{ width: `${creditPercent}%` }}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
