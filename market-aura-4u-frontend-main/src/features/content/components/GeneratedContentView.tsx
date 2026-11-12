import type {
  GeneratedContent,
  GroundingMetadata,
  InstagramCarouselSlide,
  InstagramContent,
  TwitterContent,
} from "../types/content.types";
import { Button } from "@/components/ui/Button";

export function GeneratedContentView({ content }: { content: GeneratedContent | undefined }) {
  if (!content || typeof content !== "object") return null;

  const twitter = Array.isArray(content.twitter) ? content.twitter.filter(isTwitterContent) : [];
  const linkedin = stringItems(content.linkedin);
  const facebook = stringItems(content.facebook);
  const blog = stringItems(content.blog);
  const instagram = isInstagramContent(content.instagram) ? content.instagram : undefined;
  const email = isEmailContent(content.email) ? content.email : undefined;

  return (
    <div className="mt-5 space-y-4">
      {twitter.map((post, index) => (
        <ContentCard key={`twitter-${index}`} platform="Twitter / X" content={post.text} />
      ))}
      {linkedin.map((post, index) => (
        <ContentCard key={`linkedin-${index}`} platform="LinkedIn" content={post} />
      ))}
      {facebook.map((post, index) => (
        <ContentCard key={`facebook-${index}`} platform="Facebook" content={post} />
      ))}
      {blog.map((post, index) => (
        <ContentCard key={`blog-${index}`} platform="Blog" content={post} />
      ))}
      {instagram && (
        <div className="space-y-3">
          <ContentCard platform="Instagram" content={instagram.caption} />
          {instagram.content_type === "carousel" &&
            Array.isArray(instagram.slides) &&
            instagram.slides.length > 0 && (
              <section aria-label="Instagram carousel slides" className="space-y-3">
                <h3 className="text-lg font-medium">Carousel slides</h3>
                <ol className="grid gap-3 sm:grid-cols-2">
                  {instagram.slides.filter(isCarouselSlide).map((slide, index) => (
                    <li
                      key={`${slide.slide_number}-${index}`}
                      className="rounded-2xl border border-border bg-surface/30 p-5 backdrop-blur-sm"
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        Slide {slide.slide_number || index + 1}
                      </p>
                      <h4 className="font-medium">{slide.headline}</h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                        {slide.body}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
        </div>
      )}
      {email && <ContentCard platform="Email" content={`${email.subject}\n\n${email.body}`} />}
      {isGroundingMetadata(content.grounding) && <GroundingCard grounding={content.grounding} />}
    </div>
  );
}

function ContentCard({ platform, content }: { platform: string; content: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/30 p-6 backdrop-blur-sm">
      <h3 className="mb-3 text-lg font-medium">{platform}</h3>
      <p className="whitespace-pre-wrap text-text-secondary">{content}</p>
      <div className="mt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void navigator.clipboard?.writeText(content)}
        >
          Copy
        </Button>
      </div>
    </div>
  );
}

function GroundingCard({ grounding }: { grounding: GroundingMetadata }) {
  const recommendation = isRecord(grounding.recommendation) ? grounding.recommendation : null;
  const contentType =
    nestedString(recommendation?.recommended_content_type, "value") ??
    safeString(recommendation?.recommended_format);
  const postingTime = formatPostingTime(recommendation?.recommended_posting_time);
  const engagement = isRecord(recommendation?.predicted_engagement)
    ? recommendation.predicted_engagement
    : null;
  const predictedLikes = isRecord(recommendation?.engagement_prediction)
    ? recommendation.engagement_prediction.predicted_likes
    : undefined;
  const reason = safeString(grounding.reason);

  return (
    <section
      aria-label="ML recommendation grounding"
      className="rounded-2xl border border-border bg-surface/30 p-6 backdrop-blur-sm"
    >
      <h3 className="text-lg font-medium">Recommendation guidance</h3>
      <p className="mt-1 text-sm text-text-secondary">
        {grounding.isGrounded
          ? "This content was guided by the ML recommender."
          : "This content was generated without ML recommendation guidance."}
      </p>

      {grounding.isGrounded && recommendation && (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {contentType && (
            <div>
              <dt className="font-medium">Suggested format</dt>
              <dd className="text-text-secondary">{contentType}</dd>
            </div>
          )}
          {postingTime && (
            <div>
              <dt className="font-medium">Recommended posting time</dt>
              <dd className="text-text-secondary">{postingTime}</dd>
            </div>
          )}
          {typeof engagement?.value === "number" && Number.isFinite(engagement.value) && (
            <div>
              <dt className="font-medium">Estimated engagement</dt>
              <dd className="text-text-secondary">
                {(engagement.value * 100).toFixed(2)}%
                {safeString(engagement.label) ? ` (${safeString(engagement.label)})` : ""}
              </dd>
            </div>
          )}
          {typeof predictedLikes === "number" && Number.isFinite(predictedLikes) && (
            <div>
              <dt className="font-medium">Estimated likes</dt>
              <dd className="text-text-secondary">{predictedLikes}</dd>
            </div>
          )}
        </dl>
      )}

      {!grounding.isGrounded && reason && (
        <p className="mt-3 text-sm text-text-secondary">{reason}</p>
      )}
    </section>
  );
}

function formatPostingTime(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (isRecord(value)) {
    const day = safeString(value.day);
    const start = safeString(value.start);
    const end = safeString(value.end);
    const timezone = safeString(value.timezone);
    const parts: string[] = [];
    if (day) parts.push(day);
    if (start && end) {
      parts.push(`${start} – ${end}`);
    } else if (start) {
      parts.push(start);
    }
    if (parts.length === 0) return undefined;
    const timeText = parts.join(", ");
    return timezone ? `${timeText} (${timezone})` : timeText;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function nestedString(value: unknown, key: string): string | undefined {
  return isRecord(value) ? safeString(value[key]) : undefined;
}

function stringItems(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function isTwitterContent(value: unknown): value is TwitterContent {
  return isRecord(value) && typeof value.text === "string";
}

function isInstagramContent(value: unknown): value is InstagramContent {
  return isRecord(value) && typeof value.caption === "string";
}

function isCarouselSlide(value: unknown): value is InstagramCarouselSlide {
  return (
    isRecord(value) &&
    typeof value.slide_number === "number" &&
    typeof value.headline === "string" &&
    typeof value.body === "string"
  );
}

function isEmailContent(value: unknown): value is { subject: string; body: string } {
  return isRecord(value) && typeof value.subject === "string" && typeof value.body === "string";
}

function isGroundingMetadata(value: unknown): value is GroundingMetadata {
  return isRecord(value) && typeof value.isGrounded === "boolean";
}
