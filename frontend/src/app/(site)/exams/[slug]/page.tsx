import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ArrowRight, CalendarClock, CalendarDays, CreditCard, FileText, Monitor } from "lucide-react";
import { ListingCard } from "@/components/colleges/listing-card";
import { ExamStatusBadge } from "@/components/exam-status-badge";
import { mediaUrl } from "@/lib/media";
import { TestCard } from "@/components/practice/test-card";
import { getExam, getExamSlugs, getColleges, getPracticeTests } from "@/lib/api";

/** Plain text from the admin: a blank line starts a new paragraph. */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-ink-soft">
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
  "relative pl-4 font-display text-xl font-bold text-ink before:absolute before:bottom-1 before:left-0 before:top-1 before:w-1.5 before:rounded-full before:bg-brand";

/** A content section: a bordered card. */
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-44 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      {children}
    </section>
  );
}

export async function generateStaticParams() {
  try {
    const slugs = await getExamSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const exam = await getExam(slug);
    return {
      title: `${exam.name}: Dates, Registration, Pattern & Cutoffs`,
      description: exam.description,
      alternates: { canonical: `/exams/${exam.slug}` },
    };
  } catch {
    return { title: "Exam not found" };
  }
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let exam: Awaited<ReturnType<typeof getExam>>;
  try {
    exam = await getExam(slug);
  } catch {
    notFound();
  }

  // Short name: "Common Admission Test (CAT)" → "CAT"
  const shortName = exam.name.replace(/\s*\(.*\)\s*/, "").trim();

  // Practice tests for this exam, from the practice API
  const practiceTests = await getPracticeTests(slug);

  // Colleges accepting this exam — fetched live
  let accepting: Awaited<ReturnType<typeof getColleges>>["data"] = [];
  try {
    const res = await getColleges({ exam: shortName, limit: 10 });
    accepting = res.data;
  } catch {
    accepting = [];
  }

  // Cutoff rows derived from accepting colleges
  const cutoffRows = accepting.flatMap((college) =>
    (college.cutoffs ?? [])
      .filter((cutoff) => cutoff.exam.toLowerCase() === shortName.toLowerCase())
      .map((cutoff) => ({ college, cutoff })),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Exams", href: "/exams" },
          { label: exam.name },
        ]}
      />

      <header className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-[11px] font-bold tracking-wide text-white">
          {exam.level}
        </span>
        <div className="bg-gradient-to-br from-brand-soft via-bg-alt to-surface p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 pr-16">
              {exam.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(exam.image)}
                  alt={exam.name}
                  className="h-16 w-16 shrink-0 rounded-2xl border border-line object-cover shadow-sm"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-brand shadow-sm"
                >
                  <FileText className="h-8 w-8" />
                </span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{exam.name}</h1>
                  <ExamStatusBadge label={exam.statusLabel} />
                </div>
                <p className="mt-1 text-sm text-ink-soft">Conducted by {exam.conductingBody}</p>
                {exam.stream && (
                  <p className="mt-2 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-ink">
                    {exam.stream}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {practiceTests.length > 0 && (
                <Link
                  href={`/exams/${slug}/practice`}
                  className="inline-flex items-center rounded-lg border border-brand bg-surface px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft"
                >
                  Practice Tests
                </Link>
              )}
              <Link
                href="/enquiry" data-track="cta_enquiry"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                Get Exam Alerts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 divide-line-soft border-t border-line-soft sm:grid-cols-4 sm:divide-x">
          {[
            { icon: CalendarClock, label: "Registration Closes", value: exam.registrationCloses, accent: true },
            { icon: CalendarDays, label: "Exam Date", value: exam.examDate },
            { icon: Monitor, label: "Mode", value: exam.mode },
            { icon: CreditCard, label: "Application Fee", value: exam.applicationFee },
          ].map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-4">
              <Icon className="h-5 w-5 shrink-0 text-brand" />
              <div className="min-w-0">
                <dt className="text-xs text-ink-faint">{label}</dt>
                <dd className={`mt-0.5 truncate text-sm font-semibold ${accent ? "text-brand" : "text-ink"}`}>
                  {value || "—"}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </header>

      <nav
        aria-label="On this page"
        className="sticky top-[5.1rem] z-10 -mx-4 mt-6 flex gap-2 overflow-x-auto border-b border-line bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0 lg:top-[6.3rem]"
      >
        {[
          { id: "about", label: "About", show: true },
          { id: "eligibility", label: "Eligibility", show: !!exam.eligibility },
          { id: "practice", label: "Practice", show: practiceTests.length > 0 },
          { id: "pattern", label: "Pattern", show: !!exam.sections?.length },
          { id: "syllabus", label: "Syllabus", show: !!exam.syllabus },
          { id: "cutoffs", label: "Cutoffs", show: cutoffRows.length > 0 },
          { id: "colleges", label: "Colleges", show: accepting.length > 0 },
          { id: "faqs", label: "FAQs", show: !!exam.faqs?.length },
        ]
          .filter((l) => l.show)
          .map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className="shrink-0 rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-ink-soft transition hover:border-brand hover:bg-brand-soft hover:text-brand-ink"
            >
              {l.label}
            </a>
          ))}
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">

          {/* About */}
          <Section id="about">
            <h2 className={H2}>About {shortName}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">{exam.description}</p>
          </Section>

          {/* Eligibility, written in the admin */}
          {exam.eligibility && (
            <Section id="eligibility">
              <h2 className={H2}>{shortName} eligibility</h2>
              <Paragraphs text={exam.eligibility} />
            </Section>
          )}

          {/* Practice */}
          {practiceTests.length > 0 && (
            <Section id="practice">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className={H2}>Practice for {shortName}</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Mock papers in the real exam interface, with solutions and analysis.
                  </p>
                </div>
                <Link
                  href={`/exams/${slug}/practice`}
                  className="shrink-0 text-sm font-semibold text-brand hover:text-brand-dark"
                >
                  All practice tests
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {practiceTests.slice(0, 2).map((test) => (
                  <TestCard key={test.slug} test={test} />
                ))}
              </div>
            </Section>
          )}

          {/* Exam pattern */}
          {exam.sections && exam.sections.length > 0 && (
            <Section id="pattern">
              <h2 className={H2}>Exam pattern</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line bg-bg-alt text-left text-xs uppercase tracking-wide text-ink-faint">
                      <th scope="col" className="px-3 py-2.5 font-semibold">Section</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Mode</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exam.sections.map((section) => (
                      <tr key={section} className="border-b border-line-soft last:border-b-0">
                        <td className="px-3 py-3 font-medium text-ink">{section}</td>
                        <td className="px-3 py-3 text-ink-soft">{exam.mode ?? "—"}</td>
                        <td className="px-3 py-3 text-ink-soft">
                          {exam.durationMinutes
                            ? `${Math.round(exam.durationMinutes / exam.sections!.length)} min`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Syllabus, written in the admin */}
          {exam.syllabus && (
            <Section id="syllabus">
              <h2 className={H2}>{shortName} syllabus</h2>
              <Paragraphs text={exam.syllabus} />
            </Section>
          )}

          {/* Cutoffs */}
          {cutoffRows.length > 0 && (
            <Section id="cutoffs">
              <h2 className={H2}>
                {shortName} cutoffs by college
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line bg-bg-alt text-left text-xs uppercase tracking-wide text-ink-faint">
                      <th scope="col" className="px-3 py-2.5 font-semibold">College</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Category</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Cutoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cutoffRows.map(({ college, cutoff }) => (
                      <tr
                        key={`${college.slug}-${cutoff.category}`}
                        className="border-b border-line-soft last:border-b-0"
                      >
                        <td className="px-3 py-3">
                          <Link
                            href={`/college/${college.slug}`}
                            className="font-medium text-ink hover:text-brand"
                          >
                            {college.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-ink-soft">{cutoff.category}</td>
                        <td className="px-3 py-3 font-medium text-ink">{cutoff.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Accepting colleges */}
          {accepting.length > 0 && (
            <section id="colleges" className="scroll-mt-44">
              <h2 className={H2}>
                Colleges accepting {shortName}
              </h2>
              <div className="mt-4 space-y-4">
                {accepting.map((college) => (
                  <ListingCard key={college.slug} college={college} />
                ))}
              </div>
            </section>
          )}

          {/* FAQs, written in the admin */}
          {exam.faqs && exam.faqs.length > 0 && (
            <Section id="faqs">
              <h2 className={H2}>{shortName} FAQs</h2>
              <dl className="mt-4 space-y-4">
                {exam.faqs.map((faq) => (
                  <div key={faq.question} className="rounded-xl bg-bg-alt p-4">
                    <dt className="font-medium text-ink">{faq.question}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Key dates</p>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-brand-ink/70">Registration closes</dt>
                <dd className="text-right font-medium text-brand-ink">{exam.registrationCloses || "To be announced"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brand-ink/70">Exam date</dt>
                <dd className="text-right font-medium text-brand-ink">{exam.examDate || "To be announced"}</dd>
              </div>
              {exam.mode && (
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-ink/70">Mode</dt>
                  <dd className="text-right font-medium text-brand-ink">{exam.mode}</dd>
                </div>
              )}
              {exam.frequency && (
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-ink/70">Frequency</dt>
                  <dd className="text-right font-medium text-brand-ink">{exam.frequency}</dd>
                </div>
              )}
              {exam.applicationFee && (
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-ink/70">Application fee</dt>
                  <dd className="text-right font-medium text-brand-ink">{exam.applicationFee}</dd>
                </div>
              )}
            </dl>
            {exam.officialSite && (
              <a
                href={
                  /^https?:\/\//i.test(exam.officialSite)
                    ? exam.officialSite
                    : `https://${exam.officialSite}`
                }
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-4 block truncate text-xs font-medium text-brand hover:underline"
              >
                {exam.officialSite.replace(/^https?:\/\//i, "")}
              </a>
            )}
          </div>

          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Predict your college</p>
            <p className="mt-2 text-sm text-brand-ink/80">
              Tell us your expected {shortName} score and we will shortlist colleges you can target.
            </p>
            <Link
              href="/enquiry" data-track="cta_enquiry"
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Get a Shortlist
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
