import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Briefcase, Check, Share2, Sparkles, Target } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useOnboarding } from "@/features/onboarding/hooks/use-onboarding";
import {
  ONBOARDING_INDUSTRIES,
  ONBOARDING_PLATFORMS,
  type OnboardingIndustry,
  type OnboardingPlatform,
} from "@/features/onboarding/types/onboarding.types";
import {
  onboardingSchema,
  type OnboardingFormData,
} from "@/features/onboarding/schemas/onboarding.schemas";
import { cn } from "@/lib/utils/cn";

interface PlatformMeta {
  label: string;
  desc: string;
}

const platformDetails: Record<OnboardingPlatform, PlatformMeta> = {
  twitter: {
    label: "X (Twitter)",
    desc: "Short updates, thread hooks & conversational posts",
  },
  linkedin: {
    label: "LinkedIn",
    desc: "Thought leadership, B2B narratives & industry insights",
  },
  instagram: {
    label: "Instagram",
    desc: "Visual captions, carousel slides & engagement prompts",
  },
  facebook: {
    label: "Facebook",
    desc: "Community announcements & longer form stories",
  },
  email: {
    label: "Email Newsletters",
    desc: "Direct subscriber updates, promos & digests",
  },
  blog: {
    label: "Blog / CMS",
    desc: "SEO-friendly long-form articles & announcements",
  },
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const onboarding = useOnboarding();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: "",
      industry: "" as unknown as OnboardingIndustry,
      brandTone: "Professional",
      uvp: "",
      targetAudience: "",
      platforms: [],
    },
  });

  const platforms = useWatch({
    control,
    name: "platforms",
  });

  const togglePlatform = (platform: OnboardingPlatform) => {
    const nextPlatforms = platforms.includes(platform)
      ? platforms.filter((item) => item !== platform)
      : [...platforms, platform];

    setValue("platforms", nextPlatforms, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setServerError("");

    try {
      await onboarding.mutateAsync(data);
      await refreshProfile();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Unable to complete onboarding. Please try again.",
      );
    }
  };

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-8 animate-fade-in">
        {/* Header Intro */}
        <div className="text-center sm:text-left space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>Step 1 of 1 &bull; Personalize Your AI Brain</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text">
            Configure Your Brand Intelligence
          </h1>

          <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-text-secondary">
            Market Aura tailors every social post, hook, and carousel to your real brand
            positioning, industry context, and tone of voice.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8 rounded-3xl border border-border/60 bg-surface/70 p-6 sm:p-10 shadow-xl backdrop-blur-xl"
        >
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
            >
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Section 1: Business Identity */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Briefcase className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text">Business Identity</h2>
                <p className="text-xs text-text-muted">
                  Company name, market sector, and baseline tone
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="companyName"
                  className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
                >
                  Company or Brand Name <span className="text-danger">*</span>
                </label>
                <input
                  id="companyName"
                  {...register("companyName")}
                  placeholder="e.g. Market Aura, Apex Cloud"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {errors.companyName && (
                  <p className="text-xs text-danger">{errors.companyName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="industry"
                  className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
                >
                  Industry / Sector <span className="text-danger">*</span>
                </label>
                <select
                  id="industry"
                  {...register("industry")}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="" disabled>
                    Select your industry
                  </option>
                  {ONBOARDING_INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
                {errors.industry && (
                  <p className="text-xs text-danger">{errors.industry.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label
                  htmlFor="brandTone"
                  className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
                >
                  Primary Brand Tone <span className="text-danger">*</span>
                </label>
                <select
                  id="brandTone"
                  {...register("brandTone")}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Professional">
                    Professional (Authoritative, clear, corporate)
                  </option>
                  <option value="Friendly">Friendly (Approachable, warm, conversational)</option>
                  <option value="Playful">Playful (Witty, energetic, engaging)</option>
                  <option value="Bold">Bold (Provocative, punchy, confident)</option>
                  <option value="Inspirational">
                    Inspirational (Uplifting, visionary, motivating)
                  </option>
                  <option value="Casual">Casual (Relaxed, genuine, straightforward)</option>
                </select>
                {errors.brandTone && (
                  <p className="text-xs text-danger">{errors.brandTone.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Positioning & Audience */}
          <section className="space-y-6 pt-4 border-t border-border/40">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
              <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                <Target className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text">Positioning &amp; Audience</h2>
                <p className="text-xs text-text-muted">What makes you unique and whom you serve</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="uvp"
                  className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
                >
                  Unique Value Proposition (UVP) <span className="text-danger">*</span>
                </label>
                <textarea
                  id="uvp"
                  {...register("uvp")}
                  rows={3}
                  placeholder="e.g. The all-in-one AI platform that creates, optimizes, and auto-schedules high-converting multi-channel marketing campaigns."
                  className="w-full resize-y rounded-xl border border-border bg-background p-3.5 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {errors.uvp && <p className="text-xs text-danger">{errors.uvp.message}</p>}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="targetAudience"
                  className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
                >
                  Target Audience Description <span className="text-danger">*</span>
                </label>
                <textarea
                  id="targetAudience"
                  {...register("targetAudience")}
                  rows={3}
                  placeholder="e.g. Founders, marketing teams, agency creators, and growth leads looking to scale their social footprint without endless manual drafting."
                  className="w-full resize-y rounded-xl border border-border bg-background p-3.5 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {errors.targetAudience && (
                  <p className="text-xs text-danger">{errors.targetAudience.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Distribution Platforms */}
          <section className="space-y-6 pt-4 border-t border-border/40">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Share2 className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text">Active Distribution Channels</h2>
                <p className="text-xs text-text-muted">
                  Select the platforms you plan to generate and schedule content for
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ONBOARDING_PLATFORMS.map((platform) => {
                const selected = platforms.includes(platform);
                const info = platformDetails[platform];

                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border p-4 text-left transition duration-200 group relative",
                      selected
                        ? "border-primary bg-primary/10 text-text shadow-sm shadow-primary/10"
                        : "border-border/60 bg-surface-bright/30 text-text-secondary hover:border-border hover:bg-surface-bright/70 hover:text-text",
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-sm text-text">{info.label}</span>
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border transition",
                          selected
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-surface text-transparent",
                        )}
                      >
                        <Check className="size-3" />
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-text-muted leading-relaxed line-clamp-2">
                      {info.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {errors.platforms && (
              <p className="text-xs text-danger font-medium">{errors.platforms.message}</p>
            )}
          </section>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40 pt-6">
            <p className="text-xs text-text-muted text-center sm:text-left">
              You can adjust all of these settings at any time in your Workspace Settings.
            </p>

            <Button
              type="submit"
              size="lg"
              isLoading={onboarding.isPending}
              rightIcon={!onboarding.isPending ? <ArrowRight className="size-4" /> : undefined}
              className="w-full sm:w-auto"
            >
              Complete Setup &amp; Launch
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
