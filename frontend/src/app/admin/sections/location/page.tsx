"use client";

import { locations } from "@/lib/mock-data";
import { PageSectionsAdmin, SectionEditor } from "@/components/admin/page-sections-admin";
import { TextField } from "@/components/admin/admin-fields";

/*
  The location landing page (/location/[slug]). Its sections are the same
  shape as the homepage's, so it reuses the same composer.
*/
export default function AdminLocationSectionsPage() {
  return (
    <PageSectionsAdmin
      title="Location Page"
      description="Sections on every city page — copy is shared, the listings fill from the city itself."
      tabs={[
        {
          id: "hero",
          label: "Hero",
          render: () => (
            <SectionEditor
              name="location-hero"
              headingLabel="Headline template"
              heading="Colleges in {city}"
              subheadingLabel="Sub-headline template"
              subheading="Compare {count} colleges in {city} by fees, placements and accepted exams."
            >
              <TextField
                label="Available tokens"
                name="location-tokens"
                defaultValue="{city}, {state}, {count}"
                className="sm:col-span-2"
              />
            </SectionEditor>
          ),
        },
        {
          id: "colleges",
          label: "Colleges",
          render: () => (
            <SectionEditor
              name="location-colleges"
              heading="Top Colleges in {city}"
              subheading="Ranked by NIRF standing and placement record."
            >
              <TextField label="Results per page" name="location-page-size" defaultValue="12" />
            </SectionEditor>
          ),
        },
        {
          id: "nearby",
          label: "Nearby Cities",
          render: () => (
            <SectionEditor
              name="location-nearby"
              heading="Nearby Cities"
              subheading=""
              subheadingLabel="Supporting text (optional)"
              items={locations.map((location) => ({
                id: location.slug,
                label: location.name,
                meta: `${location.collegeCount} colleges`,
              }))}
              itemsTitle="Cities offered as alternatives"
            />
          ),
        },
        {
          id: "faq",
          label: "FAQ",
          render: () => (
            <SectionEditor
              name="location-faq"
              heading="Frequently Asked Questions"
              subheading="Answers shown under every city page. Also feeds FAQ schema."
            />
          ),
        },
      ]}
    />
  );
}
