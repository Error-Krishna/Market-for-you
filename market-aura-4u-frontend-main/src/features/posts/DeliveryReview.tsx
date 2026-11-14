import { useState } from "react";
import { useResolveDelivery } from "./usePosts";
import { getScheduledPostId, type ScheduledPost } from "./posts.types";

export function DeliveryReview({ post }: { post: ScheduledPost }) {
  const [verified, setVerified] = useState(false);
  const [ended, setEnded] = useState(false);
  const review = useResolveDelivery();
  const uncertain = post.platforms
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.outcomeUnknown || entry.retryable);
  const record = (index: number, outcome: "published" | "not_published") => {
    review.mutate(
      { id: getScheduledPostId(post), platformIndex: index, outcome },
      {
        onSuccess: () => {
          setVerified(false);
          setEnded(false);
        },
      },
    );
  };
  if (!post.deliveryOutcomeUnknown && uncertain.length === 0) return null;
  return (
    <section
      aria-label="Review delivery outcomes"
      className="space-y-3 rounded-lg border border-amber-500 p-4"
    >
      <h3 className="font-semibold">Review delivery outcomes</h3>
      <p>
        Check each platform for the post and ensure the previous attempt has ended before recording
        its outcome. Recording a review does not publish.
      </p>
      <label className="block">
        <input
          type="checkbox"
          checked={verified}
          onChange={(event) => setVerified(event.target.checked)}
        />{" "}
        I checked the platform for this post.
      </label>
      <label className="block">
        <input
          type="checkbox"
          checked={ended}
          onChange={(event) => setEnded(event.target.checked)}
        />{" "}
        I confirmed the previous attempt has ended.
      </label>
      {uncertain.length === 0 && (
        <p>No platform outcome is available for review. Contact support.</p>
      )}
      {uncertain.map(({ entry, index }) => (
        <div key={index} className="flex flex-wrap gap-2 items-center">
          <span>{entry.platform}</span>
          <button
            type="button"
            aria-label={`Already published on ${entry.platform}`}
            className="rounded border px-3 py-1 disabled:opacity-50"
            disabled={!verified || !ended || review.isPending}
            onClick={() => record(index, "published")}
          >
            Already published
          </button>
          <button
            type="button"
            aria-label={`Not published on ${entry.platform}`}
            className="rounded border px-3 py-1 disabled:opacity-50"
            disabled={!verified || !ended || review.isPending}
            onClick={() => record(index, "not_published")}
          >
            Not published
          </button>
        </div>
      ))}
      {review.isError && (
        <p role="alert">Could not record the outcome. Please refresh and try again.</p>
      )}
      {review.isSuccess && (
        <p role="status">Review recorded. You can retry separately if needed.</p>
      )}
    </section>
  );
}
