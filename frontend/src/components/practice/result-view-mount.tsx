"use client";

import dynamic from "next/dynamic";
import type { MockTest } from "@/lib/practice-data";

/**
 * Mounts the result on the client only — the same reasoning as
 * `test-player-mount`, and for the same reason.
 *
 * The attempt lives in sessionStorage until there is an API to read it from.
 * On the server that lookup finds nothing, so the component renders its
 * "no attempt found" state; on the client it finds the sitting and renders the
 * score. React sees two different trees and throws a hydration mismatch.
 *
 * Skipping SSR is the honest fix rather than a workaround: a result is one
 * candidate's private score, it carries `noindex`, and there is nothing about
 * it a server could usefully render ahead of time.
 */
const ResultView = dynamic(
  () => import("@/components/practice/result-view").then((m) => m.ResultView),
  {
    ssr: false,
    /*
      Deliberately neutral. Falling back to the empty state would flash
      "we could not find that attempt" at a candidate whose result is about to
      appear — alarming, and wrong.
    */
    loading: () => (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center text-sm text-ink-soft sm:px-6">
        Working out your score…
      </div>
    ),
  },
);

export function ResultViewMount({
  test,
  acceptingColleges,
}: {
  test: MockTest;
  acceptingColleges: { slug: string; name: string; city: string; feesRange: string }[];
}) {
  return <ResultView test={test} acceptingColleges={acceptingColleges} />;
}
