import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Sparkles } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { useGenerateContent } from "@/features/content";
import { GeneratedContentView } from "@/features/content/components/GeneratedContentView";
import { generationErrorMessage } from "@/features/content/api/generation-error";
import type { GeneratedContent } from "@/features/content/types/content.types";
import { ManualBroadcastComposer, PublishSchedulePanel } from "@/features/posts";

const schema = z.object({
  prompt: z.string().min(5, "Please provide at least 5 characters."),
});

type FormData = z.infer<typeof schema>;

export default function CreateContentPage() {
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");

  const generate = useGenerateContent();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      prompt: "",
    },
  });

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

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create &amp; Publish</h1>
          <p className="mt-1 text-text-secondary">
            Generate tailored AI content per platform or compose a manual broadcast — then post or
            auto-schedule everything from one place.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-border/60 bg-surface/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "ai"
                ? "bg-primary text-white shadow"
                : "text-text-secondary hover:text-text"
            }`}
          >
            <Sparkles className="size-3.5" />
            AI Content Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "manual"
                ? "bg-primary text-white shadow"
                : "text-text-secondary hover:text-text"
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="prompt" className="mb-2 block text-sm font-medium">
                Your Idea / Prompt
              </label>

              <textarea
                id="prompt"
                {...register("prompt")}
                rows={5}
                className="w-full rounded-2xl border border-border/50 bg-surface/30 p-4 text-sm backdrop-blur-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g., Write a launch post for our new product..."
              />

              {errors.prompt && <p className="mt-1 text-sm text-danger">{errors.prompt.message}</p>}
            </div>

            <Button type="submit" size="lg" isLoading={generate.isPending}>
              Generate Content
            </Button>
          </form>

          {generate.isError && (
            <div
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              {generationErrorMessage(generate.error)}
            </div>
          )}

          {generate.isSuccess && result && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Generated Content</h2>
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
