"use client";

import { PageSectionsAdmin } from "@/components/admin/page-sections-admin";
import { HeroItemsEditor } from "@/components/admin/hero-items-editor";
import { TopCollegesEditor } from "@/components/admin/top-colleges-editor";
import { TopExamsEditor } from "@/components/admin/top-exams-editor";
import type { AdminField, AdminHeroItem, AdminHomeLocation, AdminHomepage, AdminLocationLabel, IndiaGeo, LinkPool, AdminNews, LocationPicker, AdminProgram, AdminTopExams, AdminUniversities } from "@/lib/api";
import { RecommendedProgramsManager } from "@/components/admin/recommended-programs-manager";
import { HomeLocationsEditor } from "@/components/admin/home-locations-editor";
import { HomeFieldsEditor } from "@/components/admin/home-fields-editor";
import type { HomeCopy } from "@/lib/home-copy";
import { HeroCopyEditor, PromoBannerEditor, SectionCopyEditor, StoryCopyEditor } from "@/components/admin/home-copy-editor";
import { CareerPanelsManager, DataTilesManager, type PanelDraft, type TileDraft } from "@/components/admin/home-content-managers";
import { RecommendedCollegesManager } from "@/components/admin/recommended-colleges-manager";
import { NewsManager } from "@/components/admin/news-manager";

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
  locationPicker,
  linkPool,
  news,
  fieldList,
  heroItems,
  heroMax,
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
  locationPicker: LocationPicker;
  linkPool: LinkPool;
  news: AdminNews;
  fieldList: AdminField[];
  heroItems: AdminHeroItem[];
  heroMax: number;
}) {
  return (
    <PageSectionsAdmin
      title="Homepage"
      description="Every section of the homepage — its copy, whether it shows, and the order of the items inside it."
      tabs={[
        {
          id: "hero",
          label: "Hero",
          render: () => (
            <div className="space-y-6">
              <HeroItemsEditor items={heroItems} max={heroMax} />
              <HeroCopyEditor copy={copy.hero} />
            </div>
          ),
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
              <HomeLocationsEditor locations={locations} geo={geo} labelPool={locationLabels} picker={locationPicker} wording={copy.locationCard} />
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
              picker={locationPicker}
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
              <TopExamsEditor streams={fieldList.map((f) => f.name)} topExams={topExams} wording={copy.examCard} />
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
              <RecommendedProgramsManager
                programs={programs.programs}
                recommended={programs.recommended}
                colleges={locationPicker.colleges.map((c) => ({ slug: c.slug, name: c.name }))}
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
              <CareerPanelsManager panels={careers} pool={linkPool} categories={fieldList.map((f) => f.name)} />
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
              <RecommendedCollegesManager chosen={universities.colleges.map((c) => c.slug)} picker={locationPicker} />
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
              <DataTilesManager tiles={highlights} pool={linkPool} />
            </div>
          ),
        },
        {
          id: "articles",
          label: "Articles",
          render: () => (
            <div className="space-y-6">
              <SectionCopyEditor
                part="articles"
                title="Latest news heading"
                description="The heading above the news spread. It shows the three most recent articles."
                copy={copy.articles}
                show={["heading", "accent"]}
              />
              <NewsManager news={news} categories={fieldList.map((f) => f.name)} picker={locationPicker} />
            </div>
          ),
        },
      ]}
    />
  );
}
