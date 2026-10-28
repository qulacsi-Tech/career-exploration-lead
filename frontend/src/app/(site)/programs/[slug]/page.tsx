import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Clock, GraduationCap, IndianRupee, MapPin, Star, Trophy } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getProgram, type ProgramInstitution } from "@/lib/api";
import { formatDuration, formatFees } from "@/lib/program-format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) return { title: "Programme not found" };
  const many = (program.institutions?.length ?? 1) > 1;
  return {
    title: many ? `${program.name}: Fees & Duration at ${program.institutions!.length} Institutions` : `${program.name} — ${program.university}: Fees & Duration`,
    description: many
      ? `${program.name} compared across ${program.institutions!.length} institutions: duration and fees for online and on-campus study.`
      : `${program.name} at ${program.university}: duration and fees for online and on-campus study.`,
    alternates: { canonical: `/programs/${program.slug}` },
  };
}

const has = (value?: string | null) => Boolean(value?.trim());

/** The modes an institution offers this programme in, with the figures it has: nothing is drawn for a blank. */
function modesOf(i: ProgramInstitution) {
  return [
    { title: "Online", duration: i.online.duration, fees: i.online.fees, note: i.online.feesNote },
    { title: "On campus", duration: i.onCampus.duration, fees: i.onCampus.fees, note: null },
  ].filter((m) => has(m.duration) || has(m.fees));
}

/** The figures of one delivery mode. */
function ModeFigures({ duration, fees, note }: { duration?: string | null; fees?: string | null; note?: string | null }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {has(duration) && (
        <div className="flex items-start gap-3">
          <Clock aria-hidden className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <dt className="text-xs text-ink-faint">Duration</dt>
            <dd className="font-semibold text-ink">{formatDuration(duration ?? undefined)}</dd>
          </div>
        </div>
      )}
      {has(fees) && (
        <div className="flex items-start gap-3">
          <IndianRupee aria-hidden className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <dt className="text-xs text-ink-faint">Fees</dt>
            <dd className="font-semibold text-ink">
              {formatFees(fees ?? undefined)} {note && <span className="text-xs font-normal text-ink-faint">{note}</span>}
            </dd>
          </div>
        </div>
      )}
    </dl>
  );
}

/** What the directory knows of the institution, as a line of facts. Empty when it is not in the directory. */
function InstitutionFacts({ i }: { i: ProgramInstitution }) {
  if (!i.inDirectory) return null;
  const place = [i.city, i.state].filter(Boolean).join(", ");
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
      {place && (
        <span className="inline-flex items-center gap-1">
          <MapPin aria-hidden className="h-3.5 w-3.5 text-brand" />
          {place}
        </span>
      )}
      {i.ownership && <span>{i.ownership}</span>}
      {i.rankingRank ? (
        <span className="inline-flex items-center gap-1">
          <Trophy aria-hidden className="h-3.5 w-3.5 text-brand" />
          {i.rankingAuthority ? `${i.rankingAuthority} ` : "Rank "}
          {i.rankingRank}
        </span>
      ) : null}
      {i.rating ? (
        <span className="inline-flex items-center gap-1">
          <Star aria-hidden className="h-3.5 w-3.5 text-brand" />
          {i.rating.toFixed(1)}
          {i.reviewCount ? ` (${i.reviewCount})` : ""}
        </span>
      ) : null}
    </p>
  );
}

/** Where an institution's own links go: its college page when it has one, the counselling form when it does not. */
function Actions({ i, programName }: { i: ProgramInstitution; programName: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {i.inDirectory ? (
        <>
          <Link
            href={`/college/${i.universitySlug}?enquire=1&program=${encodeURIComponent(programName)}#courses`}
            data-track="cta_enquiry"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Enquire now
          </Link>
          <Link href={`/college/${i.universitySlug}`} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand">
            View college
          </Link>
        </>
      ) : (
        <Link href="/enquiry" data-track="cta_enquiry" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Get free counselling
        </Link>
      )}
    </div>
  );
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();

  // The record asked for, then the same programme at other institutions. An older response with no list is one institution.
  const institutions: ProgramInstitution[] = program.institutions?.length
    ? program.institutions
    : [{ slug: program.slug, university: program.university, universitySlug: program.universitySlug, inDirectory: false, online: program.online, onCampus: program.onCampus }];
  const many = institutions.length > 1;
  const only = institutions[0];
  const offeredOnline = institutions.some((i) => has(i.online.duration) || has(i.online.fees));
  const offeredOnCampus = institutions.some((i) => has(i.onCampus.duration) || has(i.onCampus.fees));
  const delivery = [offeredOnline && "Online", offeredOnCampus && "On campus"].filter(Boolean).join(" and ");

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
            {many ? (
              <p className="mt-2 text-sm text-ink-soft">
                Offered at {institutions.length} institutions{delivery ? `, ${delivery.toLowerCase()}` : ""}.
              </p>
            ) : only.inDirectory ? (
              <Link href={`/college/${only.universitySlug}`} className="mt-2 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-ink hover:text-brand">
                {only.university}
              </Link>
            ) : (
              <p className="mt-2 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-ink">{only.university}</p>
            )}
            {!many && <InstitutionFacts i={only} />}
          </div>
        </div>
        <div className="mt-5">
          <Link href="/enquiry" data-track="cta_enquiry" className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
            Get free counselling
          </Link>
        </div>
      </header>

      {many ? (
        <section className="mt-6" aria-labelledby="offered-at">
          <h2 id="offered-at" className="flex items-center gap-3 font-display text-xl font-bold text-ink">
            <span aria-hidden className="h-6 w-1.5 rounded-full bg-brand" />
            Where you can study it
          </h2>
          <ul className="mt-4 space-y-4">
            {institutions.map((i) => {
              const modes = modesOf(i);
              const here = i.slug === program.slug;
              return (
                <li key={i.slug} className={`rounded-2xl border bg-surface p-5 sm:p-6 ${here ? "border-brand" : "border-line"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold text-ink">{i.university}</h3>
                      <InstitutionFacts i={i} />
                    </div>
                    {here && <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand-ink">You opened this one</span>}
                  </div>
                  {modes.length > 0 ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {modes.map((m) => (
                        <div key={m.title} className="rounded-xl border border-line-soft bg-bg-alt/50 p-4">
                          <p className="mb-3 text-xs font-semibold text-ink-faint">{m.title}</p>
                          <ModeFigures duration={m.duration} fees={m.fees} note={m.note} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-ink-soft">Duration and fees have not been published yet.</p>
                  )}
                  <Actions i={i} programName={program.name} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="mt-6 space-y-6">
          {modesOf(only).length > 0 ? (
            modesOf(only).map((m) => (
              <section key={m.title} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <h2 className="flex items-center gap-3 font-display text-xl font-bold text-ink">
                  <span aria-hidden className="h-6 w-1.5 rounded-full bg-brand" />
                  {m.title}
                </h2>
                <div className="mt-4">
                  <ModeFigures duration={m.duration} fees={m.fees} note={m.note} />
                </div>
              </section>
            ))
          ) : (
            <p className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-soft">Duration and fees have not been published yet.</p>
          )}
          <Actions i={only} programName={program.name} />
        </div>
      )}
    </div>
  );
}
