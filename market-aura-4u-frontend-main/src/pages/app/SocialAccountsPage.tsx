import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Link2,
  Mail,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  useConnectBlogChannel,
  useConnectEmailChannel,
  useDisconnectSocialPlatform,
  useInitiateOAuthConnect,
  useSelectFacebookPage,
  useSocialStatus,
  useUpdateTimezone,
  type BlogProvider,
  type EmailProvider,
  type OAuthPlatform,
  type SocialPlatform,
} from "@/features/social-accounts";
import { extractApiErrorMessage } from "@/lib/api/error-message";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

interface OAuthCardMeta {
  key: OAuthPlatform;
  title: string;
  subtitle: string;
  requirements: string;
}

const OAUTH_PLATFORMS: OAuthCardMeta[] = [
  {
    key: "twitter",
    title: "X (Twitter)",
    subtitle: "Publish tweets and media posts via OAuth 2.0 PKCE.",
    requirements: "Needs TWITTER_CLIENT_ID & TWITTER_CLIENT_SECRET in backend .env.",
  },
  {
    key: "linkedin",
    title: "LinkedIn",
    subtitle: "Share member posts and links to your LinkedIn profile.",
    requirements: "Needs LINKEDIN_CLIENT_ID & LINKEDIN_CLIENT_SECRET in backend .env.",
  },
  {
    key: "instagram",
    title: "Instagram Business",
    subtitle: "Publish single-image, video, and carousel posts.",
    requirements:
      "Requires an Instagram Business/Creator account + INSTAGRAM_APP_ID & INSTAGRAM_APP_SECRET.",
  },
  {
    key: "facebook",
    title: "Facebook Page",
    subtitle: "Auto-post text and media updates to your selected Page.",
    requirements: "Requires FACEBOOK_APP_ID & FACEBOOK_APP_SECRET + Manage Pages permission.",
  },
];

