"use client";

import { createCourse, deleteCourses, saveCourse } from "@/lib/admin-actions";
import type { AdminCourse } from "@/lib/api";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import { TextField, Field, NamesInput, ParentPicker } from "@/components/admin/admin-fields";
import { CourseCollegesEditor } from "@/components/admin/course-colleges-editor";

/**
 * The second level: B.Tech, B.E., MBA, BBA. A course is a name and the categories it sits under;
 * fees, duration and eligibility are entered per college, on the college form or in this course's Colleges tab. A course can sit
 * under several categories, and a college that picks one of them is offered this course.
 */
export function CoursesAdmin({ courses, streams }: { courses: AdminCourse[]; streams: string[] }) {
  const options = streams.map((name) => ({ value: name, label: name }));
  const picker = (defaults: string[]) => (
    <ParentPicker
      label="Categories"
      name="streams"
      options={options}
      defaultValues={defaults}
      emptyNote="Add a category first."
      className="sm:col-span-2"
    />
  );

  return (
    <ResourceAdmin<AdminCourse>
      title="Courses"
      description="The degrees and programmes, such as B.Tech, B.E., MBA and BBA. Pick the categories each one sits under."
      addLabel="Add course"
      addDescription="One or more names, and the categories they sit under. Fees and duration are filled in on the college."
      rows={courses}
      getKey={(course) => course.slug}
      searchIn={(course) => [course.name, ...course.streams]}
      searchPlaceholder="Search course or category"
      columns={[
        {
          key: "name",
          label: "Course",
          className: "text-ink",
          render: (course) => <p className="font-medium text-ink">{course.name}</p>,
        },
        { key: "streams", label: "Under categories", render: (course) => course.streams.join(", ") || "—" },
        { key: "colleges", label: "Colleges", render: (course) => course.shownCount.toLocaleString("en-IN") },
      ]}
      renderView={(course) => (
        <AdminSubsection title="Details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Categories" value={course.streams.join(", ") || "—"} />
            <Field label="Colleges offering" value={course.shownCount.toLocaleString("en-IN")} />
          </dl>
        </AdminSubsection>
      )}
      editTabs={[
        {
          id: "basic",
          label: "Details",
          render: (course) => (
            <FieldGrid>
              <TextField label="Name" name="name" defaultValue={course.name} required maxLength={200} />
              {picker(course.streams)}
            </FieldGrid>
          ),
        },
        {
          id: "colleges",
          label: "Colleges & details",
          render: (course) => <CourseCollegesEditor slug={course.slug} name={course.name} />,
        },
      ]}
      onSave={(course, data) => saveCourse(course.slug, data)}
      onAdd={(data) => createCourse(undefined, data)}
      onBulkDelete={(rows) => deleteCourses(rows.map((c) => c.slug))}
      renderAddForm={() => (
        <>
          <NamesInput label="Names" name="name" placeholder="B.Tech" className="sm:col-span-2" />
          {picker([])}
        </>
      )}
    />
  );
}
