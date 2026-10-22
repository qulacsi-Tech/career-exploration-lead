"use client";

import { useState } from "react";
import { createSpecialisation, saveSpecialisation } from "@/lib/admin-actions";
import type { AdminCourse, AdminSpecialisation } from "@/lib/api";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import {
  TextField,
  SelectField,
  TextAreaField,
  Field,
  NameSlugFields,
} from "@/components/admin/admin-fields";

function SpecialisationAddFields({
  courseOptions,
  courseLabel,
}: {
  courseOptions: string[];
  courseLabel: (slug: string) => string;
}) {
  const [selectedCourse, setSelectedCourse] = useState("");

  return (
    <>
      <SelectField
        label="Parent course"
        name="courseSlug"
        placeholder="Select course"
        required
        value={selectedCourse}
        onChange={setSelectedCourse}
        options={courseOptions}
        labelFor={courseLabel}
      />
      <NameSlugFields
        nameLabel="Name"
        namePlaceholder="Finance"
        slugPlaceholder="mba-finance"
        slugPrefix={selectedCourse}
        nameMaxLength={200}
      />
      <TextField label="Duration" name="duration" placeholder="e.g. 24 Months" />
      <TextField label="Average fees" name="averageFees" placeholder="e.g. ₹6L - 24L" />
      <TextField
        label="Colleges offering (override)"
        name="collegeCount"
        type="number"
        placeholder="0"
        hint="Leave 0 to count from the directory"
      />
      <TextAreaField label="About" name="about" rows={3} className="sm:col-span-2" maxLength={4000} />
    </>
  );
}

/**
 * A specialisation belongs to one course. The course's name and stream are copied
 * onto it by the API, so the editor only chooses the parent course and the
 * fields that describe the specialisation itself.
 */
export function SpecialisationsAdmin({
  specialisations,
  courses,
}: {
  specialisations: AdminSpecialisation[];
  courses: Pick<AdminCourse, "slug" | "name">[];
}) {
  const courseOptions = courses.map((course) => course.slug);
  const courseLabel = (slug: string) => courses.find((course) => course.slug === slug)?.name ?? slug;

  return (
    <ResourceAdmin<AdminSpecialisation>
      title="Specialisations"
      description="Streams within a course, such as Finance under MBA. Each belongs to exactly one course."
      addLabel="Add specialisation"
      addDescription="Pick the parent course first. The stream follows from it."
      rows={specialisations}
      getKey={(item) => item.slug}
      searchIn={(item) => [item.name, item.courseName, item.stream, item.slug]}
      searchPlaceholder="Search name, course, stream, slug"
      columns={[
        {
          key: "name",
          label: "Specialisation",
          className: "text-ink",
          render: (item) => <p className="font-medium text-ink">{item.name}</p>,
        },
        { key: "course", label: "Course", render: (item) => item.courseName },
        { key: "stream", label: "Stream", render: (item) => item.stream },
        { key: "duration", label: "Duration", render: (item) => item.duration ?? "—" },
        { key: "fees", label: "Average fees", render: (item) => item.averageFees ?? "—" },
        { key: "colleges", label: "Colleges", render: (item) => item.shownCount.toLocaleString("en-IN") },
      ]}
      renderView={(item) => (
        <div className="space-y-6">
          <AdminSubsection title="Details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Parent course" value={item.courseName} />
              <Field label="Stream" value={item.stream} />
              <Field label="Duration" value={item.duration ?? "—"} />
              <Field label="Average fees" value={item.averageFees ?? "—"} />
              <Field label="Colleges offering" value={`${item.shownCount.toLocaleString("en-IN")}${item.collegeCount > 0 ? " (typed)" : " (counted)"}`} />
              <Field label="Slug" value={item.slug} />
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.about ?? "—"}</p>
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "basic",
          label: "Details",
          render: (item) => (
            <FieldGrid>
              <TextField label="Name" name="name" defaultValue={item.name} required maxLength={200} />
              <TextField
                label="URL slug"
                name="slug"
                defaultValue={item.slug}
                disabled
                hint="The URL address of this specialisation cannot be changed."
              />
              <SelectField
                label="Parent course"
                name="courseSlug"
                defaultValue={item.courseSlug}
                options={courseOptions}
                labelFor={courseLabel}
                required
              />
              <TextField label="Duration" name="duration" defaultValue={item.duration ?? ""} placeholder="e.g. 24 Months" />
              <TextField label="Average fees" name="averageFees" defaultValue={item.averageFees ?? ""} placeholder="e.g. ₹6L - 24L" />
              <TextField
                label="Colleges offering (override)"
                name="collegeCount"
                type="number"
                defaultValue={String(item.collegeCount)}
                hint={`Leave 0 to count from the directory (now ${item.shownCount})`}
              />
              <TextAreaField
                label="About"
                name="about"
                defaultValue={item.about ?? ""}
                rows={4}
                className="sm:col-span-2 lg:col-span-3"
                maxLength={4000}
              />
            </FieldGrid>
          ),
        },
      ]}
      onSave={(item, data) => saveSpecialisation(item.slug, data)}
      onAdd={(data) => createSpecialisation(undefined, data)}
      renderAddForm={() => (
        <SpecialisationAddFields courseOptions={courseOptions} courseLabel={courseLabel} />
      )}
    />
  );
}
