"use client";

import { createCourse, saveCourse } from "@/lib/admin-actions";
import type { AdminCourse } from "@/lib/api";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import {
  TextField,
  SelectField,
  SelectWithOtherField,
  TextAreaField,
  Field,
  NameSlugFields,
} from "@/components/admin/admin-fields";

const LEVELS = ["UG", "PG", "Diploma", "Doctorate"];
const STREAMS = [
  "Management",
  "Engineering",
  "Medical",
  "Science",
  "Arts",
  "Commerce",
  "Pharmacy",
  "Law",
  "Paramedical",
];

/*
  Only fields the API stores are edited here. Colleges offering a course are
  counted from the directory, and the status is set by the publish flow, so
  neither is shown as an input.
*/
export function CoursesAdmin({ courses }: { courses: AdminCourse[] }) {
  return (
    <ResourceAdmin<AdminCourse>
      title="Courses"
      description="Degree programmes offered across the directory, with eligibility, fees and accepted exams."
      addLabel="Add course"
      addDescription="Basic details now; eligibility and exams on the record afterwards."
      rows={courses}
      getKey={(course) => course.slug}
      searchIn={(course) => [course.name, course.fullName, course.stream, course.level]}
      searchPlaceholder="Search name, stream, level"
      columns={[
        {
          key: "name",
          label: "Course",
          className: "text-ink",
          render: (course) => (
            <>
              <p className="font-medium text-ink">{course.name}</p>
              <p className="text-xs text-ink-faint">{course.fullName}</p>
            </>
          ),
        },
        { key: "level", label: "Level", render: (course) => course.level },
        { key: "stream", label: "Stream", render: (course) => course.stream },
        { key: "duration", label: "Duration", render: (course) => course.duration },
        { key: "fees", label: "Average fees", render: (course) => course.averageFees ?? "—" },
        { key: "colleges", label: "Colleges", render: (course) => course.collegeCount.toLocaleString("en-IN") },
      ]}
      renderView={(course) => (
        <div className="space-y-6">
          <AdminSubsection title="Basic details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Full name" value={course.fullName} />
              <Field label="Level" value={course.level} />
              <Field label="Stream" value={course.stream} />
              <Field label="Duration" value={course.duration} />
              <Field label="Average fees" value={course.averageFees ?? "—"} />
              <Field label="Colleges offering" value={course.collegeCount.toLocaleString("en-IN")} />
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{course.about ?? "—"}</p>
          </AdminSubsection>

          <AdminSubsection title="Eligibility">
            <p className="text-sm text-ink-soft">{course.eligibility ?? "—"}</p>
          </AdminSubsection>

          <AdminSubsection title="Modes & exams">
            <p className="text-sm text-ink-soft">Modes: {course.modes.join(", ") || "—"}</p>
            <p className="mt-1 text-sm text-ink-soft">Exams: {course.examsAccepted.join(", ") || "—"}</p>
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "basic",
          label: "Basic details",
          render: (course) => (
            <FieldGrid>
              <TextField label="Short name" name="name" defaultValue={course.name} required />
              <TextField label="Full name" name="fullName" defaultValue={course.fullName} required />
              <SelectField label="Level" name="level" defaultValue={course.level} options={LEVELS} />
              <SelectWithOtherField label="Stream" name="stream" defaultValue={course.stream} options={STREAMS} />
              <TextField label="Duration" name="duration" defaultValue={course.duration} required />
              <TextField label="Average fees" name="averageFees" defaultValue={course.averageFees ?? ""} />
              <TextAreaField
                label="About"
                name="about"
                defaultValue={course.about ?? ""}
                rows={4}
                className="sm:col-span-2 lg:col-span-3"
              />
            </FieldGrid>
          ),
        },
        {
          id: "eligibility",
          label: "Eligibility & exams",
          render: (course) => (
            <FieldGrid>
              <TextAreaField
                label="Eligibility"
                name="eligibility"
                defaultValue={course.eligibility ?? ""}
                rows={3}
                className="sm:col-span-2 lg:col-span-3"
              />
              <TextField
                label="Modes"
                name="modes"
                defaultValue={course.modes.join(", ")}
                hint="Comma separated, e.g. Full Time, Online"
                className="sm:col-span-2"
              />
              <TextField
                label="Accepted exams"
                name="examsAccepted"
                defaultValue={course.examsAccepted.join(", ")}
                hint="Comma separated, e.g. CAT, XAT"
                className="sm:col-span-2"
              />
            </FieldGrid>
          ),
        },
      ]}
      onSave={(course, data) => saveCourse(course.slug, data)}
      onAdd={(data) => createCourse(undefined, data)}
      renderAddForm={() => (
        <>
          <NameSlugFields
            nameLabel="Short name"
            namePlaceholder="MBA"
            slugPlaceholder="mba"
          />
          <TextField label="Full name" name="fullName" placeholder="Master of Business Administration" required />
          <SelectField label="Level" name="level" options={LEVELS} />
          <SelectWithOtherField label="Stream" name="stream" options={STREAMS} />
          <TextField label="Duration" name="duration" placeholder="24 Months" required />
          <TextField label="Average fees" name="averageFees" placeholder="₹4L - 25L" />
          <TextAreaField label="About" name="about" rows={3} className="sm:col-span-2" />
        </>
      )}
    />
  );
}
