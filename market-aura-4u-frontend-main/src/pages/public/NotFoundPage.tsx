import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center">
      <Container className="py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Page not found</h1>
          <p className="mt-4 text-text-secondary">The page you are looking for does not exist.</p>
          <div className="mt-8">
            <Link to="/">
              <Button>Return home</Button>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
