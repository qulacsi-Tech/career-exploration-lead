import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Clock, GraduationCap, IndianRupee } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getProgram } from "@/lib/api";
import { formatDuration, formatFees } from "@/lib/program-format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) return { title: "Programme not found" };
  return {
    title: `${program.name} — ${program.university}: Fees & Duration`,
    description: `${program.name} at ${program.university}: duration and fees for online and on-campus study.`,
    alternates: { canonical: `/programs/${program.slug}` },
  };
}

/** One delivery mode: shown only when the programme is offered that way. */
function Mode({ title, duration, fees, note }: { title: string; duration?: string; fees?: string; note?: string }) {
  const hasDuration = Boolean(duration?.trim());
  const hasFees = Boolean(fees?.trim());
  if (!hasDuration && !hasFees) return null;
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-3 font-display text-xl font-bold text-ink">
        <span aria-hidden className="h-6 w-1.5 rounded-full bg-brand" />
        {title}
      </h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {hasDuration && (
          <div className="flex items-start gap-3">
            <Clock aria-hidden className="mt-0.5 h-5 w-5 text-brand" />
            <div>
              <dt className="text-xs text-ink-faint">Duration</dt>
              <dd className="font-semibold text-ink">{formatDuration(duration)}</dd>
            </div>
          </div>
        )}
        {hasFees && (
          <div className="flex items-start gap-3">
            <IndianRupee aria-hidden className="mt-0.5 h-5 w-5 text-brand" />
            <div>
              <dt className="text-xs text-ink-faint">Fees</dt>
              <dd className="font-semibold text-ink">
                {formatFees(fees)} {note && <span className="text-xs font-normal text-ink-faint">{note}</span>}
              </dd>
            </div>
          </div>
        )}
      </dl>
    </section>
  );
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Programmes" }, { label: program.name }]} />

      <header className="mt-4 rounded-2xl border border-line bg-gradient-to-br from-brand-soft via-bg-alt to-surface p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-brand shadow-sm">
            <GraduationCap className="h-8 w-8" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{program.name}</h1>
            <Link
              href={`/college/${program.universitySlug}`}
              className="mt-2 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-ink hover:text-brand"
            >
              {program.university}
            </Link>
          </div>
        </div>
        <div className="mt-5">
          <Link
            href="/enquiry"
            className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Get free counselling
          </Link>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <Mode title="Online" duration={program.online.duration} fees={program.online.fees} note={program.online.feesNote} />
        <Mode title="On campus" duration={program.onCampus.duration} fees={program.onCampus.fees} />
      </div>
    </div>
  );
}
