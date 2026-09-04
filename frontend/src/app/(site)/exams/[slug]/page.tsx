import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { CollegeCard } from "@/components/college-card";
import { exams, colleges } from "@/lib/mock-data";

export function generateStaticParams() {
  return exams.map((exam) => ({ slug: exam.slug }));
}

const getExam = (slug: string) => exams.find((exam) => exam.slug === slug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exam = getExam(slug);
  if (!exam) return { title: "Exam not found" };

  return {
    title: `${exam.name}: Dates, Registration, Pattern & Cutoffs`,
    description: exam.description,
    alternates: { canonical: `/exams/${exam.slug}` },
  };
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exam = getExam(slug);
  if (!exam) notFound();

  // Colleges naming this exam, matched on the short form the college record
  // uses ("CAT") rather than the exam's full title.
  const shortName = exam.name.replace(/\s*\(.*\)\s*/, "").trim();
  const accepting = colleges.filter((college) =>
    college.examsAccepted.some(
      (accepted) =>
        accepted.toLowerCase() === shortName.toLowerCase() ||
        exam.name.toLowerCase().includes(accepted.toLowerCase()),
    ),
  );

  // Cutoffs already on the college records for this exam — the highest-intent
  // thing on the page, so it is rendered rather than linked away to.
  const cutoffRows = colleges.flatMap((college) =>
    college.cutoffs
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

      <div className="mt-4 flex flex-col gap-4 border-b border-line pb-8 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{exam.name}</h1>
            <Chip tone="gold">{exam.level}</Chip>
          </div>
          <p className="mt-1 text-sm text-ink-soft">Conducted by {exam.conductingBody}</p>
        </div>
        <Link
          href="/enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Exam Alerts
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-12">
          <section id="about">
            <h2 className="font-display text-xl font-bold text-ink">About {shortName}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
              {exam.description}
            </p>
          </section>

          {exam.sections && exam.sections.length > 0 && (
            <section id="pattern">
              <h2 className="font-display text-xl font-bold text-ink">Exam pattern</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                      <th scope="col" className="py-2 pr-3 font-semibold">Section</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">Mode</th>
                      <th scope="col" className="py-2 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exam.sections.map((section) => (
                      <tr key={section} className="border-b border-line-soft last:border-b-0">
                        <td className="py-3 pr-3 font-medium text-ink">{section}</td>
                        <td className="py-3 pr-3 text-ink-soft">{exam.mode ?? "—"}</td>
                        <td className="py-3 text-ink-soft">
                          {exam.durationMinutes
                            ? `${Math.round(exam.durationMinutes / exam.sections!.length)} min`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {cutoffRows.length > 0 && (
            <section id="cutoffs">
              <h2 className="font-display text-xl font-bold text-ink">
                {shortName} cutoffs by college
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                      <th scope="col" className="py-2 pr-3 font-semibold">College</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">Category</th>
                      <th scope="col" className="py-2 font-semibold">Cutoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cutoffRows.map(({ college, cutoff }) => (
                      <tr
                        key={`${college.slug}-${cutoff.category}`}
                        className="border-b border-line-soft last:border-b-0"
                      >
                        <td className="py-3 pr-3">
                          <Link
                            href={`/college/${college.slug}`}
                            className="font-medium text-ink hover:text-brand"
                          >
                            {college.name}
                          </Link>
                        </td>
                        <td className="py-3 pr-3 text-ink-soft">{cutoff.category}</td>
                        <td className="py-3 font-medium text-ink">{cutoff.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {accepting.length > 0 && (
            <section id="colleges">
              <h2 className="font-display text-xl font-bold text-ink">
                Colleges accepting {shortName}
              </h2>
              <div className="mt-4 space-y-4">
                {accepting.map((college) => (
                  <CollegeCard key={college.slug} college={college} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display font-semibold text-ink">Key dates</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">Registration closes</dt>
                <dd className="font-medium text-ink">{exam.registrationCloses}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">Exam date</dt>
                <dd className="font-medium text-ink">{exam.examDate}</dd>
              </div>
              {exam.mode && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Mode</dt>
                  <dd className="font-medium text-ink">{exam.mode}</dd>
                </div>
              )}
              {exam.frequency && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Frequency</dt>
                  <dd className="font-medium text-ink">{exam.frequency}</dd>
                </div>
              )}
              {exam.applicationFee && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Application fee</dt>
                  <dd className="font-medium text-ink">{exam.applicationFee}</dd>
                </div>
              )}
            </dl>

            {exam.officialSite && (
              <a
                href={exam.officialSite}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-4 block truncate text-xs text-brand hover:underline"
              >
                {exam.officialSite}
              </a>
            )}
          </div>

          <div className="rounded-2xl border border-brand/30 bg-brand-soft p-5">
            <p className="font-display font-semibold text-brand-ink">Predict your college</p>
            <p className="mt-1 text-xs text-brand-ink/80">
              Tell us your expected {shortName} score and we will shortlist colleges you can target.
            </p>
            <Link
              href="/enquiry"
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
