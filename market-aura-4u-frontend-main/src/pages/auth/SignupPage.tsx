import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserPlus,
} from "lucide-react";

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

  const hasMinLength = password.length >= 8;
  const hasNumberOrSpecial = /[0-9!@#$%^&*]/.test(password);

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
    <section className="w-full max-w-md animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-white shadow-xl shadow-primary/20">
          <UserPlus className="size-6" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-text">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-text-secondary">
          Join Market Aura 4U &amp; get 10 free generation credits
        </p>
      </div>

      <Card className="border border-border/60 bg-surface/70 backdrop-blur-xl shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{serverError}</span>
              </div>
            )}

            <AuthFormField
              label="Email Address"
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
                  className="text-text-muted transition hover:text-text focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              errorMessage={errors.password?.message}
              {...register("password")}
            />

            <AuthFormField
              label="Confirm Password"
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
                  className="text-text-muted transition hover:text-text focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              errorMessage={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            {/* Password quality pills */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted rounded-xl border border-border/40 bg-surface-bright/40 p-3">
              <span
                className={`inline-flex items-center gap-1 ${hasMinLength ? "text-emerald-500 font-medium" : ""}`}
              >
                {hasMinLength ? <Check className="size-3.5" /> : "•"} 8+ characters
              </span>
              <span
                className={`inline-flex items-center gap-1 ${hasNumberOrSpecial ? "text-emerald-500 font-medium" : ""}`}
              >
                {hasNumberOrSpecial ? <Check className="size-3.5" /> : "•"} Number or symbol
              </span>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              rightIcon={!isSubmitting ? <ArrowRight className="size-4" /> : undefined}
            >
              Create Account &amp; Continue
            </Button>
          </form>

          <div className="mt-6 border-t border-border/40 pt-5 text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary transition hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
