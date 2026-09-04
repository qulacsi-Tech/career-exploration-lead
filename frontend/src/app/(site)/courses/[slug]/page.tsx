import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { CollegeCard } from "@/components/college-card";
import { courses, colleges, exams, specialisations } from "@/lib/mock-data";

export function generateStaticParams() {
  return courses.map((course) => ({ slug: course.slug }));
}

const getCourse = (slug: string) => courses.find((course) => course.slug === slug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return { title: "Course not found" };

  return {
    title: `${course.name} (${course.fullName}): Fees, Eligibility & Colleges`,
    description: course.about,
    alternates: { canonical: `/courses/${course.slug}` },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  // Colleges that actually offer this course, matched on the course rows of the
  // record rather than on stream — a management college does not necessarily
  // run every management programme.
  const offering = colleges.filter((college) =>
    college.courses.some(
      (row) =>
        row.name.toLowerCase() === course.name.toLowerCase() ||
        row.name.toLowerCase().startsWith(`${course.name.toLowerCase()} `),
    ),
  );

  // Fall back to the stream so the page is never an empty shell while the
  // directory is still small.
  const relatedColleges = offering.length
    ? offering
    : colleges.filter((college) => college.stream === course.stream).slice(0, 3);

  const acceptedExams = exams.filter((exam) =>
    course.examsAccepted.some((name) => exam.name.includes(name) || exam.slug === name.toLowerCase()),
  );

  const courseSpecialisations = specialisations.filter(
    (specialisation) => specialisation.courseSlug === course.slug,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Courses", href: "/courses" },
          { label: course.name },
        ]}
      />

      <div className="mt-4 flex flex-col gap-4 border-b border-line pb-8 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{course.name}</h1>
            <Chip tone="gold">{course.level}</Chip>
            <Chip>{course.stream}</Chip>
          </div>
          <p className="mt-1 text-sm text-ink-soft">{course.fullName}</p>
        </div>
        <Link
          href="/enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Free Counselling
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-12">
          <section id="about">
            <h2 className="font-display text-xl font-bold text-ink">About {course.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">{course.about}</p>
          </section>

          <section id="eligibility">
            <h2 className="font-display text-xl font-bold text-ink">Eligibility</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
              {course.eligibility}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {course.modes.map((mode) => (
                <Chip key={mode}>{mode}</Chip>
              ))}
            </div>
          </section>

          {acceptedExams.length > 0 && (
            <section id="exams">
              <h2 className="font-display text-xl font-bold text-ink">Entrance exams accepted</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {acceptedExams.map((exam) => (
                  <Link
                    key={exam.slug}
                    href={`/exams/${exam.slug}`}
                    className="rounded-xl border border-line bg-surface p-4 transition hover:border-brand"
                  >
                    <p className="font-medium text-ink">{exam.name}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {exam.conductingBody} &middot; {exam.examDate}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {courseSpecialisations.length > 0 && (
            <section id="specialisations">
              <h2 className="font-display text-xl font-bold text-ink">Specialisations</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {courseSpecialisations.map((specialisation) => (
                  <Chip key={specialisation.slug}>{specialisation.name}</Chip>
                ))}
              </div>
            </section>
          )}

          <section id="colleges">
            <h2 className="font-display text-xl font-bold text-ink">
              Colleges offering {course.name}
            </h2>
            <div className="mt-4 space-y-4">
              {relatedColleges.map((college) => (
                <CollegeCard key={college.slug} college={college} />
              ))}
            </div>
            <Link
              href="/colleges"
              className="mt-5 inline-block rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
            >
              View all colleges
            </Link>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display font-semibold text-ink">Course at a glance</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">Level</dt>
                <dd className="font-medium text-ink">{course.level}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">Duration</dt>
                <dd className="font-medium text-ink">{course.duration}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">Average fees</dt>
                <dd className="font-medium text-ink">{course.averageFees}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">Colleges</dt>
                <dd className="font-medium text-ink">{course.collegeCount.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-ink-faint">Modes</dt>
                <dd className="text-right font-medium text-ink">{course.modes.join(", ")}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-brand/30 bg-brand-soft p-5">
            <p className="font-display font-semibold text-brand-ink">Not sure this is the one?</p>
            <p className="mt-1 text-xs text-brand-ink/80">
              Compare {course.name} against other {course.stream.toLowerCase()} programmes with a
              counsellor.
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
