import { Link } from "react-router-dom";

export default function BillingPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold">Billing &amp; Subscription</h1>
      <div className="glass-card space-y-4 rounded-2xl bg-surface/30 p-6 backdrop-blur-sm">
        <p className="font-semibold">Payments and subscriptions are unavailable in this MVP.</p>
        <p className="text-text-secondary">
          You can generate and review content without purchasing a subscription.
        </p>
        <Link to="/content/create" className="inline-block font-semibold text-primary underline">
          Create content
        </Link>
      </div>
    </div>
  );
}
