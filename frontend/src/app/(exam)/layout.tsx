import type { Metadata } from "next";

/**
 * Chrome for the test player: none.
 *
 * The player sits outside `(site)` deliberately. A candidate under a clock does
 * not need the marketing header, the footer or the compare tray — and a stray
 * link out of a timed paper is a candidate who loses their sitting to a
 * misclick. The player draws its own header, which carries the only things that
 * belong on screen: who is sitting, which paper, and how long is left.
 */
export const metadata: Metadata = {
  // Per-attempt, and there is nothing here to rank for. The test list and
  // instructions pages are the indexable surface; this is not.
  robots: { index: false, follow: false },
};

export default function ExamLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-screen bg-bg">{children}</div>;
}
