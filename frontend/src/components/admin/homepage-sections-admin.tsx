"use client";

import { PageSectionsAdmin } from "@/components/admin/page-sections-admin";
import { HomepageCollectionsPicker } from "@/components/admin/homepage-collections-picker";
import type { AdminHomepage, AdminProgram, AdminTopExams, AdminUniversities } from "@/lib/api";
import type { HomeCopy } from "@/lib/home-copy";
import { HeroCopyEditor, SectionCopyEditor } from "@/components/admin/home-copy-editor";
import { OrderedListEditor } from "@/components/admin/ordered-list-editor";
import { saveRecommendedPrograms, saveRecommendedUniversities, saveTopExams } from "@/lib/admin-actions";
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
  programs,
  universities,
}: {
  homepage: AdminHomepage;
  careers: PanelDraft[];
  highlights: TileDraft[];
  topExams: AdminTopExams;
  copy: HomeCopy;
  programs: { programs: AdminProgram[]; recommended: string[] };
  universities: AdminUniversities;
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
          render: () => (
            <OrderedListEditor
              title="Top exams"
              description="The exams in the homepage row, left to right."
              addLabel="Add to row"
              emptyText="No exams chosen. The row will not show on the homepage."
              max={6}
              noun="exam"
              chosen={topExams.exams}
              options={topExams.options}
              onSave={saveTopExams}
            />
          ),
        },
        {
          id: "recommended",
          label: "Recommended",
          render: () => (
            <OrderedListEditor
              title="Recommended programmes"
              description="The brand-coloured row on the homepage, left to right. Edit the programme details on the Programmes page."
              addLabel="Add to row"
              emptyText="No programmes chosen. The row will not show on the homepage."
              max={3}
              noun="programme"
              chosen={programs.recommended.map((slug) => ({ slug, name: programs.programs.find((p) => p.slug === slug)?.name ?? slug })).filter((c) => programs.programs.some((p) => p.slug === c.slug))}
              options={programs.programs.map((p) => ({ slug: p.slug, name: p.name }))}
              onSave={saveRecommendedPrograms}
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
            <OrderedListEditor
              title="Recommended colleges"
              description="The recommended colleges row on the homepage, left to right."
              addLabel="Add to row"
              emptyText="No colleges chosen. The row will not show on the homepage."
              max={3}
              noun="college"
              chosen={universities.colleges}
              options={universities.options}
              onSave={saveRecommendedUniversities}
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
