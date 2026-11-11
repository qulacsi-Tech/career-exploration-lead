import { notFound, redirect } from "next/navigation";
import { RetakeCountdown } from "@/components/practice/retake-countdown";
import { gapLabel, humanWait } from "@/lib/exam-insights";
import Link from "next/link";
import { getCurrentUser, getUserToken } from "@/lib/user-session";
import type { Metadata } from "next";
import { getAttemptStatus, getPracticeTest } from "@/lib/api";
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

  // The limit an admin set on this test: with none left the paper is not opened. A sitting already under way when
  // the limit was reached is still refused at submit, so the check here only saves the student a wasted paper.
  const token = await getUserToken();
  const status = token ? await getAttemptStatus(token, slug).catch(() => null) : null;
  if (status && status.left !== 0 && status.waitSeconds && status.nextAttemptAt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">Take a breather</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">You can re-attempt after {humanWait(status.waitSeconds)}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {test.title} asks for a gap of {gapLabel(status.gapMinutes ?? 0)} between attempts. Use it to go through your last result and the solutions.
        </p>
        <div className="mt-5 flex justify-center">
          <RetakeCountdown until={status.nextAttemptAt} refreshWhenDone />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/account/activity" className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark">See my scores</Link>
          <Link href={`/exams/${test.examSlug}/practice`} className="rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand">Other practice tests</Link>
        </div>
      </div>
    );
  }
  if (status && status.left === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">No attempts left</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {test.title} allows {status.allowed} {status.allowed === 1 ? "attempt" : "attempts"} for each student, and you have used {status.used === 1 ? "it" : "them all"}.
          Your scores are kept under My account, Activity.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/account/activity" className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark">See my scores</Link>
          <Link href={`/exams/${test.examSlug}/practice`} className="rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand">Other practice tests</Link>
        </div>
      </div>
    );
  }

  return <TestPlayerMount test={test} candidateName={candidateName} />;
}
