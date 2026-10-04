"use client";

import { recommendedPrograms, recommendedUniversities } from "@/lib/mock-data";
import { PageSectionsAdmin, SectionEditor } from "@/components/admin/page-sections-admin";
import { HomepageCollectionsPicker } from "@/components/admin/homepage-collections-picker";
import type { AdminHomepage, AdminTopExams } from "@/lib/api";
import type { HomeCopy } from "@/lib/home-copy";
import { HeroCopyEditor, SectionCopyEditor } from "@/components/admin/home-copy-editor";
import { TopExamsEditor } from "@/components/admin/top-exams-editor";
import { CareerPanelsEditor, DataTilesEditor, type PanelDraft, type TileDraft } from "@/components/admin/homepage-content-editors";

/*
  Defaults mirror what app/(site)/page.tsx renders today, so this screen opens
  showing the live copy rather than empty boxes. Once the content API exists
  these come from it, and the page reads them instead of its hard-coded strings.

  Every list below is the section's own source — the cities in the carousel, the
  streams in the red band, the programmes in the recommended row. Each item
  carries the detail that section actually displays, so the list is recognisable
  as the thing on the page rather than a generic set of names.
*/

export function HomepageSectionsAdmin({
  homepage,
  careers,
  highlights,
  topExams,
  copy,
}: {
  homepage: AdminHomepage;
  careers: PanelDraft[];
  highlights: TileDraft[];
  topExams: AdminTopExams;
  copy: HomeCopy;
}) {
  return (
    <PageSectionsAdmin
      title="Homepage"
      description="Every section of the homepage — its copy, whether it shows, and the order of the items inside it."
      tabs={[
        {
          id: "hero",
          label: "Hero",
          render: () => <HeroCopyEditor copy={copy.hero} />,
        },
        {
          id: "location",
          label: "Location",
          render: () => (
            <SectionCopyEditor
              part="locations"
              title="Browse by location"
              description="The heading above the city carousel. The cities and their order come from the directory."
              copy={copy.locations}
            />
          ),
        },
        {
          id: "fields",
          label: "Fields",
          render: () => (
            <SectionCopyEditor
              part="streams"
              title="Explore your future"
              description="The heading above the stream grid. The streams and their order come from the directory."
              copy={copy.streams}
            />
          ),
        },
        {
          /*
            Was a single "Top Colleges" section with a hand-ordered pool, then
            repeatable bands bound to ranking lists (MOM §1.7). Now the bands are
            collections, edited under Content → Collections: a group of colleges
            that also fills a footer column and owns a page is not a homepage
            concern. What is left here is the homepage's own decision — which
            collections appear, in what order, at how many cards.
          */
          id: "college-bands",
          label: "College bands",
          render: () => <HomepageCollectionsPicker data={homepage} />,
        },
        {
          id: "top-exams",
          label: "Top Exams",
          render: () => <TopExamsEditor exams={topExams.exams} options={topExams.options} />,
        },
        {
          id: "recommended",
          label: "Recommended",
          render: () => (
            <SectionEditor
              name="recommended"
              heading="Recommended Colleges"
              subheading=""
              subheadingLabel="Supporting text (optional)"
              items={recommendedPrograms.map((program) => ({
                id: program.slug,
                label: program.name,
                meta: `${program.university} · ${program.online.duration} online · ${program.online.fees}`,
              }))}
              itemsTitle="Recommended programmes"
              itemsHint="The brand-coloured band. Usually paid or priority placements."
            />
          ),
        },
        {
          id: "careers",
          label: "Explore Careers",
          render: () => <CareerPanelsEditor panels={careers} />,
        },
        {
          id: "university",
          label: "Recommended University",
          render: () => (
            <SectionEditor
              name="university"
              heading="Recommended University"
              subheading=""
              subheadingLabel="Supporting text (optional)"
              items={recommendedUniversities.map((university) => ({
                id: university.slug,
                label: university.name,
                meta: `${university.city}, ${university.state}`,
              }))}
              itemsTitle="Universities"
            />
          ),
        },
        {
          id: "data",
          label: "Data",
          render: () => <DataTilesEditor tiles={highlights} />,
        },
      ]}
    />
  );
}
