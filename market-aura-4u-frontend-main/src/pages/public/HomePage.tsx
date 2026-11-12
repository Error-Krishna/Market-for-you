import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Layers,
  Shield,
  Sparkles,
  TrendingUp,
  WandSparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const features = [
  {
    icon: Sparkles,
    title: "AI‑Powered Content Studio",
    description:
      "Transform high-level briefs into platform-optimized copy for Instagram, LinkedIn, X, and Email with grounded brand context.",
  },
  {
    icon: WandSparkles,
    title: "Brand Intelligence Engine",
    description:
      "Encode your industry, audience, tone of voice, UVP, and marketing goals directly into every model generation.",
  },
  {
    icon: Zap,
    title: "Create, Schedule & Publish",
    description:
      "Move seamlessly from generated copy or manual broadcast into an automated posting queue with peak-time delivery.",
  },
  {
    icon: TrendingUp,
    title: "ML Historical Optimization",
    description:
      "Data-backed advisory signals for Instagram post formats, carousel slide sequencing, and engagement window estimation.",
  },
  {
    icon: Layers,
    title: "Multi-Channel Asset Library",
    description:
      "Store and organize high-resolution brand visuals, videos, and media attachments with secure tokenized delivery.",
  },
  {
    icon: Shield,
    title: "Enterprise Tenant Isolation",
    description:
      "Strict account boundary enforcement, AES-256-GCM token encryption, and server-authoritative entitlements.",
  },
];

const workflow = [
  "Tell us about your business",
  "Generate AI copy or upload manual content",
  "Auto-schedule at peak times or publish everywhere",
];

