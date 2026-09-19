import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { testBySlug } from "@/lib/practice-data";
import { TestPlayerMount } from "@/components/practice/test-player-mount";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const test = testBySlug(slug);
  return { title: test ? `${test.title} — in progress` : "Test not found" };
}

/**
 * A sitting of one paper.
 *
 * Server component down to the player, which is where the clock and the
 * responses live. The test record is resolved here so an unknown or unpublished
 * slug 404s before any of the player's machinery mounts.
 *
 * The attempt itself is not addressed in the URL yet: with no backend there is
 * one in-progress sitting per paper, held in sessionStorage. When attempts are
 * persisted this becomes `/practice/attempt/<attemptId>` and the test is read
 * from the attempt instead — the player above does not change.
 */
export default async function AttemptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const test = testBySlug(slug);
  if (!test || !test.isPublished) notFound();

  /*
    Hard-coded until workstream H lands a session. The gate (workstream S) is
    what decides whether an anonymous visitor reaches this route at all; this is
    only the name on the header.
  */
  const candidateName = "Guest Candidate";

  return <TestPlayerMount test={test} candidateName={candidateName} />;
}
