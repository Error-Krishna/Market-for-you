import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Lightbulb, Send, Sparkles, Wand2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { useGenerateContent } from "@/features/content";
import { GeneratedContentView } from "@/features/content/components/GeneratedContentView";
import { generationErrorMessage } from "@/features/content/api/generation-error";
import type { GeneratedContent } from "@/features/content/types/content.types";
import { ManualBroadcastComposer, PublishSchedulePanel } from "@/features/posts";

const schema = z.object({
  prompt: z
    .string()
    .min(5, "Please provide at least 5 characters.")
    .max(5000, "Prompt cannot exceed 5000 characters."),
});

type FormData = z.infer<typeof schema>;

const PROMPT_SUGGESTIONS = [
  "Announce our major new feature release and highlight 3 core benefits.",
  "Share a behind-the-scenes founder story on lessons learned scaling.",
  "Ask an engaging question about industry trends to spark comments.",
  "Highlight a customer success case study with measurable ROI.",
];

function getInitialPrompt(): string {
  if (typeof window === "undefined") return "";
  try {
    return new URLSearchParams(window.location?.search ?? "").get("prompt") || "";
  } catch {
    return "";
  }
}

export default function CreateContentPage() {
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");

  const generate = useGenerateContent();

  const initialPrompt = getInitialPrompt();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      prompt: initialPrompt,
    },
  });

  const promptValue =
    useWatch({
      control,
      name: "prompt",
      defaultValue: initialPrompt,
    }) || "";

  useEffect(() => {
    if (initialPrompt && !promptValue) {
      setValue("prompt", initialPrompt);
    }
  }, [initialPrompt, promptValue, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      const response = await generate.mutateAsync({
        prompt: data.prompt,
      });
      setResult(response.job.generatedContent ?? null);
      setJobId(response.job.id ?? null);
      setLastPrompt(data.prompt);
    } catch {
      // React Query retains the error for the alert below. Keep the prompt and
      // consume the rejected promise; retrying must be an explicit user action.
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    setValue("prompt", suggestion, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      {/* Studio Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Wand2 className="size-3.5" />
            <span>Content Studio</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text">Create &amp; Publish</h1>
          <p className="mt-1 text-sm text-text-secondary max-w-xl">
            Generate tailored AI content per platform or compose a manual broadcast — then post or
            auto-schedule everything from one place.
          </p>
        </div>

        {/* Studio Mode Selector */}
        <div className="inline-flex rounded-2xl border border-border/60 bg-surface/70 p-1 backdrop-blur-md shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "ai"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-secondary hover:text-text hover:bg-surface-bright"
            }`}
          >
            <Sparkles className="size-3.5" />
            AI Content Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "manual"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-text-secondary hover:text-text hover:bg-surface-bright"
            }`}
          >
            <Send className="size-3.5" />
            Manual Broadcast
          </button>
        </div>
      </div>

      {activeTab === "manual" ? (
        <ManualBroadcastComposer />
      ) : (
        <>
          {/* AI Generation Form */}
          <div className="rounded-3xl border border-border/60 bg-surface/70 p-6 sm:p-8 backdrop-blur-xl shadow-sm space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="prompt" className="text-sm font-semibold text-text">
                    Your Idea / Prompt
                  </label>
                  <span className="text-xs text-text-muted">
                    {promptValue.length} / 5000 characters
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    id="prompt"
                    {...register("prompt")}
                    rows={5}
                    className="w-full rounded-2xl border border-border bg-background p-4 text-sm text-text backdrop-blur-sm transition placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g., Write a launch post for our new product announcing early access..."
                  />
                </div>

                {errors.prompt && (
                  <p className="mt-1.5 text-xs text-danger font-medium">{errors.prompt.message}</p>
                )}
              </div>

              {/* Prompt Suggestions Pills */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <Lightbulb className="size-3.5 text-amber-500" />
                  <span>Prompt Inspiration</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="rounded-lg border border-border/60 bg-surface-bright/50 px-3 py-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-text transition text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-4">
                <p className="text-xs text-text-muted hidden sm:block">
                  Generates tailored copy, hashtags, and carousel slides per configured platform.
                </p>

                <Button
                  type="submit"
                  size="lg"
                  isLoading={generate.isPending}
                  leftIcon={!generate.isPending ? <Sparkles className="size-4" /> : undefined}
                >
                  Generate Content
                </Button>
              </div>
            </form>
          </div>

          {generate.isError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger animate-fade-in"
            >
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <span>{generationErrorMessage(generate.error)}</span>
            </div>
          )}

          {generate.isSuccess && result && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-text">Generated Content</h2>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-500">
                    Draft Complete
                  </span>
                </div>
                <GeneratedContentView content={result} />
              </div>

              {jobId && <PublishSchedulePanel jobId={jobId} title={lastPrompt} content={result} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
