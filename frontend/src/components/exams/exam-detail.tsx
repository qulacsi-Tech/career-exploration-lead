import { ArticleSections } from "@/components/article-sections";
import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  Layers,
  Monitor,
  Repeat,
  Sparkles,
} from "lucide-react";
import { ExamCollegeCard } from "@/components/exams/exam-college-card";
import { ExamStatusBadge } from "@/components/exam-status-badge";
import { mediaUrl } from "@/lib/media";
import { TestCard } from "@/components/practice/test-card";
import { getColleges, getPracticeTests, type Exam } from "@/lib/api";
import { getCommunities } from "@/lib/community-api";
import { ActionButton } from "@/components/college/college-actions";
import { DeadlineCountdown } from "@/components/exams/deadline-countdown";
import { ExamTabs, type ExamTab } from "@/components/exams/exam-tabs";
import { ExamStatsCard } from "@/components/exams/exam-stats-card";
import { examShortName } from "@/lib/exam-insights";
import { pageTextReader } from "@/lib/exam-page-text";
import { collegeKey, examHref } from "@/lib/entity-url";

/** Plain text from the admin: a blank line starts a new paragraph. */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-ink-soft">
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
    </div>
  );
}

/** Heading with an accent bar, shared by every section. */
const H2 =
  "relative pl-4 font-display text-xl font-bold text-ink before:absolute before:bottom-1 before:left-0 before:top-1 before:w-1.5 before:rounded-full before:bg-brand sm:text-2xl";

/** A content card. */
function Section({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">{children}</section>;
}

/** A small playful line under a section heading. */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 pl-4 text-sm italic text-brand-ink/80">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
      {children}
    </p>
  );
}

/**
 * An exam's page (shared by /exams/<id>-<slug> and its /community tab), laid out like a college's: a masthead with the numbers that matter in big type, a tab rail over
 * the sections, and on the right how everyone did on the exam's mock tests and where the student stands among them.
 */
