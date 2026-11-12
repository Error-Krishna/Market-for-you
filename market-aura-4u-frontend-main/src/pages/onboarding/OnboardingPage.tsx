import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
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

const platformLabels: Record<OnboardingPlatform, string> = {
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  email: "Email",
  blog: "Blog",
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
      setServerError(error instanceof Error ? error.message : "Unable to complete onboarding.");
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary">Market Aura</p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Set up your brand
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Tell us about your business so generated content can use your real brand information.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 rounded-2xl border border-border bg-surface-bright p-5 shadow-sm sm:p-8"
        >
          <section className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-text">Business information</h2>

              <p className="mt-1 text-sm text-text-secondary">
                These values are saved to your account.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-text">Company name</span>

                <input
                  {...register("companyName")}
                  placeholder="Acme Inc."
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />

                {errors.companyName && (
                  <span className="text-xs text-danger">{errors.companyName.message}</span>
                )}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-text">Industry</span>

                <select
                  {...register("industry")}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="" disabled>
                    Select an industry
                  </option>
                  {ONBOARDING_INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>

                {errors.industry && (
                  <span className="text-xs text-danger">{errors.industry.message}</span>
                )}
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium text-text">Brand tone</span>

                <select
                  {...register("brandTone")}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Playful">Playful</option>
                  <option value="Bold">Bold</option>
                  <option value="Inspirational">Inspirational</option>
                  <option value="Casual">Casual</option>
                </select>

                {errors.brandTone && (
                  <span className="text-xs text-danger">{errors.brandTone.message}</span>
                )}
              </label>
            </div>
          </section>

          <section className="space-y-5 border-t border-border pt-6">
            <div>
              <h2 className="text-base font-semibold text-text">Your audience and positioning</h2>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-text">Unique value proposition</span>

              <textarea
                {...register("uvp")}
                rows={4}
                placeholder="What makes your brand different?"
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />

              {errors.uvp && <span className="text-xs text-danger">{errors.uvp.message}</span>}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-text">Target audience</span>

              <textarea
                {...register("targetAudience")}
                rows={4}
                placeholder="Who do you want to reach?"
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />

              {errors.targetAudience && (
                <span className="text-xs text-danger">{errors.targetAudience.message}</span>
              )}
            </label>
          </section>

          <section className="border-t border-border pt-6">
            <div>
              <h2 className="text-base font-semibold text-text">Content platforms</h2>

              <p className="mt-1 text-sm text-text-secondary">Select where you plan to publish.</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ONBOARDING_PLATFORMS.map((platform) => {
                const selected = platforms.includes(platform);

                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={cn(
                      "flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-medium transition",
                      selected
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-background text-text-secondary hover:border-border-strong hover:text-text",
                    )}
                  >
                    {platformLabels[platform]}

                    {selected && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {errors.platforms && (
              <p className="mt-2 text-xs text-danger">{errors.platforms.message}</p>
            )}
          </section>

          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              {serverError}
            </div>
          )}

          <div className="flex justify-end border-t border-border pt-6">
            <Button type="submit" size="lg" isLoading={onboarding.isPending}>
              Complete setup
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
