"use client";

import { useEffect } from "react";
import { RouteMessage, RouteAction } from "@/components/ui/route-message";

/**
 * The error boundary for the public site.
 *
 * Must be a client component — React needs `reset` to re-render the segment on
 * the client, and an error boundary cannot be a server component.
 *
 * `reset()` retries the failed segment without a full page load, which is worth
 * offering first: most failures here are a fetch that timed out rather than a
 * bug, and retrying usually works. The digest is shown because it is the only
 * handle support has on a production stack trace — the message itself is
 * redacted by React in production, deliberately.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Nothing is wired to a reporting service yet; the console at least keeps
    // the real error reachable in dev and in a browser session.
    console.error("Site error boundary:", error);
  }, [error]);

  return (
    <RouteMessage
      code="500"
      title="Something went wrong at our end"
      description="This page didn't load properly. It is usually temporary — trying again will often be enough."
    >
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
      >
        Try again
      </button>
      <RouteAction href="/">Back to homepage</RouteAction>

      {error.digest && (
        <p className="w-full text-xs text-ink-faint">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </RouteMessage>
  );
}
