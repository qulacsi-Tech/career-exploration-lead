import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, ShieldAlert, Users } from "lucide-react";
import { CommunityFeed } from "@/components/community/community-feed";
import { ExamDetail } from "@/components/exams/exam-detail";
import { getExam } from "@/lib/api";
import { examHref } from "@/lib/entity-url";
import { findByKey, resolveByKey } from "@/lib/entity-resolve";
import { examShortName, compactCount } from "@/lib/exam-insights";
import { getCommunityPosts, getExamCommunity, type CommunityPostsPage } from "@/lib/community-api";
import { getUserToken } from "@/lib/user-session";

/** Who is signed in decides what the tab shows, so it is rendered for each visit. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: key } = await params;
  const exam = await findByKey(key, getExam).catch(() => null);
  if (!exam) return { title: "Community not found" };
  const short = examShortName(exam);
  return {
    title: `${short} Community: Discussions, Tips & Achievements`,
    description: `Talk to other ${short} aspirants: ask questions, share suggestions and banners, and celebrate results.`,
    alternates: { canonical: `${examHref(exam)}/community` },
  };
}

/**
 * The exam's Community tab, at its own address: the exam's page (masthead, key facts, the tab rail) with Community
 * open. Every exam has its community, made with the exam; any signed-in student joins it directly. A visitor who is
 * not signed in reads the first few posts (the API cuts the list) and is asked to sign in for the rest.
 */
export default async function ExamCommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: key } = await params;
  const exam = await resolveByKey(key, getExam, (e) => `${examHref(e)}/community`);
  const short = examShortName(exam);
  const loginHref = `/login?next=${encodeURIComponent(`${examHref(exam)}/community`)}`;
  const token = await getUserToken();

  const data = await getExamCommunity(exam.slug, token);
  const community = data.community;
  let initial: CommunityPostsPage = { items: [], total: 0, offset: 0, hasMore: false, locked: false };
  if (community) initial = await getCommunityPosts(community.id, token).catch(() => initial);

  const panel = (
    <>
      <section className="rounded-2xl border border-line bg-gradient-to-br from-brand-soft via-surface to-bg-alt p-5 sm:p-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
          <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Community
        </p>
        <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">{short} Community</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">
          {community?.description || `Aspirants preparing for ${exam.name}: ask, share what works, post suggestions and celebrate results together.`}
        </p>
        {community && (
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-brand" aria-hidden="true" />
              <strong className="text-ink">{compactCount(community.members)}</strong> {community.members === 1 ? "member" : "members"}
            </span>
            <span>
              <strong className="text-ink">{compactCount(community.posts)}</strong> {community.posts === 1 ? "post" : "posts"}
            </span>
          </p>
        )}
      </section>

      {data.viewer.blocked && (
        <p role="status" className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Your account has been restricted from taking part in communities. You can still read everything here.
        </p>
      )}

      {community ? (
        <CommunityFeed communityId={community.id} examName={short} viewer={data.viewer} initial={initial} loginHref={loginHref} layout="tab" />
      ) : (
        // Only a community the team has restricted has no feed: every exam has one otherwise.
        <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-6 py-14 text-center">
          <p className="font-display text-lg font-bold text-ink">This community is not available right now.</p>
          <Link href={examHref(exam)} className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
            Back to {short}
          </Link>
        </div>
      )}
    </>
  );

  return <ExamDetail exam={exam} community={panel} />;
}
