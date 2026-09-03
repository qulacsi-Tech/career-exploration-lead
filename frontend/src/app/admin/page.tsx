import Link from "next/link";
import {
  AdminPageHeader,
  AdminSection,
  AdminSubsection,
  AdminPlaceholder,
} from "@/components/admin/admin-section";

/** Placeholder figures — these come from the API once the entities exist. */
const stats = [
  { label: "Colleges", value: "—", href: "/admin/colleges" },
  { label: "Courses", value: "—", href: "/admin/courses" },
  { label: "Exams", value: "—", href: "/admin/exams" },
  { label: "New leads", value: "—", href: "/admin/leads" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Content, leads and SEO health at a glance."
      />

      <AdminSection title="At a glance" description="Counts across the content library.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-lg border border-line px-4 py-3 transition hover:border-brand/40 hover:shadow-sm"
            >
              <p className="font-display text-2xl font-bold text-ink">{s.value}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{s.label}</p>
            </Link>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Needs attention" description="Queues that block publishing.">
        <AdminSubsection title="Unmoderated reviews" description="Phase 2 module.">
          <AdminPlaceholder>Wired up once reviews land.</AdminPlaceholder>
        </AdminSubsection>
        <AdminSubsection title="Missing SEO fields" description="Entities published without metadata.">
          <AdminPlaceholder>Wired up once the content API exists.</AdminPlaceholder>
        </AdminSubsection>
      </AdminSection>
    </div>
  );
}