const platformPreviews = [
  {
    id: "instagram",
    name: "Instagram",
    title: "Multi-Slide Carousel",
    caption:
      "Stop trading time for unpredictable organic reach. Here is the 3-step formula modern marketing teams use to scale multi-channel content without burning out 👇\n\nSwipe through for the breakdown! 🚀\n\n#GrowthMarketing #BrandStrategy #SaaSGrowth #ContentAutomation #SocialMediaROI",
    slides: [
      {
        num: "01",
        heading: "Centralize Context",
        text: "Lock in your brand voice and audience before drafting a single word.",
      },
      {
        num: "02",
        heading: "Generate Platform-Native",
        text: "Tailor structure, tone, and character bounds per platform.",
      },
      {
        num: "03",
        heading: "Schedule at Peak Hours",
        text: "Deliver content when your specific audience is historically most active.",
      },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    title: "Executive Thought Leadership",
    caption:
      "Most marketing teams waste 15+ hours every week rewriting the same core campaign across four channels.\n\nThe bottleneck isn't creativity—it's translation.\n\nWhen your brand intelligence, UVP, and audience segments are codified into an engine, generation turns from a chore into compounding leverage.\n\nWhat is your team's biggest challenge in maintaining content cadence across platforms?",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    title: "Punchy High-Engagement Tweet",
    caption:
      "The best marketing teams don't write more content.\n\nThey systematize their brand intelligence and distribute it everywhere in minutes.\n\nHere's why context-grounded AI beats generic prompting every time 🧵👇\n\n#MarketingAutomation #GrowthHacking",
  },
];

const faqs = [
  {
    q: "How does Market Aura ensure generated content sounds like our brand?",
    a: "During onboarding and in your Brand Settings, you define your industry, UVP, target audience, and brand voice guidelines. These parameters are directly injected into every generation prompt to produce copy that matches your voice.",
  },
  {
    q: "What platforms are supported for generation and publishing?",
    a: "Market Aura supports generation for Instagram, LinkedIn, X (Twitter), and Email. Real automated publishing and scheduling is available for connected Instagram Business accounts, X (Twitter), LinkedIn, and Email.",
  },
  {
    q: "How do generation credits work?",
    a: "Every successful multi-platform generation request consumes 1 credit regardless of how many channels you produce copy for. Unused credits roll over per your plan policy.",
  },
  {
    q: "Can I manage multiple brand profiles?",
    a: "Market Aura v1.0 is architected for strict tenant isolation with comprehensive brand configuration per user account, with full multi-brand workspace support rolling out soon.",
  },
];

export default function HomePage() {
  const [activePreview, setActivePreview] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary/20">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-orange-400 text-sm font-black text-white shadow-md shadow-primary/20">
              M
            </span>
            <span className="gradient-text font-extrabold tracking-tight">Market Aura</span>
          </Link>

          <nav
            className="hidden items-center gap-7 text-sm font-medium text-text-secondary md:flex"
            aria-label="Primary navigation"
          >
            <a href="#features" className="transition-colors hover:text-text">
              Features
            </a>
            <a href="#preview" className="transition-colors hover:text-text">
              Studio Preview
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-text">
              How It Works
            </a>
            <a href="#pricing" className="transition-colors hover:text-text">
              Pricing
            </a>
            <a href="#faq" className="transition-colors hover:text-text">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Start Free Trial</Button>
            </Link>
          </div>
        </Container>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/40 py-20 lg:py-28">
          <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <Container className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm">
                <Sparkles className="size-3.5" />
                AI Content Marketing &amp; Multi-Channel Publishing
              </div>

              <h1 className="mt-6 max-w-3xl text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Marketing content that{" "}
                <span className="gradient-text">authentically matches your brand</span>.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary">
                Turn your brand intelligence and marketing briefs into tailored, high-engagement
                copy across Instagram, LinkedIn, and X. With data-backed recommendations and
                integrated queue scheduling.
              </p>

              <div className="mt-9 flex flex-col gap-3.5 sm:flex-row">
                <Link to="/signup">
                  <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>
                    Get Started Free
                  </Button>
                </Link>

                <a href="#preview">
                  <Button variant="outline" size="lg">
                    Interactive Preview
                  </Button>
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-xs font-medium text-text-secondary">
                {[
                  "Brand-Aware AI Generations",
                  "Data-Backed Instagram Recommendations",
                  "One-Click Multi-Channel Publishing",
                  "No Credit Card Required",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Interactive Hero Studio Preview */}
            <div id="preview" className="relative">
              <div className="glass-card overflow-hidden rounded-2xl border border-border/60 bg-surface/40 p-5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-red-400/80" />
                    <span className="size-2.5 rounded-full bg-amber-400/80" />
                    <span className="size-2.5 rounded-full bg-green-400/80" />
                    <span className="ml-2 text-xs font-semibold text-text-muted">
                      Content Studio
                    </span>
                  </div>
                  <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                    Ready
                  </span>
                </div>

                {/* Platform Selector */}
                <div className="mt-4 flex gap-1.5 rounded-xl bg-surface/60 p-1 border border-border/40">
                  {platformPreviews.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActivePreview(idx)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                        activePreview === idx
                          ? "bg-primary text-white shadow-sm"
                          : "text-text-secondary hover:text-text"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {/* Preview Body */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {platformPreviews[activePreview].title}
                    </span>
                    <span className="text-xs text-text-muted">AI-Optimized</span>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/60 p-4 text-xs sm:text-sm leading-relaxed text-text">
                    <p className="whitespace-pre-wrap">{platformPreviews[activePreview].caption}</p>
                  </div>

                  {platformPreviews[activePreview].slides && (
                    <div className="grid grid-cols-3 gap-2">
                      {platformPreviews[activePreview].slides?.map((slide) => (
                        <div
                          key={slide.num}
                          className="rounded-lg border border-border/40 bg-surface/50 p-2.5 text-left"
                        >
                          <span className="text-[10px] font-bold text-primary">
                            Slide {slide.num}
                          </span>
                          <p className="mt-0.5 text-xs font-semibold text-text truncate">
                            {slide.heading}
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-text-secondary">
                            {slide.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <Link to="/signup" className="block">
                      <Button fullWidth size="sm" rightIcon={<ArrowRight className="size-4" />}>
                        Generate for your brand
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 lg:py-28">
          <Container>
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Comprehensive Capabilities
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Less manual busywork.{" "}
                <span className="gradient-text">Higher marketing velocity.</span>
              </h2>
              <p className="mt-4 text-base leading-7 text-text-secondary">
                Market Aura pairs deep brand context with generative LLMs and offline machine
                learning to give your marketing engine unfair leverage.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="glass-card flex flex-col justify-between rounded-2xl border border-border/60 bg-surface/30 p-6 backdrop-blur-sm transition-all hover:bg-surface/50 hover:border-primary/30"
                >
                  <div>
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="text-lg font-bold text-text">{title}</h3>
                    <p className="mt-2.5 text-sm leading-6 text-text-secondary">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="border-y border-border/40 bg-surface/15 py-20 backdrop-blur-sm lg:py-28"
        >
          <Container>
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Streamlined Workflow
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  From raw idea to published campaign in{" "}
                  <span className="gradient-text">three focused steps</span>.
                </h2>
                <p className="mt-4 text-sm sm:text-base leading-7 text-text-secondary">
                  Eliminate blank-page syndrome. Market Aura keeps your voice, target personas, and
                  goals aligned at every phase.
                </p>
              </div>

              <div className="space-y-4">
                {workflow.map((step, index) => (
                  <div
                    key={step}
                    className="glass-card flex items-start gap-4 rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur-sm"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-orange-400 text-sm font-bold text-white shadow-sm">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-text">{step}</h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        {index === 0 &&
                          "Configure your company name, industry, UVP, target audience, and brand tone in a 60-second setup."}
                        {index === 1 &&
                          "Input a core brief or campaign goal, and generate multi-platform copy tailored with ML recommendations."}
                        {index === 2 &&
                          "Auto-schedule posts for high-engagement windows or publish immediately across your connected channels."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 lg:py-28">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Transparent Pricing
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Simple plans that scale with your{" "}
                <span className="gradient-text">brand growth</span>.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-text-secondary">
                No hidden surprises. Switch or renew anytime with server-authoritative entitlements.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                {
                  tier: "Free",
                  price: "₹0",
                  desc: "Ideal for exploring AI content capabilities",
                  credits: "100 credits / mo",
                  features: ["AI Copy Studio", "Standard Brand Profile", "Manual Copy & Export"],
                  cta: "Get Started Free",
                  highlight: false,
                },
                {
                  tier: "Starter",
                  price: "₹499",
                  period: "/ month",
                  desc: "For growing creators and emerging businesses",
                  credits: "500 credits / mo",
                  features: [
                    "Multi-Platform Publishing",
                    "Schedule Queue Integration",
                    "Media Asset Library",
                    "Email Support",
                  ],
                  cta: "Choose Starter",
                  highlight: false,
                },
                {
                  tier: "Pro",
                  price: "₹1,499",
                  period: "/ month",
                  desc: "For serious marketing teams and scaleups",
                  credits: "2,500 credits / mo",
                  features: [
                    "Data-Backed ML Recommendations",
                    "Multi-Slide Instagram Carousels",
                    "Peak Window Auto-Scheduling",
                    "Priority Generation Concurrency",
                    "24/7 Priority Support",
                  ],
                  cta: "Upgrade to Pro",
                  highlight: true,
                },
              ].map((p) => (
                <div
                  key={p.tier}
                  className={`glass-card relative flex flex-col justify-between rounded-2xl border p-6 backdrop-blur-sm ${
                    p.highlight
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-xl"
                      : "border-border/60 bg-surface/30"
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      Most Popular
                    </span>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-text">{p.tier}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
                      {p.period && <span className="text-xs text-text-secondary">{p.period}</span>}
                    </div>
                    <p className="mt-2 text-xs text-text-secondary">{p.desc}</p>
                    <div className="my-5 border-t border-border/40" />
                    <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary">
                      {p.credits}
                    </div>
                    <ul className="space-y-2.5 text-xs text-text-secondary">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="size-3.5 text-primary shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    <Link to="/signup" className="block">
                      <Button fullWidth variant={p.highlight ? "primary" : "outline"} size="sm">
                        {p.cta}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="border-t border-border/40 bg-surface/15 py-20 lg:py-28">
          <Container className="max-w-3xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">FAQ</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Frequently Asked <span className="gradient-text">Questions</span>
              </h2>
            </div>

            <div className="mt-10 space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className="glass-card overflow-hidden rounded-xl border border-border/50 bg-surface/30"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-4 text-left font-semibold text-text transition hover:bg-surface/50"
                    >
                      <span className="text-sm">{faq.q}</span>
                      <ChevronDown
                        className={`size-4 text-text-secondary transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-border/30 p-4 text-xs sm:text-sm text-text-secondary leading-relaxed bg-surface/10">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Container>
        </section>

        {/* Call to Action Footer Banner */}
        <section className="py-20">
          <Container>
            <div className="glass-card rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/20 via-orange-400/10 to-primary/10 p-8 text-center backdrop-blur-md sm:p-14">
              <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl text-text">
                Ready to elevate your marketing with{" "}
                <span className="gradient-text">Market Aura</span>?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-text-secondary sm:text-base">
                Join creators and marketing teams creating branded, high-performance content in
                minutes.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link to="/signup">
                  <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>
                    Start Your Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 bg-background">
        <Container className="flex flex-col gap-4 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text">Market Aura 4U</span>
            <span>— AI Marketing &amp; Multi-Channel Publishing Platform</span>
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-text transition">
              Features
            </a>
            <a href="#pricing" className="hover:text-text transition">
              Pricing
            </a>
            <Link to="/login" className="hover:text-text transition">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-text transition">
              Sign Up
            </Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}
