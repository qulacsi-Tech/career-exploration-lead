"use client";

import dynamic from "next/dynamic";
import type { MockTest } from "@/lib/practice-data";

/**
 * Mounts the player on the client only.
 *
 * The player's opening state comes out of sessionStorage — whether there is a
 * sitting in progress, which question it stopped on, how much time is left.
 * None of that exists on the server, so server-rendering it would either throw
 * a hydration mismatch or, worse, paint question one over a paper the candidate
 * is halfway through.
 *
 * The route is already `noindex`, so nothing is lost by not rendering it ahead
 * of time. The fallback holds the viewport height to keep the swap from
 * jumping the page.
 */
const TestPlayer = dynamic(
  () => import("@/components/practice/test-player").then((m) => m.TestPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink-soft">Preparing your paper…</p>
      </div>
    ),
  },
);

export function TestPlayerMount({
  test,
  candidateName,
}: {
  test: MockTest;
  candidateName: string;
}) {
  return <TestPlayer test={test} candidateName={candidateName} />;
}
