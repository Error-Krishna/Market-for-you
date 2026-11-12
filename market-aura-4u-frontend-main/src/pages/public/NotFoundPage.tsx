import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-screen items-center bg-background text-text selection:bg-primary/20">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent blur-3xl" />
      </div>

      <Container className="py-20">
        <div className="mx-auto max-w-md text-center animate-fade-in space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-lg shadow-primary/20">
            <Compass className="size-8" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Error 404</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Page Not Found
            </h1>
            <p className="mt-3 text-sm text-text-secondary leading-relaxed">
              The page or route you are looking for does not exist or may have been relocated.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button fullWidth>Return to Dashboard</Button>
            </Link>
            <Link to="/" className="w-full sm:w-auto">
              <Button fullWidth variant="outline" leftIcon={<ArrowLeft className="size-4" />}>
                Home Page
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
