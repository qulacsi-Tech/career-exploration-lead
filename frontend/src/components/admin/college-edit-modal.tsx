"use client";

import { useState } from "react";
import { College } from "@/lib/mock-data";
import { AdminModal } from "@/components/admin/admin-modal";
import {
  TextField,
  SelectField,
  SelectWithOtherField,
  TextAreaField,
  NameSlugFields,
} from "@/components/admin/admin-fields";
import { ImageUploadField } from "@/components/admin/media-uploader";
import { CollegeMediaTabs } from "@/components/admin/college-media-tabs";
import {
  CollegeArticlesEditor,
  CollegeAlertsEditor,
} from "@/components/admin/college-articles";
import { RichTextField } from "@/components/admin/rich-text-editor";
import { activeTabTemplates, tabBody } from "@/lib/college-content";

/**
 * Full-screen college editor, one tab per group of fields.
 *
 * Tabs rather than one long form: a college record carries basic details,
 * courses, rankings, placements, cutoffs, reviews, media and SEO. Stacked
 * vertically that is a scroll nobody finishes, and the SEO fields — which the
 * proposal requires on every entity — end up buried at the bottom where they
 * get skipped.
 *
 * Fields mirror the College type in lib/mock-data, plus the SEO group the
 * record does not carry yet. Scalars are uncontrolled (defaultValue) since
 * nothing is persisted; the repeatable groups hold state so rows can be added
 * and removed.
 */

/**
 * The fixed tabs — the ones backed by fields on the college record itself.
 *
 * SEO is deliberately not in this array: it is appended last, after the
 * configurable tabs, so that adding a custom tab never pushes SEO further from
 * where editors have learned to find it (the end).
 */
const FIXED_TABS = [
  { id: "basic", label: "Basic details" },
  { id: "courses", label: "Courses & fees" },
  { id: "rankings", label: "Rankings & approvals" },
  { id: "placements", label: "Placements" },
  { id: "cutoffs", label: "Cutoffs" },
  { id: "reviews", label: "Reviews" },
  { id: "media", label: "Media" },
  { id: "articles", label: "Articles" },
  { id: "alerts", label: "News & alerts" },
] as const;

/**
 * The full tab strip: fixed tabs, then whatever tab templates are active, then
 * SEO.
 *
 * Custom tabs are prefixed `custom:` so a template slug can never collide with
 * a fixed tab id — a template called "media" would otherwise silently take over
 * the Media panel.
 */
const CUSTOM_PREFIX = "custom:";

function useTabs() {
  const templates = activeTabTemplates();
  return [
    ...FIXED_TABS.map((t) => ({ id: t.id as string, label: t.label, template: null })),
    ...templates.map((t) => ({
      id: `${CUSTOM_PREFIX}${t.slug}`,
      label: t.label,
      template: t,
    })),
    { id: "seo", label: "SEO", template: null },
  ];
}

type TabId = string;

export function CollegeEditModal({
  college,
  onClose,
}: {
  college: College | null;
  onClose: () => void;
}) {
  return (
    <AdminModal
      open={college !== null}
      onClose={onClose}
      size="full"
      title={college ? `Edit — ${college.name}` : ""}
      description={college ? `${college.city}, ${college.state} · /college/${college.slug}` : undefined}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="college-edit-form"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Save changes
          </button>
        </>
      }
    >
      {college && <CollegeEditForm college={college} onDone={onClose} />}
    </AdminModal>
  );
}