export async function ExamDetail({ exam, community }: { exam: Exam; community?: ReactNode }) {
  const slug = exam.slug;

  const shortName = examShortName(exam);
  // Every heading, line and button below: the admin's words (Exams, Edit, Page text) or the usual ones.
  const text = pageTextReader(exam.pageText, shortName);

  // Practice tests and the colleges accepting the exam, read together.
  const [practiceTests, acceptingAll] = await Promise.all([
    getPracticeTests(slug).catch(() => []),
    getColleges({ exam: shortName, limit: 50 })
      .then((res) => res.data)
      .catch(() => []),
  ]);
  // The order set in the admin (Exams, Edit, College priority) comes first; the rest keep the usual order.
  const priority = exam.collegePriority ?? {};
  const accepting = [...acceptingAll]
    .map((college, i) => ({ college, i }))
    .sort((a, b) => (priority[a.college.slug] ?? 1e6) - (priority[b.college.slug] ?? 1e6) || a.i - b.i)
    .map(({ college }) => college)
    .slice(0, 20);

  // Cutoff rows from the accepting colleges.
  const cutoffRows = accepting.flatMap((college) =>
    (college.cutoffs ?? [])
      .filter((cutoff) => cutoff.exam.toLowerCase() === shortName.toLowerCase())
      .map((cutoff) => ({ college, cutoff })),
  );

  const sectionCount = exam.sections?.length ?? 0;
  const facts = [
    { icon: CalendarClock, label: "Registration closes", value: exam.registrationCloses, accent: true },
    { icon: CalendarDays, label: "Exam date", value: exam.examDate },
    { icon: Monitor, label: "Mode", value: exam.mode },
    { icon: CreditCard, label: "Application fee", value: exam.applicationFee },
  ];

  /* ---------------------------------------------------------------- tabs */

  const overview = (
    <>
      <Section>
        <h2 className={H2}>{text("aboutHeading")}</h2>
        <Kicker>{text("aboutKicker")}</Kicker>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:font-extrabold first-letter:leading-none first-letter:text-brand">
          {exam.description}
        </p>
      </Section>

      <Section>
        <h2 className={H2}>{text("glanceHeading")}</h2>
        <Kicker>{text("glanceKicker")}</Kicker>
        <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Clock, label: "Duration", value: exam.durationMinutes ? String(exam.durationMinutes) : "—", unit: exam.durationMinutes ? "minutes" : "" },
            { icon: Layers, label: "Sections", value: sectionCount ? String(sectionCount) : "—", unit: sectionCount === 1 ? "section" : sectionCount ? "sections" : "" },
            { icon: ClipboardList, label: "Mock tests", value: String(practiceTests.length), unit: "ready to sit" },
            { icon: Repeat, label: "Held", value: exam.frequency || "—", unit: "", small: true },
          ].map(({ icon: Icon, label, value, unit, small }) => (
            <div key={label} className="group rounded-2xl bg-gradient-to-b from-brand-soft to-bg-alt px-4 py-4 text-center transition hover:-translate-y-0.5 hover:shadow-sm">
              <Icon className="mx-auto h-5 w-5 text-gold transition group-hover:-rotate-12" aria-hidden="true" />
              <dd className={`mt-1 bg-gradient-to-b from-brand to-brand-ink bg-clip-text font-display font-extrabold leading-none text-transparent ${small ? "text-xl" : "text-4xl"}`}>{value}</dd>
              <dt className="mt-1.5 text-xs font-bold text-ink-soft">
                {label}
                {unit && <span className="block font-medium text-ink-faint">{unit}</span>}
              </dt>
            </div>
          ))}
        </dl>
      </Section>

      {practiceTests.length > 0 && (
        <Section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={H2}>{text("warmupHeading")}</h2>
              <Kicker>{text("warmupKicker")}</Kicker>
            </div>
            <Link href={`${examHref(exam)}/practice`} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark">
              All {practiceTests.length} mock tests <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {practiceTests.slice(0, 2).map((test) => (
              <TestCard key={test.slug} test={test} />
            ))}
          </div>
        </Section>
      )}
    </>
  );

  const tabs: ExamTab[] = [{ id: "overview", label: "Overview", content: overview }];

  if (exam.eligibility) {
    tabs.push({
      id: "eligibility",
      label: "Eligibility",
      content: (
        <Section>
          <h2 className={H2}>{text("eligibilityHeading")}</h2>
          <Kicker>{text("eligibilityKicker")}</Kicker>
          <Paragraphs text={exam.eligibility} />
        </Section>
      ),
    });
  }

  if (sectionCount > 0 || exam.syllabus) {
    tabs.push({
      id: "pattern",
      label: "Pattern & syllabus",
      content: (
        <>
          {sectionCount > 0 && (
            <Section>
              <h2 className={H2}>{text("patternHeading")}</h2>
              <Kicker>
                {sectionCount} {sectionCount === 1 ? "section" : "sections"}
                {exam.durationMinutes ? `, ${exam.durationMinutes} minutes` : ""}. {text("patternKicker")}
              </Kicker>
              <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                {exam.sections!.map((section, i) => (
                  <li key={section} className="flex items-center gap-4 rounded-2xl border border-line bg-bg-alt px-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand font-display text-lg font-extrabold text-white">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink" title={section}>{section}</p>
                      <p className="text-xs text-ink-soft">
                        {exam.mode ?? "Mode TBA"}
                        {exam.durationMinutes ? (
                          <>
                            {" · "}
                            <span className="font-display font-extrabold text-brand">{Math.round(exam.durationMinutes / sectionCount)}</span> min
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}
          {exam.syllabus && (
            <Section>
              <h2 className={H2}>{text("syllabusHeading")}</h2>
              <Kicker>{text("syllabusKicker")}</Kicker>
              <Paragraphs text={exam.syllabus} />
            </Section>
          )}
        </>
      ),
    });
  }

  if (practiceTests.length > 0) {
    tabs.push({
      id: "practice",
      label: "Mock tests",
      count: practiceTests.length,
      content: (
        <Section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={H2}>{text("practiceHeading")}</h2>
              <Kicker>{text("practiceKicker")}</Kicker>
            </div>
            <Link href={`${examHref(exam)}/practice`} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark">
              Open the practice room <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {practiceTests.map((test) => (
              <TestCard key={test.slug} test={test} />
            ))}
          </div>
        </Section>
      ),
    });
  }

  if (exam.contentSections && exam.contentSections.length > 0) {
    tabs.push({
      id: "guide",
      label: text("guideTab"),
      content: (
        // The sections are cards of their own, so they are not wrapped in another one.
        <div className="[&>div]:mt-0 [&>div]:max-w-none">
          <ArticleSections sections={exam.contentSections} />
        </div>
      ),
    });
  }

  if (cutoffRows.length > 0) {
    tabs.push({
      id: "cutoffs",
      label: "Cut-offs",
      count: cutoffRows.length,
      content: (
        <Section>
          <h2 className={H2}>{text("cutoffsHeading")}</h2>
          <Kicker>{text("cutoffsKicker")}</Kicker>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-alt text-left text-xs text-ink-faint">
                  <th scope="col" className="px-3 py-2.5 font-semibold">College</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Category</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Cut-off</th>
                </tr>
              </thead>
              <tbody>
                {cutoffRows.map(({ college, cutoff }) => (
                  <tr key={`${college.slug}-${cutoff.category}`} className="border-b border-line-soft last:border-b-0">
                    <td className="px-3 py-3">
                      <Link href={`/college/${collegeKey(college)}`} className="font-medium text-ink hover:text-brand">
                        {college.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{cutoff.category}</td>
                    <td className="px-3 py-3 text-right font-display text-lg font-extrabold text-brand">{cutoff.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ),
    });
  }

  if (accepting.length > 0) {
    tabs.push({
      id: "colleges",
      label: "Colleges",
      count: accepting.length,
      content: (
        <>
          <div>
            <h2 className={H2}>{text("collegesHeading")}</h2>
            <Kicker>{text("collegesKicker")}</Kicker>
          </div>
          <div className="space-y-3">
            {accepting.map((college, i) => (
              <ExamCollegeCard key={college.slug} college={college} place={i + 1} examShort={shortName} />
            ))}
          </div>
        </>
      ),
    });
  }

  if (exam.faqs && exam.faqs.length > 0) {
    tabs.push({
      id: "faqs",
      label: "FAQs",
      count: exam.faqs.length,
      content: (
        <Section>
          <h2 className={H2}>{text("faqsHeading")}</h2>
          <Kicker>{text("faqsKicker")}</Kicker>
          <div className="mt-5 space-y-3">
            {exam.faqs.map((faq, i) => (
              <details key={faq.question} className="group rounded-xl border border-line bg-bg-alt open:bg-surface open:shadow-sm" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4 font-semibold text-ink">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">Q</span>
                  <span className="flex-1">{faq.question}</span>
                  <span aria-hidden="true" className="text-brand transition group-open:rotate-45">+</span>
                </summary>
                <p className="px-4 pb-4 pl-13 text-sm leading-relaxed text-ink-soft">{faq.answer}</p>
              </details>
            ))}
          </div>
        </Section>
      ),
    });
  }

  // Community: a tab of its own with its own address (/exams/<id>-<slug>/community). Its feed depends on who is
  // signed in, so it is rendered only there; on this page the tab is a link to it.
  const communityPath = `${examHref(exam)}/community`;
  const communityPosts = (await getCommunities()).find((c) => c.examSlug === slug)?.posts;
  tabs.push(
    community
      ? { id: "community", label: "Community", count: communityPosts, path: communityPath, content: community }
      : { id: "community", label: "Community", count: communityPosts, href: communityPath },
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Exams", href: "/exams" },
          ...(community ? [{ label: exam.name, href: examHref(exam) }, { label: "Community" }] : [{ label: exam.name }]),
        ]}
      />

      <header className="relative mt-4 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-[11px] font-bold tracking-wide text-white">{exam.level}</span>
        <div className="bg-gradient-to-br from-brand-soft via-bg-alt to-surface p-5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 pr-16 sm:gap-5">
              {exam.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(exam.image)} alt="" className="h-20 w-20 shrink-0 rounded-2xl border border-line bg-white object-cover shadow-sm sm:h-24 sm:w-24" />
              ) : (
                <span aria-hidden className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-line bg-surface font-display text-2xl font-extrabold text-brand shadow-sm sm:h-24 sm:w-24">
                  {shortName.slice(0, 4)}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{exam.name}</h1>
                  <ExamStatusBadge label={exam.statusLabel} />
                </div>
                <p className="mt-1.5 text-base text-ink-soft">
                  Conducted by <span className="font-semibold text-ink">{exam.conductingBody}</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {exam.stream && <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-ink shadow-sm">{exam.stream}</span>}
                  {practiceTests.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-3 py-1 text-xs font-bold text-gold">
                      <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {practiceTests.length} {practiceTests.length === 1 ? "mock test" : "mock tests"}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-sm italic text-brand-ink/80">
                    <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                    {text("tagline", exam.level === "National" ? "One paper, doors across the country." : "Your ticket to the state's top seats.")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4 self-start lg:self-center">
              {/* The registration countdown: the number to act on. */}
              <div className="rounded-2xl bg-surface px-5 py-3 shadow-sm ring-1 ring-line">
                <DeadlineCountdown date={exam.registrationCloses} size="hero" />
              </div>
              <div className="flex flex-col gap-2">
                <ActionButton
                  kind="callback"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
                >
                  {text("alertsButton")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ActionButton>
                {practiceTests.length > 0 && (
                  <Link
                    href={`${examHref(exam)}/practice`}
                    className="inline-flex items-center justify-center rounded-lg border border-brand bg-surface px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-brand-soft"
                  >
                    {text("mockButton")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 divide-line-soft border-t border-line-soft sm:grid-cols-4 sm:divide-x">
          {facts.map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="group flex items-center gap-3 px-5 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:scale-110">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs font-bold text-ink-faint">{label}</dt>
                <dd className={`mt-0.5 truncate font-display text-lg font-extrabold ${accent ? "text-brand" : "text-ink"}`} title={value || undefined}>
                  {value || "TBA"}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <ExamTabs tabs={tabs} examSlug={slug} basePath={examHref(exam)} initial={community ? "community" : undefined} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:mt-6 lg:self-start">
          <ExamStatsCard examSlug={slug} shortName={shortName} hasTests={practiceTests.length > 0} />

          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-bold text-brand-ink">{text("keyDatesTitle")}</p>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Registration closes", exam.registrationCloses || "To be announced", true],
                ["Exam date", exam.examDate || "To be announced", false],
                ...(exam.mode ? [["Mode", exam.mode, false] as const] : []),
                ...(exam.frequency ? [["Frequency", exam.frequency, false] as const] : []),
                ...(exam.applicationFee ? [["Application fee", exam.applicationFee, false] as const] : []),
              ].map(([label, value, hot]) => (
                <div key={label as string} className="flex items-baseline justify-between gap-3">
                  <dt className="text-brand-ink/70">{label}</dt>
                  <dd className={`text-right font-display font-extrabold ${hot ? "text-base text-brand" : "text-brand-ink"}`}>{value}</dd>
                </div>
              ))}
            </dl>
            {exam.officialSite && (
              <a
                href={/^https?:\/\//i.test(exam.officialSite) ? exam.officialSite : `https://${exam.officialSite}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-4 block truncate text-xs font-semibold text-brand hover:underline"
              >
                Official site: {exam.officialSite.replace(/^https?:\/\//i, "")}
              </a>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display text-lg font-bold text-ink">{text("predictTitle")}</p>
            <p className="mt-2 text-sm text-ink-soft">
              {text("predictText")}
            </p>
            <ActionButton
              kind="callback"
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              {text("predictButton")}
            </ActionButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
