"use client";

import { createSpecialisation, deleteSpecialisations, saveSpecialisation } from "@/lib/admin-actions";
import type { AdminCourse, AdminSpecialisation } from "@/lib/api";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import { TextField, Field, NamesInput, ParentPicker } from "@/components/admin/admin-fields";

/**
 * The third level: Computer Science, Mechanical, Finance, Marketing. A specialisation is a name and
 * the courses it sits under (one or several); a college that picks one of those courses is offered
 * it. Fees and duration are entered per college.
 */
export function SpecialisationsAdmin({
  specialisations,
  courses,
}: {
  specialisations: AdminSpecialisation[];
  courses: Pick<AdminCourse, "slug" | "name">[];
}) {
  const options = courses.map((c) => ({ value: c.slug, label: c.name }));
  const names = (slugs: string[]) => slugs.map((slug) => courses.find((c) => c.slug === slug)?.name ?? slug).join(", ") || "—";
  const picker = (defaults: string[]) => (
    <ParentPicker
      label="Courses"
      name="courseSlugs"
      options={options}
      defaultValues={defaults}
      emptyNote="Add a course first."
      className="sm:col-span-2"
    />
  );

  return (
    <ResourceAdmin<AdminSpecialisation>
      title="Specialisations"
      description="The branches, such as Computer Science, Mechanical, Finance and Marketing. Pick the courses each one sits under."
      addLabel="Add specialisation"
      addDescription="One or more names, and the courses they sit under. Fees and duration are filled in on the college."
      rows={specialisations}
      getKey={(item) => item.slug}
      searchIn={(item) => [item.name, names(item.courseSlugs)]}
      searchPlaceholder="Search specialisation or course"
      columns={[
        {
          key: "name",
          label: "Specialisation",
          className: "text-ink",
          render: (item) => <p className="font-medium text-ink">{item.name}</p>,
        },
        { key: "courses", label: "Under courses", render: (item) => names(item.courseSlugs) },
        { key: "colleges", label: "Colleges", render: (item) => item.shownCount.toLocaleString("en-IN") },
      ]}
      renderView={(item) => (
        <AdminSubsection title="Details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Courses" value={names(item.courseSlugs)} />
            <Field label="Colleges offering" value={item.shownCount.toLocaleString("en-IN")} />
          </dl>
        </AdminSubsection>
      )}
      editTabs={[
        {
          id: "basic",
          label: "Details",
          render: (item) => (
            <FieldGrid>
              <TextField label="Name" name="name" defaultValue={item.name} required maxLength={200} />
              {picker(item.courseSlugs)}
            </FieldGrid>
          ),
        },
      ]}
      onSave={(item, data) => saveSpecialisation(item.slug, data)}
      onAdd={(data) => createSpecialisation(undefined, data)}
      onBulkDelete={(rows) => deleteSpecialisations(rows.map((r) => r.slug))}
      renderAddForm={() => (
        <>
          <NamesInput label="Names" name="name" placeholder="Computer Science" className="sm:col-span-2" />
          {picker([])}
        </>
      )}
    />
  );
}
