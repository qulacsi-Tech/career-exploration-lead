import Link from "next/link";
import { Award, GraduationCap, Users } from "lucide-react";
import type { CollegeFaculty } from "@/lib/api";

/** The faculty overview (head count, student to faculty ratio, share holding a PhD) for a college's overview page. */
export function FacultyGlance({ faculty, href }: { faculty: CollegeFaculty; href: string }) {
  const tiles = [
    faculty.count !== null && { icon: Users, value: faculty.count.toLocaleString("en-IN"), label: "Faculty members" },
    faculty.studentRatio && { icon: GraduationCap, value: faculty.studentRatio, label: "Student to faculty ratio" },
    faculty.phdPercent !== null && { icon: Award, value: `${faculty.phdPercent}%`, label: "Hold a PhD" },
  ].filter(Boolean) as { icon: typeof Users; value: string; label: string }[];
  if (tiles.length === 0) return null;

  return (
    <section aria-label="Faculty at a glance" className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-brand-ink">Faculty at a Glance</h2>
        <Link href={href} className="text-sm font-semibold text-brand hover:underline">Meet the faculty →</Link>
      </div>
      <ul className="mt-5 grid gap-4 sm:grid-cols-3">
        {tiles.map(({ icon: Icon, value, label }) => (
          <li key={label} className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-soft to-bg-alt p-5">
            <Icon aria-hidden="true" className="absolute -right-2 -top-2 h-20 w-20 text-brand/10" />
            <p className="relative font-display text-3xl font-extrabold tracking-tight text-ink">{value}</p>
            <p className="relative mt-1 text-sm font-medium text-brand-ink">{label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
