"use client";

import { createCategory, deleteCategories, saveCategory } from "@/lib/admin-actions";
import type { AdminCourse, AdminField } from "@/lib/api";
import { ChildDelivery, DELIVERY_LABEL, DeliveryField } from "@/components/admin/delivery-fields";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import { TextField, Field } from "@/components/admin/admin-fields";

/** The tick for "show on the homepage", posted as `show` when ticked. */
function ShowOnHomepage({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-ink sm:col-span-2">
      <input type="checkbox" name="show" defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" />
      <span>
        Show on the homepage
        <span className="block text-xs text-ink-faint">Ticked: the category appears in the &ldquo;Chart Your Discipline&rdquo; grid. Unticked: it stays in the lists but is hidden there.</span>
      </span>
    </label>
  );
}

/**
 * The top level: Engineering, Management, Medical. A category is the same record as a field on the
 * homepage grid (its page address, /<slug>/colleges, is what the college lists hang off), so this
 * list and that grid never disagree. The short description is the line on the back of its disc, and
 * "Show on the homepage" is its tick in the grid; the icon, badge and average CTC are set on the
 * Homepage sections screen.
 *
 * It cannot be renamed here: colleges and courses store the name, so a rename would orphan them.
 */
export function CategoriesAdmin({ categories, courses = [] }: { categories: AdminField[]; courses?: AdminCourse[] }) {
  return (
    <ResourceAdmin<AdminField>
      title="Categories"
      description="The streams colleges are grouped under, such as Engineering, Management and Medical. Courses sit under them, and a college can be listed under several."
      addLabel="Add category"
      addDescription="Letters, numbers and single spaces only, since the name becomes the page address."
      rows={categories}
      getKey={(item) => item.slug}
      searchIn={(item) => [item.name, item.slug]}
      searchPlaceholder="Search category"
      columns={[
        {
          key: "name",
          label: "Category",
          className: "text-ink",
          render: (item) => (
            <>
              <p className="font-medium text-ink">{item.name}</p>
              <p className="text-xs text-ink-faint">/{item.slug}/colleges</p>
            </>
          ),
        },
        { key: "tagline", label: "Description", render: (item) => item.tagline || "—" },
        { key: "colleges", label: "Colleges", render: (item) => item.collegeCount.toLocaleString("en-IN") },
        { key: "delivery", label: "Availability", render: (item) => DELIVERY_LABEL[item.delivery ?? "offline"] },
        { key: "home", label: "On homepage", render: (item) => (item.show ? "Yes" : "No") },
      ]}
      renderView={(item) => (
        <AdminSubsection title="Details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Page address" value={`/${item.slug}/colleges`} />
            <Field label="Description" value={item.tagline || "—"} />
            <Field label="Colleges" value={item.collegeCount.toLocaleString("en-IN")} />
            <Field label="Availability" value={DELIVERY_LABEL[item.delivery ?? "offline"]} />
            <Field label="On the homepage grid" value={item.show ? "Yes" : "No"} />
          </dl>
        </AdminSubsection>
      )}
      editTabs={[
        {
          id: "basic",
          label: "Details",
          render: (item) => (
            <FieldGrid>
              <TextField
                label="Name"
                name="name"
                defaultValue={item.name}
                disabled
                hint="A category cannot be renamed, since colleges and courses use its name. Delete it and add it again to change it."
              />
              <TextField label="Short description" name="tagline" defaultValue={item.tagline} maxLength={50} hint="Shown on the homepage disc. Up to 50 characters." />
              <ShowOnHomepage defaultChecked={item.show} />
              <DeliveryField defaultValue={item.delivery} className="sm:col-span-2" />
              <ChildDelivery
                label={`Courses under ${item.name}`}
                items={courses.filter((c) => c.streams.includes(item.name)).map((c) => ({ slug: c.slug, name: c.name, delivery: c.delivery ?? "offline" }))}
                emptyNote="No courses sit under this category yet. Add them in the Courses tab."
                className="sm:col-span-2"
              />
            </FieldGrid>
          ),
        },
      ]}
      onSave={(item, data) => saveCategory(item, data)}
      onAdd={(data) => createCategory(undefined, data)}
      onBulkDelete={(rows) => deleteCategories(rows.map((r) => r.slug))}
      renderAddForm={() => (
        <>
          <TextField label="Name" name="name" placeholder="Engineering" required maxLength={30} />
          <TextField label="Short description" name="tagline" placeholder="Build the future" maxLength={50} hint="Shown on the homepage disc. Up to 50 characters." />
          <ShowOnHomepage defaultChecked />
          <DeliveryField className="sm:col-span-2" />
        </>
      )}
    />
  );
}