function CollegeEditForm({ college, onDone }: { college: College; onDone: () => void }) {
  const [tab, setTab] = useState<TabId>("basic");
  const [courses, setCourses] = useState(college.courses);
  const [cutoffs, setCutoffs] = useState(college.cutoffs);
  const tabs = useTabs();
  const activeTab = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <form
      id="college-edit-form"
      onSubmit={(e) => {
        // No colleges endpoint yet — see the note in colleges-admin.tsx.
        e.preventDefault();
        onDone();
      }}
      className="flex h-full flex-col"
    >
      {/* Tab strip. Scrolls sideways rather than wrapping on a narrow screen. */}
      <div role="tablist" aria-label="College fields" className="-mx-5 flex gap-1 overflow-x-auto border-b border-line px-5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              tab === t.id
                ? "border-brand text-brand"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto py-5"
      >
        {tab === "basic" && (
          <FieldGrid>
            <NameSlugFields
              nameLabel="College name"
              defaultName={college.name}
              defaultSlug={college.slug}
            />
            <TextField label="City" name="city" defaultValue={college.city} required />
            <TextField label="State" name="state" defaultValue={college.state} required />
            <SelectField
              label="Ownership"
              name="ownership"
              defaultValue={college.ownership}
              options={["Private", "Government", "Deemed"]}
            />
            <SelectField
              label="Stream"
              name="stream"
              defaultValue={college.stream}
              options={["Management", "Engineering", "Medical", "Science", "Arts", "Commerce", "Pharmacy", "Law"]}
            />
            <TextField
              label="Established"
              name="established"
              type="number"
              defaultValue={String(college.established)}
            />
            <TextField label="Courses offered" name="coursesOffered" type="number" defaultValue={String(college.coursesOffered)} />
            <TextAreaField
              label="About"
              name="about"
              rows={5}
              defaultValue={college.about}
              className="sm:col-span-2 lg:col-span-3"
              hint="Shown on the college page and used for the search snippet."
            />
          </FieldGrid>
        )}

        {tab === "courses" && (
          <div className="space-y-5">
            <FieldGrid>
              <TextField label="Fees range" name="feesRange" defaultValue={college.feesRange} />
              <TextField
                label="Exams accepted"
                name="examsAccepted"
                defaultValue={college.examsAccepted.join(", ")}
                hint="Comma separated."
              />
            </FieldGrid>

            <RepeatableGroup
              title="Courses"
              onAdd={() =>
                setCourses((rows) => [
                  ...rows,
                  { name: "", duration: "", mode: "Full Time", fees: "", exams: [] },
                ])
              }
              addLabel="Add course"
            >
              {courses.map((course, i) => (
                <RepeatableRow
                  key={i}
                  onRemove={() => setCourses((rows) => rows.filter((_, index) => index !== i))}
                >
                  <TextField label="Course name" name={`course-${i}-name`} defaultValue={course.name} />
                  <TextField label="Duration" name={`course-${i}-duration`} defaultValue={course.duration} />
                  <SelectField
                    label="Mode"
                    name={`course-${i}-mode`}
                    defaultValue={course.mode}
                    options={["Full Time", "Part Time", "Weekend", "Online", "Distance"]}
                  />
                  <TextField label="Fees" name={`course-${i}-fees`} defaultValue={course.fees} />
                  <TextField
                    label="Exams"
                    name={`course-${i}-exams`}
                    defaultValue={course.exams.join(", ")}
                    hint="Comma separated."
                  />
                </RepeatableRow>
              ))}
            </RepeatableGroup>
          </div>
        )}

        {tab === "rankings" && (
          <FieldGrid>
            <TextField label="Ranking authority" name="rankingAuthority" defaultValue={college.ranking.authority} />
            <TextField label="Rank" name="rankingRank" type="number" defaultValue={String(college.ranking.rank)} />
            <TextField
              label="Approvals"
              name="approvals"
              defaultValue={college.approvals.join(", ")}
              hint="Comma separated — AICTE, NAAC A++, UGC."
            />
            <TextField
              label="Tags"
              name="tags"
              defaultValue={college.tags.join(", ")}
              hint="Badges shown on listing cards."
            />
          </FieldGrid>
        )}

        {tab === "placements" && (
          <FieldGrid>
            <TextField label="Batch year" name="placementYear" type="number" defaultValue={String(college.placement.year)} />
            <TextField label="Average package" name="placementAverage" defaultValue={college.placement.average} />
            <TextField label="Median package" name="placementMedian" defaultValue={college.placement.median} />
            <TextField label="Highest package" name="placementHighest" defaultValue={college.placement.highest} />
            <TextAreaField
              label="Top recruiters"
              name="topRecruiters"
              defaultValue={college.placement.topRecruiters.join(", ")}
              className="sm:col-span-2 lg:col-span-3"
              hint="Comma separated."
            />
          </FieldGrid>
        )}

        {tab === "cutoffs" && (
          <RepeatableGroup
            title="Cutoffs"
            onAdd={() => setCutoffs((rows) => [...rows, { exam: "", category: "", score: "" }])}
            addLabel="Add cutoff"
          >
            {cutoffs.map((cutoff, i) => (
              <RepeatableRow
                key={i}
                onRemove={() => setCutoffs((rows) => rows.filter((_, index) => index !== i))}
              >
                <TextField label="Exam" name={`cutoff-${i}-exam`} defaultValue={cutoff.exam} />
                <TextField label="Category" name={`cutoff-${i}-category`} defaultValue={cutoff.category} />
                <TextField label="Score" name={`cutoff-${i}-score`} defaultValue={cutoff.score} />
              </RepeatableRow>
            ))}
          </RepeatableGroup>
        )}

        {tab === "reviews" && (
          <div className="space-y-5">
            <FieldGrid>
              <TextField label="Overall rating" name="rating" defaultValue={String(college.rating)} />
              <TextField label="Review count" name="reviewCount" type="number" defaultValue={String(college.reviewCount)} />
            </FieldGrid>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">Rating breakdown</h3>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {college.ratingBreakdown.map((entry) => (
                  <TextField
                    key={entry.label}
                    label={entry.label}
                    name={`rating-${entry.label.toLowerCase()}`}
                    defaultValue={String(entry.score)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                Submitted reviews ({college.reviews.length})
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                Moderation lands with the reviews module in phase 2 — read-only here.
              </p>
              <ul className="mt-3 space-y-2">
                {college.reviews.map((review) => (
                  <li key={`${review.author}-${review.date}`} className="rounded-lg border border-line px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                      <span className="font-semibold text-ink">{review.author}</span>
                      <span>· {review.course} {review.batch}</span>
                      <span>· {review.date}</span>
                      <span>· {review.rating}/5</span>
                      {review.verified && (
                        <span className="rounded border border-line px-1.5 py-px text-[10px] font-medium text-ink-soft">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-ink-soft">{review.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/*
          No path fields anywhere below: images are uploaded, not referenced by
          a hand-typed path. The stored path is whatever the media endpoint
          returns, so asking an editor to type one only invites typos and
          broken images.
        */}
        {tab === "media" && <CollegeMediaTabs collegeSlug={college.slug} />}

        {tab === "articles" && <CollegeArticlesEditor collegeSlug={college.slug} />}

        {tab === "alerts" && <CollegeAlertsEditor collegeSlug={college.slug} />}

        {/*
          A configurable tab is one rich text document per college. The template
          supplies the label and the hint; the body is this college's own.
        */}
        {activeTab.template && (
          <RichTextField
            label={`${activeTab.template.label} content`}
            hint={activeTab.template.hint}
            value={tabBody(college.slug, activeTab.template.slug)}
            minHeight={320}
          />
        )}

        {tab === "seo" && (
          <div className="space-y-5">
            <p className="text-xs text-ink-soft">
              The record carries no SEO fields yet. These are the ones the proposal
              requires on every entity — they persist once the API adds them.
            </p>
            <FieldGrid>
              <TextField
                label="Meta title"
                name="metaTitle"
                placeholder={`${college.name} — Courses, Fees & Placements`}
                className="sm:col-span-2"
                hint="Around 60 characters."
              />
              <TextField
                label="Canonical URL"
                name="canonical"
                placeholder={`/college/${college.slug}`}
              />
              <TextAreaField
                label="Meta description"
                name="metaDescription"
                rows={3}
                placeholder="Around 155 characters, shown in search results."
                className="sm:col-span-2 lg:col-span-3"
              />
              <ImageUploadField
                label="Open Graph image"
                name="ogImage"
                altLabel="og:image:alt"
                altPlaceholder="Campus view of the main block"
                hint="Shown when the page is shared. 1200x630 renders best."
              />
              <SelectWithOtherField
                label="Schema type"
                name="schemaType"
                defaultValue="CollegeOrUniversity"
                options={["CollegeOrUniversity", "EducationalOrganization", "Organization"]}
                customPlaceholder="e.g. Course, LocalBusiness"
                hint="Any schema.org type — the list is only the common ones."
              />
              <SelectField label="Indexing" name="robots" options={["Index, follow", "No index"]} />
            </FieldGrid>
          </div>
        )}
      </div>
    </form>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function RepeatableGroup({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
        >
          {addLabel}
        </button>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function RepeatableRow({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-ink-faint transition hover:text-brand"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
