import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { AuthFormField } from "@/features/auth/components/AuthFormField";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { loginSchema, type LoginFormData } from "@/features/auth/schemas/auth.schemas";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");

    try {
      const user = await login(data);

      navigate(user.isOnboarded ? "/dashboard" : "/onboarding", {
        replace: true,
      });
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Unable to sign in. Please try again.",
      );
    }
  };

  return (
    <section className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20">
          <LockKeyhole className="size-5" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back</h1>

        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Sign in to continue to Market Aura.
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
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              icon={<Mail className="size-4" />}
              errorMessage={errors.email?.message}
              {...register("email")}
            />

            <AuthFormField
              label="Password"
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              icon={<LockKeyhole className="size-4" />}
              rightElement={
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              errorMessage={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-[var(--color-primary)] hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