export default function SocialAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: status, isLoading, isError, error, refetch } = useSocialStatus();
  const updateTimezone = useUpdateTimezone();
  const initiateOAuth = useInitiateOAuthConnect();
  const selectFbPage = useSelectFacebookPage();
  const connectEmail = useConnectEmailChannel();
  const connectBlog = useConnectBlogChannel();
  const disconnectPlatform = useDisconnectSocialPlatform();

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(() => {
    const connected = searchParams.get("connected");
    const oauthError = searchParams.get("error");
    if (connected) {
      return {
        type: "success",
        text: `${connected.toUpperCase()} account connected successfully.`,
      };
    }
    if (oauthError) {
      return { type: "error", text: `OAuth connection failed: ${oauthError}` };
    }
    return null;
  });

  const [timezoneDraft, setTimezoneDraft] = useState<string | null>(null);
  const [selectedPageDraft, setSelectedPageDraft] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);

  // Email connector state
  const [emailProvider, setEmailProvider] = useState<EmailProvider>("resend");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailFromAddress, setEmailFromAddress] = useState("");
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailApiKey, setEmailApiKey] = useState("");
  const [emailWebhookUrl, setEmailWebhookUrl] = useState("");

  // Blog connector state
  const [blogProvider, setBlogProvider] = useState<BlogProvider>("wordpress");
  const [blogSiteUrl, setBlogSiteUrl] = useState("");
  const [blogUsername, setBlogUsername] = useState("");
  const [blogPublicationId, setBlogPublicationId] = useState("");
  const [blogApiSecret, setBlogApiSecret] = useState("");

  useEffect(() => {
    if (searchParams.get("connected") || searchParams.get("error")) {
      void refetch();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);

  const timezoneInput = timezoneDraft ?? status?.timezone ?? "UTC";
  const fbStatus = status?.platforms.facebook;
  const selectedPageId = selectedPageDraft ?? fbStatus?.pageId ?? fbStatus?.pages[0]?.id ?? "";

  const openEmailForm = () => {
    const em = status?.platforms.email;
    if (em?.isConnected) {
      if (em.provider) setEmailProvider(em.provider);
      setEmailFromName(em.fromName || "");
      setEmailFromAddress(em.fromEmail || "");
      setEmailRecipients(em.defaultRecipients.join(", "));
      setEmailWebhookUrl(em.webhookUrl || "");
    }
    setShowEmailForm(true);
  };

  const openBlogForm = () => {
    const bl = status?.platforms.blog;
    if (bl?.isConnected) {
      if (bl.provider) setBlogProvider(bl.provider);
      setBlogSiteUrl(bl.siteUrl || "");
      setBlogUsername(bl.username || "");
      setBlogPublicationId(bl.publicationId || "");
    }
    setShowBlogForm(true);
  };

  const handleSaveTimezone = async (tz: string) => {
    setBanner(null);
    try {
      await updateTimezone.mutateAsync(tz);
      setTimezoneDraft(tz);
      setBanner({ type: "success", text: `Default timezone updated to ${tz}.` });
    } catch (err) {
      setBanner({
        type: "error",
        text: extractApiErrorMessage(err, "Failed to update timezone."),
      });
    }
  };

  const handleOAuthConnect = async (platform: OAuthPlatform) => {
    setBanner(null);
    try {
      const { url } = await initiateOAuth.mutateAsync(platform);
      window.location.assign(url);
    } catch (err) {
      setBanner({
        type: "error",
        text: extractApiErrorMessage(
          err,
          `Could not start ${platform} OAuth flow. Check backend OAuth credentials.`,
        ),
      });
    }
  };

  const handleDisconnect = async (platform: SocialPlatform) => {
    setBanner(null);
    try {
      await disconnectPlatform.mutateAsync(platform);
      setBanner({ type: "success", text: `${platform.toUpperCase()} disconnected.` });
    } catch (err) {
      setBanner({
        type: "error",
        text: extractApiErrorMessage(err, `Failed to disconnect ${platform}.`),
      });
    }
  };

  const handleSaveFacebookPage = async () => {
    if (!selectedPageId) return;
    setBanner(null);
    try {
      await selectFbPage.mutateAsync(selectedPageId);
      setBanner({ type: "success", text: "Facebook Page updated." });
    } catch (err) {
      setBanner({
        type: "error",
        text: extractApiErrorMessage(err, "Failed to select Facebook Page."),
      });
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const recipients = emailRecipients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await connectEmail.mutateAsync({
        provider: emailProvider,
        fromName: emailFromName.trim() || undefined,
        fromEmail: emailFromAddress.trim(),
        defaultRecipients: recipients,
        apiKey: emailApiKey.trim() || undefined,
        webhookUrl: emailProvider === "webhook" ? emailWebhookUrl.trim() : undefined,
      });
      setEmailApiKey("");
      setShowEmailForm(false);
      setBanner({ type: "success", text: "Email publishing channel saved." });
    } catch (err) {
      setBanner({
        type: "error",
        text: extractApiErrorMessage(err, "Failed to save email configuration."),
      });
    }
  };

  const handleBlogSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBanner(null);
    try {
      await connectBlog.mutateAsync({
        provider: blogProvider,
        siteUrl: blogSiteUrl.trim(),
        username: blogUsername.trim() || undefined,
        publicationId: blogPublicationId.trim() || undefined,
        apiSecret: blogApiSecret.trim() || undefined,
      });
      setBlogApiSecret("");
      setShowBlogForm(false);
      setBanner({ type: "success", text: "Blog / CMS publishing channel saved." });
    } catch (err) {
      setBanner({
        type: "error",
        text: extractApiErrorMessage(err, "Failed to save blog configuration."),
      });
    }
  };

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const timezoneOptions = Array.from(
    new Set([timezoneInput, browserTz, ...COMMON_TIMEZONES].filter(Boolean)),
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Connected Platforms</h1>
          <p className="mt-1 text-text-secondary">
            Connect all your social, email, and blog channels once to publish and auto-schedule from
            one hub.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="size-4" />}
          onClick={() => refetch()}
          disabled={isLoading}
        >
          Refresh Status
        </Button>
      </div>

      {banner && (
        <div
          role="alert"
          className={
            banner.type === "success"
              ? "flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500"
              : "flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          }
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span className="flex-1">{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {extractApiErrorMessage(error, "Could not load platform connections.")}
        </div>
      )}

      {/* Timezone Card */}
      <Card className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Scheduling Timezone</h2>
              <p className="text-sm text-text-secondary">
                Used when scheduling posts at ML-recommended windows or custom dates.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Default scheduling timezone"
              value={timezoneInput}
              onChange={(e) => handleSaveTimezone(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface-bright px-3 text-sm text-text"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>

            {browserTz && browserTz !== timezoneInput && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveTimezone(browserTz)}
                isLoading={updateTimezone.isPending}
              >
                Use {browserTz}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* OAuth Social Platforms */}
      <div className="grid gap-4 md:grid-cols-2">
        {OAUTH_PLATFORMS.map((meta) => {
          const info = status?.platforms[meta.key];
          const isConnected = Boolean(info?.isConnected);
          const serverConfigured = info?.serverConfigured ?? true;

          let identityLabel = "Not connected";
          if (isConnected && info) {
            if (meta.key === "twitter") {
              const tw = status?.platforms.twitter;
              identityLabel = tw?.username ? `@${tw.username}` : tw?.name || "Connected";
            } else if (meta.key === "linkedin") {
              const li = status?.platforms.linkedin;
              identityLabel = li?.name || li?.email || "Connected";
            } else if (meta.key === "instagram") {
              const ig = status?.platforms.instagram;
              identityLabel = ig?.username
                ? `@${ig.username}`
                : ig?.instagramId || "Connected Business Account";
            } else if (meta.key === "facebook") {
              const fb = status?.platforms.facebook;
              identityLabel = fb?.pageName ? `Page: ${fb.pageName}` : "No Page selected yet";
            }
          }

          return (
            <Card key={meta.key} className="flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{meta.title}</h3>
                    <p className="text-sm text-text-secondary">{meta.subtitle}</p>
                  </div>
                  <span
                    className={
                      isConnected
                        ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-500"
                        : "rounded-full bg-surface-bright px-2.5 py-0.5 text-xs font-medium text-text-secondary"
                    }
                  >
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                <p className="text-xs text-text-muted">Account: {identityLabel}</p>

                {!serverConfigured && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                    Server OAuth credentials not set yet. {meta.requirements}
                  </p>
                )}

                {meta.key === "facebook" &&
                  isConnected &&
                  status &&
                  status.platforms.facebook.pages.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-border/50 bg-surface-bright/40 p-3">
                      <Label htmlFor="fb-page-select" className="text-xs">
                        Target Facebook Page
                      </Label>
                      <div className="flex gap-2">
                        <select
                          id="fb-page-select"
                          value={selectedPageId}
                          onChange={(e) => setSelectedPageDraft(e.target.value)}
                          className="h-9 flex-1 rounded-lg border border-border bg-surface-bright px-2 text-sm text-text"
                        >
                          {status.platforms.facebook.pages.map((page) => (
                            <option key={page.id} value={page.id}>
                              {page.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSaveFacebookPage}
                          isLoading={selectFbPage.isPending}
                        >
                          Save Page
                        </Button>
                      </div>
                    </div>
                  )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={isConnected ? "outline" : "primary"}
                  leftIcon={<Link2 className="size-4" />}
                  onClick={() => handleOAuthConnect(meta.key)}
                  isLoading={initiateOAuth.isPending && initiateOAuth.variables === meta.key}
                  disabled={!serverConfigured}
                >
                  {isConnected ? "Reconnect" : "Connect"}
                </Button>

                {isConnected && (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Trash2 className="size-4 text-danger" />}
                    onClick={() => handleDisconnect(meta.key)}
                    isLoading={
                      disconnectPlatform.isPending && disconnectPlatform.variables === meta.key
                    }
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </Card>
          );
        })}

        {/* Email Channel */}
        <Card className="flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Mail className="size-4 text-primary" />
                  Email Newsletter
                </h3>
                <p className="text-sm text-text-secondary">
                  Send campaigns via Resend, SendGrid, or a custom delivery webhook.
                </p>
              </div>
              <span
                className={
                  status?.platforms.email.isConnected
                    ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-500"
                    : "rounded-full bg-surface-bright px-2.5 py-0.5 text-xs font-medium text-text-secondary"
                }
              >
                {status?.platforms.email.isConnected ? "Connected" : "Not configured"}
              </span>
            </div>

            {status?.platforms.email.isConnected && (
              <div className="space-y-0.5 text-xs text-text-muted">
                <p>
                  Provider: <strong>{status.platforms.email.provider}</strong> (
                  {status.platforms.email.fromEmail})
                </p>
                <p>
                  Default recipients:{" "}
                  {status.platforms.email.defaultRecipients.length > 0
                    ? status.platforms.email.defaultRecipients.join(", ")
                    : "None set"}
                </p>
              </div>
            )}

            {showEmailForm && (
              <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="email-provider">Provider</Label>
                  <select
                    id="email-provider"
                    value={emailProvider}
                    onChange={(e) => setEmailProvider(e.target.value as EmailProvider)}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-bright px-3 text-sm text-text"
                  >
                    <option value="resend">Resend API</option>
                    <option value="sendgrid">SendGrid API</option>
                    <option value="webhook">Custom HTTPS Webhook</option>
                  </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email-from-name">Sender Name</Label>
                    <Input
                      id="email-from-name"
                      value={emailFromName}
                      onChange={(e) => setEmailFromName(e.target.value)}
                      placeholder="Market Aura Team"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email-from-addr">Sender Email</Label>
                    <Input
                      id="email-from-addr"
                      type="email"
                      required
                      value={emailFromAddress}
                      onChange={(e) => setEmailFromAddress(e.target.value)}
                      placeholder="hello@yourdomain.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email-recipients">
                    Default Recipients (comma-separated emails)
                  </Label>
                  <Input
                    id="email-recipients"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    placeholder="subscribers@yourdomain.com, team@yourdomain.com"
                  />
                </div>

                {emailProvider === "webhook" ? (
                  <div>
                    <Label htmlFor="email-webhook">Webhook HTTPS URL</Label>
                    <Input
                      id="email-webhook"
                      type="url"
                      required
                      value={emailWebhookUrl}
                      onChange={(e) => setEmailWebhookUrl(e.target.value)}
                      placeholder="https://hooks.example.com/email-campaign"
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="email-apikey">
                      API Key{" "}
                      {status?.platforms.email.isConnected ? "(leave blank to keep existing)" : ""}
                    </Label>
                    <Input
                      id="email-apikey"
                      type="password"
                      required={!status?.platforms.email.isConnected}
                      value={emailApiKey}
                      onChange={(e) => setEmailApiKey(e.target.value)}
                      placeholder="re_... or SG..."
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" size="sm" isLoading={connectEmail.isPending}>
                    Save Email Settings
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowEmailForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {!showEmailForm && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={status?.platforms.email.isConnected ? "outline" : "primary"}
                onClick={openEmailForm}
              >
                {status?.platforms.email.isConnected ? "Configure" : "Connect Email"}
              </Button>
              {status?.platforms.email.isConnected && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Trash2 className="size-4 text-danger" />}
                  onClick={() => handleDisconnect("email")}
                  isLoading={
                    disconnectPlatform.isPending && disconnectPlatform.variables === "email"
                  }
                >
                  Disconnect
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Blog / CMS Channel */}
        <Card className="flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Globe className="size-4 text-primary" />
                  Blog / Website CMS
                </h3>
                <p className="text-sm text-text-secondary">
                  Publish articles to WordPress, Hashnode, Ghost, or a custom CMS webhook.
                </p>
              </div>
              <span
                className={
                  status?.platforms.blog.isConnected
                    ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-500"
                    : "rounded-full bg-surface-bright px-2.5 py-0.5 text-xs font-medium text-text-secondary"
                }
              >
                {status?.platforms.blog.isConnected ? "Connected" : "Not configured"}
              </span>
            </div>

            {status?.platforms.blog.isConnected && status.platforms.blog.siteUrl && (
              <p className="flex items-center gap-1 text-xs text-text-muted">
                <span>
                  {status.platforms.blog.provider}: {status.platforms.blog.siteUrl}
                </span>
                <ExternalLink className="size-3" />
              </p>
            )}

            {showBlogForm && (
              <form onSubmit={handleBlogSubmit} className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="blog-provider">CMS Provider</Label>
                  <select
                    id="blog-provider"
                    value={blogProvider}
                    onChange={(e) => setBlogProvider(e.target.value as BlogProvider)}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-bright px-3 text-sm text-text"
                  >
                    <option value="wordpress">WordPress REST API</option>
                    <option value="hashnode">Hashnode GraphQL API</option>
                    <option value="ghost">Ghost Admin API</option>
                    <option value="webhook">Custom CMS Webhook</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="blog-site-url">
                    {blogProvider === "webhook" ? "Webhook HTTPS URL" : "Site / API Base URL"}
                  </Label>
                  <Input
                    id="blog-site-url"
                    type="url"
                    required
                    value={blogSiteUrl}
                    onChange={(e) => setBlogSiteUrl(e.target.value)}
                    placeholder="https://yourblog.com"
                  />
                </div>

                {blogProvider === "wordpress" && (
                  <div>
                    <Label htmlFor="blog-username">WordPress Username</Label>
                    <Input
                      id="blog-username"
                      required
                      value={blogUsername}
                      onChange={(e) => setBlogUsername(e.target.value)}
                      placeholder="editor@yourblog.com"
                    />
                  </div>
                )}

                {blogProvider === "hashnode" && (
                  <div>
                    <Label htmlFor="blog-pub-id">Hashnode Publication ID</Label>
                    <Input
                      id="blog-pub-id"
                      required
                      value={blogPublicationId}
                      onChange={(e) => setBlogPublicationId(e.target.value)}
                      placeholder="650..."
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="blog-secret">
                    API Token / Application Password{" "}
                    {status?.platforms.blog.isConnected ? "(leave blank to keep existing)" : ""}
                  </Label>
                  <Input
                    id="blog-secret"
                    type="password"
                    required={blogProvider !== "webhook" && !status?.platforms.blog.isConnected}
                    value={blogApiSecret}
                    onChange={(e) => setBlogApiSecret(e.target.value)}
                    placeholder="Token or WP app password"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" size="sm" isLoading={connectBlog.isPending}>
                    Save Blog Settings
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowBlogForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {!showBlogForm && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={status?.platforms.blog.isConnected ? "outline" : "primary"}
                onClick={openBlogForm}
              >
                {status?.platforms.blog.isConnected ? "Configure" : "Connect Blog"}
              </Button>
              {status?.platforms.blog.isConnected && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Trash2 className="size-4 text-danger" />}
                  onClick={() => handleDisconnect("blog")}
                  isLoading={
                    disconnectPlatform.isPending && disconnectPlatform.variables === "blog"
                  }
                >
                  Disconnect
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
