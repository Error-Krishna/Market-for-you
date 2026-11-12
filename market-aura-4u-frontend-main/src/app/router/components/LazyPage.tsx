import { Suspense, type ReactNode } from "react";

interface LazyPageProps {
  children: ReactNode;
}

export function LazyPage({ children }: LazyPageProps) {
  return <Suspense fallback={<div className="min-h-screen" />}>{children}</Suspense>;
}
