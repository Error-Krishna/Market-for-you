import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles, WandSparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const features = [
  {
    icon: Sparkles,
    title: "AI‑powered content",
    description:
      "Turn a simple idea into polished marketing content without starting from a blank page.",
  },
  {
    icon: WandSparkles,
    title: "Built for your brand",
    description:
      "Keep your audience, goals, tone, and brand context at the center of every generation.",
  },
  {
    icon: Zap,
    title: "Create, schedule & publish",
    description:
      "Move from idea or manual upload to scheduled multi-platform delivery from one hub.",
  },
];

const workflow = [
  "Tell us about your business",
  "Generate AI copy or upload manual content",
  "Auto-schedule at peak times or publish everywhere",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-text">
      {/* Navigation */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-orange-400 text-sm text-white">
              M
            </span>
            <span className="gradient-text">Market Aura</span>
          </Link>

          <nav
            className="hidden items-center gap-7 text-sm text-text-secondary md:flex"
            aria-label="Primary navigation"
          >
            <a href="#features" className="transition-colors hover:text-text">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-text">
              How it works
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </Container>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-border/40">
          <Container className="grid min-h-[680px] items-center gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-surface/40 px-3 py-1.5 text-sm font-medium text-text-secondary backdrop-blur-sm">
                <Sparkles className="size-4 text-primary" />
                Smarter marketing content, faster
              </div>

              <h1 className="mt-7 max-w-3xl text-5xl font-bold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Create marketing content that{" "}
                <span className="gradient-text">feels like your brand</span>.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary">
                Market Aura helps you turn ideas into high‑quality content for your business,
                audience, and marketing goals — without the repetitive work.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup">
                  <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>
                    Start creating
                  </Button>
                </Link>

                <a href="#features">
                  <Button variant="outline" size="lg">
                    Explore features
                  </Button>
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-text-secondary">
                {["AI‑assisted creation", "Brand‑aware workflow", "Multiple platforms"].map(
                  (item) => (
                    <span key={item} className="inline-flex items-center gap-2">
                      <Check className="size-4 text-primary" />
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Hero illustration / preview */}
            <div className="relative">
              <div
                className="absolute -inset-8 rounded-[3rem] bg-primary/5 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative glass-card rounded-2xl bg-surface/40 p-4 shadow-xl backdrop-blur-md sm:p-6">
                <div className="rounded-xl border border-border/30 bg-surface/60 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-border/30 pb-4">
                    <div>
                      <p className="text-sm font-semibold">Create content</p>
                      <p className="mt-1 text-xs text-text-muted">Your next marketing idea</p>
                    </div>

                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      AI ready
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-text-secondary">Content goal</p>
                      <div className="mt-2 rounded-lg border border-border/30 bg-background/50 px-3 py-3 text-sm">
                        Launch our new product
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-text-secondary">Generated result</p>
                      <div className="mt-2 rounded-lg border border-border/30 bg-background/50 p-4 text-sm leading-6 text-text-secondary">
                        Introduce your audience to something new with a clear message, strong value
                        proposition, and a reason to take the next step.
                      </div>
                    </div>

                    <Button fullWidth rightIcon={<ArrowRight className="size-4" />}>
                      Generate content
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Features */}
        <section id="features" className="py-20 lg:py-28">
          <Container>
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Everything in one workflow</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Less busywork. <span className="gradient-text">More useful content.</span>
              </h2>
              <p className="mt-4 text-base leading-7 text-text-secondary">
                Focus on your marketing strategy while Market Aura handles the repetitive content
                creation work.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="glass-card rounded-2xl bg-surface/30 p-6 backdrop-blur-sm transition hover:bg-surface/50"
                >
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-y border-border/40 bg-surface/20 py-20 backdrop-blur-sm lg:py-28"
        >
          <Container>
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold text-primary">How it works</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  From idea to content in <span className="gradient-text">a few focused steps</span>
                  .
                </h2>
              </div>

              <div className="space-y-4">
                {workflow.map((step, index) => (
                  <div
                    key={step}
                    className="glass-card rounded-2xl bg-surface/30 p-5 backdrop-blur-sm"
                  >
                    <div className="flex gap-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-orange-400 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold">{step}</h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          {index === 0 &&
                            "Give Market Aura the context it needs to understand your business."}
                          {index === 1 &&
                            "Select the content type and platforms that match your current goal."}
                          {index === 2 &&
                            "Review the result, make your final adjustments, and move it forward."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-28">
          <Container>
            <div className="glass-card rounded-3xl bg-gradient-to-r from-primary/20 to-orange-400/10 p-8 text-center backdrop-blur-sm sm:p-12">
              <p className="text-sm font-semibold text-primary">Ready when you are</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Turn your next marketing idea into <span className="gradient-text">content</span>.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-text-secondary sm:text-base">
                Start with your business context and let Market Aura help you build from there.
              </p>

              <div className="mt-8">
                <Link to="/signup">
                  <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>
                    Get started
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <Container className="flex flex-col gap-3 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Market Aura.</span>
          <div className="flex gap-5">
            <Link to="/login" className="hover:text-text">
              Log in
            </Link>
            <Link to="/signup" className="hover:text-text">
              Sign up
            </Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}
