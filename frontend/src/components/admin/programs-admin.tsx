"use client";

import { createProgram, deleteProgram, saveProgram } from "@/lib/admin-actions";
import type { AdminProgram } from "@/lib/api";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import { TextField, NameSlugFields } from "@/components/admin/admin-fields";

/** The programme fields the homepage row and the programme pages show. */
function ProgramFields({ program }: { program: AdminProgram | null }) {
  return (
    <FieldGrid>
      {/* The add form takes the name from the name field beside the slug. */}
      {program && <TextField label="Programme name" name="name" defaultValue={program.name} required />}
      <TextField label="University" name="universityName" defaultValue={program?.universityName ?? ""} required />
      <TextField label="University slug" name="universitySlug" defaultValue={program?.universitySlug ?? ""} hint="Lowercase letters, digits and hyphens. Matches the college's address." required />
      <TextField label="Online duration" name="onlineDuration" defaultValue={program?.onlineDuration ?? ""} placeholder="8 months" />
      <TextField label="Online fees" name="onlineFees" defaultValue={program?.onlineFees ?? ""} placeholder="INR 4,00,000" />
      <TextField label="Online fees note" name="onlineFeesNote" defaultValue={program?.onlineFeesNote ?? ""} placeholder="(including taxes)" />
      <TextField label="On-campus duration" name="onCampusDuration" defaultValue={program?.onCampusDuration ?? ""} placeholder="1 year" />
      <TextField label="On-campus fees" name="onCampusFees" defaultValue={program?.onCampusFees ?? ""} placeholder="USD 17,000 (indicative)" />
    </FieldGrid>
  );
}

export function ProgramsAdmin({ programs, recommendedSlugs }: { programs: AdminProgram[]; recommendedSlugs: string[] }) {
  const inRow = new Set(recommendedSlugs);
  return (
    <ResourceAdmin<AdminProgram>
      title="Programmes"
      description="Programme records shown on the homepage row and on programme pages. The homepage row is chosen on the Homepage sections screen."
      addLabel="Add programme"
      addDescription="The name, university and fees. The homepage row is chosen separately."
      rows={programs}
      getKey={(p) => p.slug}
      searchIn={(p) => [p.name, p.universityName]}
      searchPlaceholder="Search programme or university"
      columns={[
        {
          key: "name",
          label: "Programme",
          className: "text-ink",
          render: (p) => (
            <>
              <p className="font-medium text-ink">
                {p.name}
                {inRow.has(p.slug) && <span className="ml-2 rounded-md border border-brand/40 bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand-ink">On homepage</span>}
              </p>
              <p className="text-xs text-ink-faint">{p.slug}</p>
            </>
          ),
        },
        { key: "university", label: "University", render: (p) => p.universityName },
        { key: "online", label: "Online", render: (p) => [p.onlineDuration, p.onlineFees].filter(Boolean).join(" · ") || "—" },
        { key: "campus", label: "On campus", render: (p) => [p.onCampusDuration, p.onCampusFees].filter(Boolean).join(" · ") || "—" },
      ]}
      renderView={(p) => (
        <div className="space-y-6">
          <AdminSubsection title="Details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-ink-faint">University</dt><dd className="text-ink">{p.universityName}</dd></div>
              <div><dt className="text-xs text-ink-faint">Online duration</dt><dd className="text-ink">{p.onlineDuration ?? "—"}</dd></div>
              <div><dt className="text-xs text-ink-faint">Online fees</dt><dd className="text-ink">{p.onlineFees ?? "—"} {p.onlineFeesNote ?? ""}</dd></div>
              <div><dt className="text-xs text-ink-faint">On-campus duration</dt><dd className="text-ink">{p.onCampusDuration ?? "—"}</dd></div>
              <div><dt className="text-xs text-ink-faint">On-campus fees</dt><dd className="text-ink">{p.onCampusFees ?? "—"}</dd></div>
            </dl>
          </AdminSubsection>
        </div>
      )}
      editTabs={[{ id: "programme", label: "Programme", render: (p) => <ProgramFields program={p} /> }]}
      onSave={(p, data) => saveProgram(p.slug, data)}
      onAdd={(data) => createProgram(undefined, data)}
      onDelete={(p) => deleteProgram(p.slug)}
      renderAddForm={() => (
        <>
          <NameSlugFields nameLabel="Programme name" nameFieldName="name" namePlaceholder="MS in Data Analytics" slugPlaceholder="ms-data-analytics" />
          <div className="sm:col-span-2">
            <ProgramFields program={null} />
          </div>
        </>
      )}
    />
  );
}
