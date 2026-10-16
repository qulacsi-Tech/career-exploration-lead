import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock, GraduationCap, IndianRupee, Landmark, Users } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ListingCard } from "@/components/colleges/listing-card";
import { ApiError, getColleges, getCourse, getCourseSlugs, getCourses, getExams } from "@/lib/api";

export async function generateStaticParams() {
  const slugs = await getCourseSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** The course, or null for an unknown slug. Any other failure still throws. */
async function loadCourse(slug: string) {
  try {
    return await getCourse(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await loadCourse(slug);
  if (!course) return { title: "Course not found" };

  return {
    title: `${course.name} (${course.fullName}): Fees, Eligibility & Colleges`,
    description: course.about,
    alternates: { canonical: `/courses/${course.slug}` },
  };
}

/** A content section: a card with an accent bar beside its heading. */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-44 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-3 font-display text-xl font-bold text-ink">
        <span aria-hidden className="h-6 w-1.5 rounded-full bg-brand" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await loadCourse(slug);
  if (!course) notFound();

  // Colleges that actually offer this course. The API matches the course name
  // or a variant of it ("MBA" vs "MBA (Online)"), so a management college that
  // runs no management programme of this kind is left out.
  const offering = await getColleges({ course: course.name, limit: 50 });

  // Fall back to the stream so the page is never an empty shell while the
  // directory is still small.
  const relatedColleges = offering.data.length
    ? offering.data
    : (await getColleges({ stream: course.stream, limit: 3 })).data;

  const [examDirectory, siblings] = await Promise.all([
    getExams({ limit: 100 }),
    getCourses({ stream: course.stream, limit: 12 })
      .then((r) => r.data)
      .catch(() => []),
  ]);
  const acceptedExams = examDirectory.data.filter((exam) =>
    course.examsAccepted.some((name) => exam.name.includes(name) || exam.slug === name.toLowerCase()),
  );
  // Exams the editor listed that the exam directory has no page for: still shown, as plain names.
  const unlistedExams = course.examsAccepted.filter(
    (name) => !acceptedExams.some((exam) => exam.name.includes(name) || exam.slug === name.toLowerCase()),
  );
  const otherCourses = siblings.filter((c) => c.slug !== course.slug).slice(0, 5);
  const courseSpecialisations = course.specialisations ?? [];

  const collegesHref = `/colleges?course=${encodeURIComponent(course.name)}`;
  const stats = [
    { icon: Clock, label: "Duration", value: course.duration },
    { icon: IndianRupee, label: "Average Fees", value: course.averageFees ?? "—" },
    { icon: Landmark, label: "Colleges", value: course.collegeCount.toLocaleString() },
    { icon: Users, label: "Modes", value: course.modes.join(", ") || "—" },
  ];
  const sections = [
    { id: "about", label: "About", show: true },
    { id: "eligibility", label: "Eligibility", show: true },
    { id: "exams", label: "Exams", show: acceptedExams.length + unlistedExams.length > 0 },
    { id: "specialisations", label: "Specialisations", show: courseSpecialisations.length > 0 },
    { id: "colleges", label: "Colleges", show: true },
  ].filter((s) => s.show);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Courses", href: "/courses" },
          { label: course.name },
        ]}
      />

      {/* Header card: identity, key facts, actions */}
      <header className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-[11px] font-bold tracking-wide text-white">
          {course.level}
        </span>
        <div className="bg-gradient-to-br from-brand-soft via-bg-alt to-surface p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 pr-16">
              <span
                aria-hidden
                className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-brand shadow-sm"
              >
                <GraduationCap className="h-8 w-8" />
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{course.name}</h1>
                <p className="mt-1 text-sm text-ink-soft">{course.fullName}</p>
                <p className="mt-2 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-ink">
                  {course.stream}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={collegesHref}
                className="inline-flex items-center rounded-lg border border-brand bg-surface px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft"
              >
                View Colleges
              </Link>
              <Link
                href="/enquiry"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                Get Free Counselling
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 divide-line-soft border-t border-line-soft sm:grid-cols-4 sm:divide-x">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-4">
              <Icon className="h-5 w-5 shrink-0 text-brand" />
              <div className="min-w-0">
                <dt className="text-xs text-ink-faint">{label}</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </header>

      {/* Section nav */}
      <nav
        aria-label="On this page"
        className="sticky top-[5.1rem] z-10 lg:top-[6.3rem] -mx-4 mt-6 flex gap-2 overflow-x-auto border-b border-line bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0"
      >
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-ink-soft transition hover:border-brand hover:bg-brand-soft hover:text-brand-ink"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Section id="about" title={`About ${course.name}`}>
            <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">{course.about ?? "—"}</p>
          </Section>

          <Section id="eligibility" title="Eligibility">
            <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">{course.eligibility ?? "—"}</p>
            {course.modes.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">Modes</span>
                {course.modes.map((mode) => (
                  <span key={mode} className="rounded-lg bg-bg-alt px-3 py-1.5 text-sm text-ink-soft">
                    {mode}
                  </span>
                ))}
              </div>
            )}
          </Section>

          {acceptedExams.length + unlistedExams.length > 0 && (
            <Section id="exams" title="Entrance exams accepted">
              <div className="grid gap-3 sm:grid-cols-2">
                {acceptedExams.map((exam) => (
                  <Link
                    key={exam.slug}
                    href={`/exams/${exam.slug}`}
                    className="group rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_24px_-12px_rgba(177,36,62,0.35)]"
                  >
                    <p className="font-semibold text-ink group-hover:text-brand">{exam.name}</p>
                    <p className="mt-1 text-xs text-ink-faint">{exam.conductingBody}</p>
                    <p className="mt-2 text-xs text-ink-soft">
                      Exam date: <span className="font-medium text-brand">{exam.examDate}</span>
                    </p>
                  </Link>
                ))}
              </div>
              {unlistedExams.length > 0 && (
                <ul className={`flex flex-wrap gap-2 ${acceptedExams.length > 0 ? "mt-3" : ""}`}>
                  {unlistedExams.map((name) => (
                    <li key={name} className="rounded-full border border-line bg-bg-alt px-3 py-1 text-sm text-ink-soft">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {courseSpecialisations.length > 0 && (
            <Section id="specialisations" title="Specialisations">
              <div className="flex flex-wrap gap-2">
                {courseSpecialisations.map((specialisation) => (
                  <Link
                    key={specialisation.slug}
                    href={`/colleges?specialisation=${encodeURIComponent(specialisation.name)}`}
                    className="rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-brand hover:text-white"
                  >
                    {specialisation.name}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <section id="colleges" className="scroll-mt-44">
            <h2 className="flex items-center gap-3 font-display text-xl font-bold text-ink">
              <span aria-hidden className="h-6 w-1.5 rounded-full bg-brand" />
              Colleges offering {course.name}
            </h2>
            <div className="mt-4 space-y-4">
              {relatedColleges.map((college) => (
                <ListingCard key={college.slug} college={college} />
              ))}
            </div>
            <Link
              href={collegesHref}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-soft"
            >
              View all colleges
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Course at a glance</p>
            <dl className="mt-4 space-y-2.5 text-sm">
              {[
                ["Level", course.level],
                ["Duration", course.duration],
                ["Average fees", course.averageFees ?? "—"],
                ["Colleges", course.collegeCount.toLocaleString()],
                ["Modes", course.modes.join(", ") || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-brand-ink/70">{label}</dt>
                  <dd className="text-right font-medium text-brand-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {otherCourses.length > 0 && (
            <div className="rounded-2xl bg-brand-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">{course.stream}</p>
              <p className="mt-1 font-display text-lg font-semibold text-brand-ink">Related Courses</p>
              <ul className="mt-4 space-y-2.5 text-sm text-brand-ink/80">
                {otherCourses.map((c) => (
                  <li key={c.slug} className="flex justify-between gap-3">
                    <Link href={`/courses/${c.slug}`} className="min-w-0 truncate hover:text-brand">
                      {c.name}
                    </Link>
                    <span className="shrink-0 font-medium">{c.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Not sure this is the one?</p>
            <p className="mt-2 text-sm text-brand-ink/80">
              Compare {course.name} against other {course.stream.toLowerCase()} programmes with a counsellor.
            </p>
            <Link
              href="/enquiry"
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Request a Callback
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
