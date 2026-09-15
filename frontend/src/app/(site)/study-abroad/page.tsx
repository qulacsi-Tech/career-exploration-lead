import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  destinations,
  applicationSteps,
  admissionTests,
  faqs,
  FIGURES_REVIEWED,
} from "@/lib/study-abroad-data";
import { ArrowUpRight, Building2, Calendar, Clock, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Study Abroad: Destinations, Costs & Application Timeline",
  description:
    "Compare study abroad destinations on tuition, living costs, post-study work rights and intakes, with the application timeline and the tests each one needs.",
  alternates: { canonical: "/study-abroad" },
};

/**
 * The Study Abroad landing page.
 *
 * It was in the header nav from the start with nothing behind it, so every
 * visitor who clicked it got a 404. The page answers the four things someone
 * at the start of this actually asks — where can I go, what will it cost, what
 * do I have to sit, and when do I start — rather than opening with a lead form.
 *
 * Server-rendered and static: it is reference content, and nothing on it
 * depends on the visitor.
 */
export default function StudyAbroadPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Study Abroad" }]} />

      {/* Intro */}
      <header className="mt-4 max-w-3xl">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          Study Abroad
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Six destinations, compared on what actually decides it
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          Tuition, living costs, post-study work rights and intake months — side by side, with the
          timeline to work back from and the tests each route needs.
        </p>
      </header>

      {/* Destinations */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-ink">Where students go</h2>
          <p className="text-xs text-ink-faint">
            Figures are indicative, reviewed {FIGURES_REVIEWED}
          </p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <article
              key={destination.slug}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-bg-alt">
                <Image
                  src={`/images/study-abroad/${destination.slug}.jpg`}
                  alt={`Studying in ${destination.country}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <h3 className="absolute bottom-4 left-5 font-display text-2xl font-bold text-white">
                  {destination.country}
                </h3>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm text-ink-soft">{destination.tagline}</p>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <Fact icon={Wallet} label="Tuition" value={destination.tuition} />
                  <Fact icon={Building2} label="Living" value={destination.living} />
                  <Fact icon={Clock} label="Post-study work" value={destination.postStudyWork} />
                  <Fact icon={Calendar} label="Intakes" value={destination.intakes} />
                </dl>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line-soft pt-4">
                  {destination.popularCourses.map((course) => (
                    <span
                      key={course}
                      className="rounded-lg bg-bg-alt px-2.5 py-1 text-[11px] font-medium text-ink-soft"
                    >
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-ink">The application year</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Work backwards from the intake you want. Each step below is dated relative to it.
        </p>

        <ol className="mt-8 grid gap-4 lg:grid-cols-5">
          {applicationSteps.map((step, index) => (
            <li
              key={step.title}
              className="relative flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                {step.window}
              </span>
              <h3 className="mt-1 font-display text-base font-bold leading-snug text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tests */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-ink">Tests you may need</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Nearly every route needs one language test. Aptitude tests depend on the course, not the
          country.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {admissionTests.map((test) => {
            const body = (
              <>
                <h3 className="font-display text-lg font-bold text-ink">{test.name}</h3>
                <p className="mt-1.5 text-sm leading-snug text-ink-soft">{test.purpose}</p>
                <p className="mt-3 text-xs text-ink-faint">Score valid for {test.validity}</p>
              </>
            );

            return test.href ? (
              <Link
                key={test.name}
                href={test.href}
                className="group rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand/50 hover:shadow-md"
              >
                {body}
              </Link>
            ) : (
              <div key={test.name} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                {body}
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-ink">Common questions</h2>

        <dl className="mt-6 divide-y divide-line-soft rounded-2xl border border-line bg-surface px-6 shadow-sm">
          {faqs.map((faq) => (
            <div key={faq.question} className="py-5">
              <dt className="font-display text-base font-bold text-ink">{faq.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Counselling CTA */}
      <section className="mt-16 flex flex-col items-start justify-between gap-5 rounded-2xl bg-brand p-8 sm:flex-row sm:items-center sm:px-10">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Not sure which country fits your budget?
          </h2>
          <p className="mt-1.5 text-sm text-white/80">
            Tell us your course, budget and intake, and a counsellor will map the realistic options.
          </p>
        </div>

        <Link
          href="/enquiry"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand shadow-sm transition hover:bg-brand-soft"
        >
          Request a call back
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

/** One labelled figure in a destination card. */
function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
        <dd className="text-sm font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}
