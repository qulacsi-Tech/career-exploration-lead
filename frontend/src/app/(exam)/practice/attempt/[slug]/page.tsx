import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user-session";
import type { Metadata } from "next";
import { getPracticeTest } from "@/lib/api";
import { TestPlayerMount } from "@/components/practice/test-player-mount";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const test = await getPracticeTest(slug);
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
  const test = await getPracticeTest(slug);
  if (!test || !test.isPublished) notFound();

  // Taking a paper needs an account: someone who is not signed in logs in first and comes straight back here.
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/practice/attempt/${slug}`)}`);
  const candidateName = user.name;

  return <TestPlayerMount test={test} candidateName={candidateName} />;
}
