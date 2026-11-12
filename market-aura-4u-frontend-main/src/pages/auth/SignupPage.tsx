import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { AuthFormField } from "@/features/auth/components/AuthFormField";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { signupSchema, type SignupFormData } from "@/features/auth/schemas/auth.schemas";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({
    control,
    name: "password",
    defaultValue: "",
  });

  const onSubmit = async (data: SignupFormData) => {
    setServerError("");

    try {
      const user = await signup({
        email: data.email,
        password: data.password,
      });

      navigate(user.isOnboarded ? "/dashboard" : "/onboarding", {
        replace: true,
      });
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Unable to create your account. Please try again.",
      );
    }
  };

  return (
    <section className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20">
          <Check className="size-5" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create your account</h1>

        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Start creating better content with Market Aura.
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div
                role="alert"
                className="rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
              >
                {serverError}
              </div>
            )}

            <AuthFormField
              label="Email"
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              icon={<Mail className="size-4" />}
              errorMessage={errors.email?.message}
              {...register("email")}
            />

            <AuthFormField
              label="Password"
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              icon={<LockKeyhole className="size-4" />}
              rightElement={
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              errorMessage={errors.password?.message}
              {...register("password")}
            />

            <AuthFormField
              label="Confirm password"
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat your password"
              icon={<LockKeyhole className="size-4" />}
              rightElement={
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              errorMessage={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className={password.length >= 8 ? "text-[var(--color-success)]" : undefined}>
                {password.length >= 8 ? "✓" : "•"} 8+ characters
              </span>
            </div>

            <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
