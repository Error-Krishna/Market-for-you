import { Link, useRouteError } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function RouteErrorBoundary() {
  const error = useRouteError();

  return (
    <main className="flex min-h-screen items-center">
      <Container className="py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold text-primary">Something went wrong</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-text">
            We could not load this page.
          </h1>
          <p className="mt-4 text-text-secondary">
            Please try again or return to the Market Aura home page.
          </p>

          {import.meta.env.DEV && error instanceof Error ? (
            <pre className="mt-6 overflow-auto rounded-lg border border-border bg-surface p-4 text-left text-xs text-text-secondary">
              {error.message}
            </pre>
          ) : null}

          <div className="mt-8">
            <Link to="/">
              <Button>Back to home</Button>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
