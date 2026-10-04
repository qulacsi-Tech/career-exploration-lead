"use client";

import { PageSectionsAdmin } from "@/components/admin/page-sections-admin";
import { TopCollegesEditor } from "@/components/admin/top-colleges-editor";
import { TopExamsEditor } from "@/components/admin/top-exams-editor";
import type { AdminField, AdminHomeLocation, AdminHomepage, AdminLocationLabel, IndiaGeo, AdminProgram, AdminTopExams, AdminUniversities } from "@/lib/api";
import { HomeLocationsEditor } from "@/components/admin/home-locations-editor";
import { HomeFieldsEditor } from "@/components/admin/home-fields-editor";
import type { HomeCopy } from "@/lib/home-copy";
import { HeroCopyEditor, PromoBannerEditor, SectionCopyEditor, StoryCopyEditor } from "@/components/admin/home-copy-editor";
import { OrderedListEditor } from "@/components/admin/ordered-list-editor";
import { saveRecommendedPrograms, saveRecommendedUniversities } from "@/lib/admin-actions";
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
  locations,
  geo,
  locationLabels,
  fieldList,
}: {
  homepage: AdminHomepage;
  careers: PanelDraft[];
  highlights: TileDraft[];
  topExams: AdminTopExams;
  copy: HomeCopy;
  programs: { programs: AdminProgram[]; recommended: string[] };
  universities: AdminUniversities;
  locations: AdminHomeLocation[];
  geo: IndiaGeo;
  locationLabels: AdminLocationLabel[];
  fieldList: AdminField[];
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
            <div className="space-y-6">
              <SectionCopyEditor
                part="locations"
                title="Browse by location"
                description="The heading above the city carousel."
                copy={copy.locations}
              />
              <HomeLocationsEditor locations={locations} geo={geo} labelPool={locationLabels} wording={copy.locationCard} />
            </div>
          ),
        },
        {
          id: "fields",
          label: "Fields",
          render: () => (
            <div className="space-y-6">
              <SectionCopyEditor
                part="streams"
                title="Explore your future"
                description="The heading above the fields grid."
                copy={copy.streams}
                show={["heading", "accent", "subheading"]}
              />
              <HomeFieldsEditor fields={fieldList} />
            </div>
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
          label: "Top Colleges",
          render: () => (
            <TopCollegesEditor
              data={homepage}
              geo={geo}
              streams={fieldList.map((f) => f.name)}
              wording={copy.collegeCard}
            />
          ),
        },
        {
          id: "top-exams",
          label: "Top Exams",
          render: () => (
            <div className="space-y-6">
              <SectionCopyEditor
                part="topExams"
                title="Top exams heading"
                description="The heading above the exams row."
                copy={copy.topExams}
                show={["heading", "accent", "subheading"]}
              />
              <TopExamsEditor topExams={topExams} wording={copy.examCard} />
            </div>
          ),
        },
        {
          id: "recommended",
          label: "Recommended",
          render: () => (
            <div className="space-y-6">
              <StoryCopyEditor
                part="programs"
                title="Recommended programmes heading"
                description="The heading and labels on the brand-coloured programmes row."
                copy={copy.programs}
                extra="itemEyebrow"
              />
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
            </div>
          ),
        },
        {
          id: "careers",
          label: "Explore Careers",
          render: () => (
            <div className="space-y-6">
              <SectionCopyEditor
                part="careers"
                title="Explore careers heading"
                description="The heading above the career panels."
                copy={copy.careers}
                show={["heading", "accent", "subheading"]}
              />
              <CareerPanelsEditor panels={careers} />
              <PromoBannerEditor copy={copy.promoBanner} />
            </div>
          ),
        },
        {
          id: "university",
          label: "Recommended University",
          render: () => (
            <div className="space-y-6">
              <StoryCopyEditor
                part="universities"
                title="Recommended colleges heading"
                description="The heading and labels on the recommended colleges row."
                copy={copy.universities}
                extra="itemSubline"
              />
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
            </div>
          ),
        },
        {
          id: "data",
          label: "Data",
          render: () => (
            <div className="space-y-6">
              <SectionCopyEditor
                part="data"
                title="Data heading"
                description="The heading and intro above the data tiles."
                copy={copy.data}
                show={["heading", "accent", "subheading"]}
              />
              <DataTilesEditor tiles={highlights} />
            </div>
          ),
        },
        {
          id: "articles",
          label: "Articles",
          render: () => (
            <SectionCopyEditor
              part="articles"
              title="Latest news heading"
              description="The heading above the news spread. It shows the three most recent articles."
              copy={copy.articles}
              show={["heading", "accent"]}
            />
          ),
        },
      ]}
    />
  );
}
