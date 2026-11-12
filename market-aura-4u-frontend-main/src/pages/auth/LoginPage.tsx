import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

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
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please verify your credentials.",
      );
    }
  };

  return (
    <section className="w-full max-w-md animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-white shadow-xl shadow-primary/20">
          <LockKeyhole className="size-6" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-text">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-text-secondary">Sign in to your Market Aura 4U workspace</p>
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
                  className="text-text-muted transition hover:text-text focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              errorMessage={errors.password?.message}
              {...register("password")}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              rightIcon={!isSubmitting ? <ArrowRight className="size-4" /> : undefined}
            >
              Sign in to Workspace
            </Button>
          </form>

          <div className="mt-6 border-t border-border/40 pt-5 text-center text-sm text-text-secondary">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-primary transition hover:underline">
              Create one for free
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
