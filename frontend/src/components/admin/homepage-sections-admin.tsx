"use client";

import {
  colleges,
  exams,
  locations,
  recommendedPrograms,
  recommendedUniversities,
  careerPanels,
  dataHighlights,
  homeStreams,
} from "@/lib/mock-data";
import { PageSectionsAdmin, SectionEditor } from "@/components/admin/page-sections-admin";
import { TextField } from "@/components/admin/admin-fields";

/*
  Defaults mirror what app/(site)/page.tsx renders today, so this screen opens
  showing the live copy rather than empty boxes. Once the content API exists
  these come from it, and the page reads them instead of its hard-coded strings.

  Every list below is the section's own source — the cities in the carousel, the
  streams in the red band, the programmes in the recommended row. Each item
  carries the detail that section actually displays, so the list is recognisable
  as the thing on the page rather than a generic set of names.
*/

export function HomepageSectionsAdmin() {
  return (
    <PageSectionsAdmin
      title="Homepage"
      description="Every section of the homepage — its copy, whether it shows, and the order of the items inside it."
      tabs={[
        {
          id: "hero",
          label: "Hero",
          render: () => (
            <SectionEditor
              name="hero"
              headingLabel="Headline"
              heading="Find Colleges, Courses & Exams That Are Best For You"
              subheadingLabel="Sub-headline"
              subheading="Search 30,000+ colleges, compare fees and placements, and get free counselling from admission experts."
            >
              <TextField
                label="Search placeholder"
                name="hero-search-placeholder"
                defaultValue="Search by college, course or exam"
              />
              <TextField label="Search button label" name="hero-search-cta" defaultValue="Search" />
              <TextField
                label="Default stream filter"
                name="hero-default-stream"
                defaultValue="All streams"
              />
            </SectionEditor>
          ),
        },
        {
          id: "location",
          label: "Location",
          render: () => (
            <SectionEditor
              name="location"
              heading="Browse By Location"
              subheading=""
              subheadingLabel="Supporting text (optional)"
              items={locations.map((location) => ({
                id: location.slug,
                label: location.name,
                meta: `${location.collegeCount} colleges`,
              }))}
              itemsTitle="Cities in the carousel"
              itemsHint="Order sets the carousel order, left to right."
            />
          ),
        },
        {
          id: "fields",
          label: "Fields",
          render: () => (
            <SectionEditor
              name="fields"
              heading="Explore Your Future"
              subheading="Select a stream to see colleges cherry-picked for you"
              items={homeStreams.map((stream) => ({
                id: stream.slug,
                label: stream.name,
                meta: `${stream.count.toLocaleString()} colleges`,
              }))}
              itemsTitle="Streams shown"
              itemsHint="The red band on the homepage. Order runs left to right, top to bottom."
            />
          ),
        },
        {
          id: "top-colleges",
          label: "Top Colleges",
          render: () => (
            <SectionEditor
              name="top-colleges"
              heading="Top Colleges"
              subheading="Colleges Cherry Picked For You"
              items={colleges.map((college) => ({
                id: college.slug,
                label: college.name,
                meta: `${college.city}, ${college.state} · ${college.ranking.authority} #${college.ranking.rank} · ${college.feesRange}`,
              }))}
              featuring
              featuringDefault="top"
              itemsTitle="Featured colleges"
              itemsHint="The pool the featuring mode draws from."
            >
              <TextField label="View All link" name="top-colleges-cta" defaultValue="/colleges" />
            </SectionEditor>
          ),
        },
        {
          id: "top-exams",
          label: "Top Exams",
          render: () => (
            <SectionEditor
              name="top-exams"
              heading="Top Exams"
              subheading="Exams Cherry Picked For You"
              items={exams.map((exam) => ({
                id: exam.slug,
                label: exam.name,
                meta: `${exam.level} · ${exam.conductingBody} · ${exam.examDate}`,
              }))}
              featuring
              featuringDefault="top"
              itemsTitle="Featured exams"
              itemsHint="The pool the featuring mode draws from."
            >
              <TextField label="View All link" name="top-exams-cta" defaultValue="/exams" />
            </SectionEditor>
          ),
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
          render: () => (
            <SectionEditor
              name="careers"
              heading="Explore Careers"
              subheading="Explore your preferred streams to learn about the relevant colleges, exams and more!"
              items={careerPanels.map((panel) => ({
                id: panel.title.toLowerCase().replace(/\s+/g, "-"),
                label: panel.title,
                meta: panel.links.map((link) => link.label).join(", "),
              }))}
              itemsTitle="Panels"
              itemsHint="Three columns; the middle one stacks two panels."
            >
              <TextField
                label="Promo banner text"
                name="careers-banner-text"
                defaultValue="Browse through our list of popular programs and universities"
                className="sm:col-span-2"
              />
              <TextField label="Promo banner CTA" name="careers-banner-cta" defaultValue="Discover More" />
            </SectionEditor>
          ),
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
          render: () => (
            <SectionEditor
              name="data"
              heading="Data"
              subheading="We simplify information for you on over 30,000 colleges, 500 exams and 500 courses across domains and regions all over India"
              items={dataHighlights.map((highlight) => ({
                id: highlight.slug,
                label: highlight.title,
                meta: highlight.description,
              }))}
              itemsTitle="Data tiles"
              itemsHint="Two-by-two grid. Order runs left to right, top to bottom."
            />
          ),
        },
      ]}
    />
  );
}
