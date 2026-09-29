"use client";

import { useState } from "react";
import Link from "next/link";
import { College, colleges } from "@/lib/mock-data";
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
import { activeTabTemplates, tabBody, tabTemplates } from "@/lib/college-content";
import { auditCollege, type AuditIssue } from "@/lib/college-audit";
import { faqsFor, monogram } from "@/lib/college-insights";
import { comparisonsFeaturing } from "@/lib/comparison-data";
import { rankingsForCollege } from "@/lib/rankings-data";

/**
 * Full-screen college editor — one tab per tab on the public college page.
 *
 * ## Mirrors the public rail
 *
 * The public page has fifteen fixed tabs (College Info, Courses, Fees, …,
 * News). The editor used to group fields its own way — "Rankings & approvals",
 * "Media", "Articles" — so an editor fixing something they saw on the Fees tab
 * had to know it lived under "Courses & fees". Now each public tab has the
 * editor tab of the same name holding exactly the fields that tab renders,
 * with SEO last. College Info's tab carries the masthead fields too (short
 * name, locality, logo, cover, brochure), since the masthead sits above every
 * tab.
 *
 * ## Every panel stays mounted
 *
 * Scalars are uncontrolled (`defaultValue`), so a panel that unmounted on tab
 * switch dropped whatever was typed into it — the submit would only have seen
 * the tab that happened to be open. Panels are now hidden, not removed, so one
 * Save carries every tab's fields.
 *
 * ## The consistency panel
 *
 * `auditCollege` lists where the record contradicts itself on the page (a fee
 * range that excludes a listed fee, an overall rating far from its category
 * scores) and which detail-page fields are still empty. Each issue links to
 * the tab that fixes it, and tabs carry a count.
 *
 * Nothing is persisted yet — there is no colleges endpoint (see the note in
 * colleges-admin.tsx). Field names are the record's own, so wiring Save to the
 * API is a FormData-to-record mapping, not a rename.
 */

/** The template behind each rich-text tab on the public page. */
const TEMPLATE_TABS: Record<string, string> = {
  admissions: "admission-process",
  infrastructure: "hostel-facilities",
  scholarships: "scholarships",
};

const templateLabel = (slug: string, fallback: string) =>
  tabTemplates.find((t) => t.slug === slug)?.label || fallback;

/** Public rail order. Labels for the template tabs come from the template. */
function useTabs() {
  const mapped = new Set(Object.values(TEMPLATE_TABS));
  /* Active templates the public rail has no slot for — editable, but flagged. */
  const extra = activeTabTemplates()
    .filter((t) => !mapped.has(t.slug))
    .map((t) => ({ id: `custom:${t.slug}`, label: `${t.label} (not on site)` }));

  return [
    { id: "basic", label: "College Info" },
    { id: "courses", label: "Courses" },
    { id: "fees", label: "Fees" },
    { id: "reviews", label: "Reviews" },
    { id: "admissions", label: templateLabel("admission-process", "Admissions") },
    { id: "placements", label: "Placements" },
    { id: "cutoffs", label: "Cut-Offs" },
    { id: "rankings", label: "Rankings" },
    { id: "gallery", label: "Gallery" },
    { id: "infrastructure", label: templateLabel("hostel-facilities", "Infrastructure") },
    { id: "faculty", label: "Faculty" },
    { id: "compare", label: "Compare" },
    { id: "qna", label: "Q&A" },
    { id: "scholarships", label: templateLabel("scholarships", "Scholarships") },
    { id: "news", label: "News" },
    ...extra,
    { id: "seo", label: "SEO" },
  ];
}

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
      {college && <CollegeEditForm key={college.slug} college={college} onDone={onClose} />}
    </AdminModal>
  );
}

type Course = College["courses"][number];
type FacultyMember = NonNullable<College["faculty"]>["members"][number];

function CollegeEditForm({ college, onDone }: { college: College; onDone: () => void }) {
  const tabs = useTabs();
  const [tab, setTab] = useState(tabs[0].id);

  /* Repeatable groups are controlled, so Courses and Fees edit one list. */
  const [courses, setCourses] = useState<Course[]>(college.courses);
  /* Uncontrolled rows carry a stable key: keyed by index, removing a middle
     row would unmount the last one and leave the removed row's values on
     screen. */
  const [cutoffs, setCutoffs] = useState(() => keyed(college.cutoffs));
  const [members, setMembers] = useState(() => keyed<FacultyMember>(college.faculty?.members ?? []));
  const [faqs, setFaqs] = useState(() => keyed(college.faqs ?? []));
  const [similar, setSimilar] = useState<string[]>(college.similarSlugs ?? []);

  const updateCourse = (i: number, patch: Partial<Course>) =>
    setCourses((rows) => rows.map((row, index) => (index === i ? { ...row, ...patch } : row)));

  const issues = auditCollege(college);
  const issuesFor = (id: string) => issues.filter((issue) => issue.tab === id);

  const panel = (id: string) => ({
    role: "tabpanel" as const,
    id: `panel-${id}`,
    "aria-labelledby": `tab-${id}`,
    hidden: tab !== id,
  });

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
        {tabs.map((t) => {
          const count = issuesFor(t.id).filter((issue) => issue.kind === "mismatch").length;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className="rounded-full bg-brand px-1.5 text-[10px] font-bold leading-4 text-white"
                  title={`${count} mismatch${count > 1 ? "es" : ""}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-5">
        <ConsistencyPanel issues={issues} tabs={tabs} onGo={setTab} />

        {/* ---------------- College Info (+ masthead) ---------------- */}
        <div {...panel("basic")} className="space-y-6">
          <FieldGrid>
            <NameSlugFields nameLabel="College name" defaultName={college.name} defaultSlug={college.slug} />
            <TextField
              label="Short name"
              name="shortName"
              defaultValue={college.shortName}
              placeholder={`${monogram(college.name)} ${college.city}`}
              hint="Masthead title, before the tagline. Blank uses initials and city."
            />
            <TextField
              label="Locality"
              name="locality"
              defaultValue={college.locality}
              placeholder="Hosur Road"
              hint="Shown before the city in the masthead."
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
            <TextField label="Established" name="established" type="number" defaultValue={String(college.established)} />
            <TextField
              label="Approvals"
              name="approvals"
              defaultValue={college.approvals.join(", ")}
              hint="Comma separated. Masthead chips and the About card."
            />
            <TextField
              label="Tags"
              name="tags"
              defaultValue={college.tags.join(", ")}
              hint="Badges on listing cards (not on the detail page)."
            />
            <TextAreaField
              label="About"
              name="about"
              rows={5}
              defaultValue={college.about}
              className="sm:col-span-2 lg:col-span-3"
              hint="The About card on College Info, and the search snippet when no meta description is set."
            />
          </FieldGrid>

          <SubHeading>Masthead media</SubHeading>
          <FieldGrid>
            <ImageUploadField
              label="Cover photo"
              name="coverImage"
              altPlaceholder="Main academic block at dusk"
              hint={college.coverImage ? "Uploading replaces the current cover." : "None yet — the banner shows a stock campus photo."}
            />
            <ImageUploadField
              label="Logo"
              name="logo"
              withAlt={false}
              hint={college.logo ? "Uploading replaces the current logo." : `None yet — the tile shows "${monogram(college.name)}".`}
            />
            <FileField
              label="Brochure (PDF)"
              name="brochure"
              accept="application/pdf"
              hint={college.brochureUrl ? "Uploading replaces the current brochure." : "None yet — the Brochure button opens the enquiry form."}
            />
          </FieldGrid>
        </div>

        {/* ---------------- Courses ---------------- */}
        <div {...panel("courses")} className="space-y-5">
          <FieldGrid>
            <TextField
              label="Courses offered"
              name="coursesOffered"
              type="number"
              defaultValue={String(college.coursesOffered)}
              hint={`Programme count on College Info. ${courses.length} listed below.`}
            />
            <TextField
              label="Exams accepted"
              name="examsAccepted"
              defaultValue={college.examsAccepted.join(", ")}
              hint="Comma separated. Include every exam a programme below accepts."
              className="sm:col-span-2"
            />
          </FieldGrid>

          <RepeatableGroup
            title="Programmes"
            onAdd={() =>
              setCourses((rows) => [...rows, { name: "", duration: "", mode: "Full Time", fees: "", exams: [] }])
            }
            addLabel="Add programme"
          >
            {courses.map((course, i) => (
              <RepeatableRow key={i} onRemove={() => setCourses((rows) => rows.filter((_, index) => index !== i))}>
                <TextField label="Programme name" name={`course-${i}-name`} value={course.name} onChange={(v) => updateCourse(i, { name: v })} />
                <TextField label="Duration" name={`course-${i}-duration`} value={course.duration} onChange={(v) => updateCourse(i, { duration: v })} placeholder="24 Months" />
                <SelectField
                  label="Mode"
                  name={`course-${i}-mode`}
                  defaultValue={course.mode}
                  options={["Full Time", "Part Time", "Weekend", "Online", "Distance"]}
                />
                <TextField
                  label="Exams"
                  name={`course-${i}-exams`}
                  value={course.exams.join(", ")}
                  onChange={(v) => updateCourse(i, { exams: v.split(",").map((x) => x.trim()) })}
                  hint="Comma separated."
                />
                <TextField
                  label="Eligibility"
                  name={`course-${i}-eligibility`}
                  value={course.eligibility ?? ""}
                  onChange={(v) => updateCourse(i, { eligibility: v })}
                  placeholder="Graduation with 50% marks"
                />
                <TextField
                  label="Seats"
                  name={`course-${i}-seats`}
                  type="number"
                  value={course.seats === undefined ? "" : String(course.seats)}
                  onChange={(v) => updateCourse(i, { seats: v === "" ? undefined : Number(v) })}
                />
              </RepeatableRow>
            ))}
          </RepeatableGroup>
          <p className="text-xs text-ink-faint">Each programme&apos;s fee is set on the Fees tab.</p>
        </div>

        {/* ---------------- Fees ---------------- */}
        <div {...panel("fees")} className="space-y-5">
          <FieldGrid>
            <TextField
              label="Fee range"
              name="feesRange"
              defaultValue={college.feesRange}
              hint="Masthead, cards and the Fees tab. Should span the lowest and highest programme fee below."
            />
          </FieldGrid>
          <SubHeading>Total fee per programme</SubHeading>
          {courses.length === 0 ? (
            <Empty>Add programmes on the Courses tab first.</Empty>
          ) : (
            <div className="space-y-3">
              {courses.map((course, i) => (
                <div key={i} className="grid grid-cols-1 items-end gap-4 rounded-lg border border-line p-4 sm:grid-cols-[1fr_240px]">
                  <p className="text-sm font-medium text-ink">{course.name || `Programme ${i + 1}`}</p>
                  <TextField
                    label="Total fees"
                    name={`course-${i}-fees`}
                    value={course.fees}
                    onChange={(v) => updateCourse(i, { fees: v })}
                    placeholder="₹18.4L Total Fees"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------------- Reviews ---------------- */}
        <div {...panel("reviews")} className="space-y-5">
          <FieldGrid>
            <TextField label="Overall rating" name="rating" defaultValue={String(college.rating)} hint="Out of 5. Masthead, College Info and Reviews." />
            <TextField label="Review count" name="reviewCount" type="number" defaultValue={String(college.reviewCount)} />
          </FieldGrid>
          <div>
            <SubHeading>Rating breakdown</SubHeading>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {college.ratingBreakdown.map((entry) => (
                <TextField key={entry.label} label={entry.label} name={`rating-${entry.label.toLowerCase()}`} defaultValue={String(entry.score)} />
              ))}
            </div>
          </div>
          <div>
            <SubHeading>Submitted reviews ({college.reviews.length})</SubHeading>
            <p className="mt-1 text-xs text-ink-soft">Moderation lands with the reviews module in phase 2 — read-only here.</p>
            <ul className="mt-3 space-y-2">
              {college.reviews.map((review) => (
                <li key={`${review.author}-${review.date}`} className="rounded-lg border border-line px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                    <span className="font-semibold text-ink">{review.author}</span>
                    <span>· {review.course} {review.batch}</span>
                    <span>· {review.date}</span>
                    <span>· {review.rating}/5</span>
                    {review.verified && (
                      <span className="rounded border border-line px-1.5 py-px text-[10px] font-medium text-ink-soft">Verified</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">{review.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---------------- Rich-text tabs: Admissions, Infrastructure, Scholarships ---------------- */}
        {Object.entries(TEMPLATE_TABS).map(([id, slug]) => {
          const template = tabTemplates.find((t) => t.slug === slug);
          return (
            <div key={id} {...panel(id)}>
              {template && !template.isActive && (
                <p className="mb-3 rounded-lg border border-gold/40 bg-gold-soft px-3 py-2 text-xs text-ink">
                  This template is switched off, so the public tab shows its empty state.
                </p>
              )}
              <RichTextField
                label={`${template?.label ?? id} content`}
                hint={template?.hint}
                value={tabBody(college.slug, slug)}
                minHeight={320}
              />
            </div>
          );
        })}

        {/* ---------------- Placements ---------------- */}
        <div {...panel("placements")}>
          <FieldGrid>
            <TextField label="Batch year" name="placementYear" type="number" defaultValue={String(college.placement.year)} />
            <TextField
              label="Batch placed (%)"
              name="placedPercent"
              type="number"
              defaultValue={college.placement.placedPercent === undefined ? "" : String(college.placement.placedPercent)}
              hint="Optional. Shown beside the packages."
            />
            <TextField label="Average package" name="placementAverage" defaultValue={college.placement.average} hint="Also in the masthead." />
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
        </div>

        {/* ---------------- Cut-Offs ---------------- */}
        <div {...panel("cutoffs")}>
          <RepeatableGroup
            title="Cut-offs"
            onAdd={() => setCutoffs((rows) => [...rows, withKey({ exam: "", category: "", score: "" })])}
            addLabel="Add cut-off"
          >
            {cutoffs.map((cutoff, i) => (
              <RepeatableRow key={cutoff.key} onRemove={() => setCutoffs((rows) => rows.filter((row) => row.key !== cutoff.key))}>
                <TextField label="Exam" name={`cutoff-${i}-exam`} defaultValue={cutoff.exam} />
                <TextField label="Category" name={`cutoff-${i}-category`} defaultValue={cutoff.category} />
                <TextField label="Score" name={`cutoff-${i}-score`} defaultValue={cutoff.score} hint={`"92 percentile" draws a bar; "Rank 2,480" does not.`} />
              </RepeatableRow>
            ))}
          </RepeatableGroup>
        </div>

        {/* ---------------- Rankings ---------------- */}
        <div {...panel("rankings")} className="space-y-5">
          <FieldGrid>
            <TextField label="Headline ranking authority" name="rankingAuthority" defaultValue={college.ranking.authority} />
            <TextField label="Headline rank" name="rankingRank" type="number" defaultValue={String(college.ranking.rank)} hint="College Info snapshot and the Rankings tab headline." />
          </FieldGrid>
          <div>
            <SubHeading>Ranking lists this college is in</SubHeading>
            <p className="mt-1 text-xs text-ink-soft">
              Shown on the public Rankings tab. Managed in the{" "}
              <Link href="/admin/rankings" className="font-medium text-brand hover:underline">Rankings module</Link>.
            </p>
            {rankingsForCollege(college.slug).length === 0 ? (
              <Empty>Not in any ranking list yet.</Empty>
            ) : (
              <ul className="mt-3 divide-y divide-line-soft rounded-lg border border-line">
                {rankingsForCollege(college.slug).map(({ entry, list }) => (
                  <li key={list.slug} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink">{list.name}</span>
                    <span className="font-semibold text-ink">#{entry.rank}{entry.isPinned && <span className="ml-2 text-[10px] font-medium text-brand">PINNED</span>}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ---------------- Gallery ---------------- */}
        {/* No path fields: images are uploaded, not referenced by a typed path. */}
        <div {...panel("gallery")}>
          <p className="mb-3 text-xs text-ink-soft">
            Gallery photos and videos show on the Gallery tab. Media &amp; press items show under News → In the Media.
          </p>
          <CollegeMediaTabs collegeSlug={college.slug} />
        </div>

        {/* ---------------- Faculty ---------------- */}
        <div {...panel("faculty")} className="space-y-5">
          <FieldGrid>
            <TextField label="Faculty members" name="facultyCount" type="number" defaultValue={college.faculty?.count === undefined ? "" : String(college.faculty.count)} />
            <TextField label="Student–faculty ratio" name="facultyRatio" defaultValue={college.faculty?.studentRatio} placeholder="12:1" />
            <TextField label="Faculty with a PhD (%)" name="facultyPhd" type="number" defaultValue={college.faculty?.phdPercent === undefined ? "" : String(college.faculty.phdPercent)} />
          </FieldGrid>
          <RepeatableGroup
            title="Faculty profiles"
            addLabel="Add faculty member"
            onAdd={() => setMembers((rows) => [...rows, withKey<FacultyMember>({ name: "", designation: "", department: "" })])}
          >
            {members.map((member, i) => (
              <RepeatableRow key={member.key} onRemove={() => setMembers((rows) => rows.filter((row) => row.key !== member.key))}>
                <TextField label="Name" name={`faculty-${i}-name`} defaultValue={member.name} placeholder="Dr. Meera Iyer" />
                <TextField label="Designation" name={`faculty-${i}-designation`} defaultValue={member.designation} placeholder="Professor" />
                <TextField label="Department" name={`faculty-${i}-department`} defaultValue={member.department} placeholder="Finance" />
                <TextField label="Qualification" name={`faculty-${i}-qualification`} defaultValue={member.qualification} placeholder="PhD, IIM Bangalore" />
              </RepeatableRow>
            ))}
          </RepeatableGroup>
          {members.length === 0 && <Empty>No profiles — the Faculty tab shows a &ldquo;coming soon&rdquo; card.</Empty>}
        </div>

        {/* ---------------- Compare ---------------- */}
        <div {...panel("compare")} className="space-y-5">
          <div>
            <SubHeading>Pinned similar colleges</SubHeading>
            <p className="mt-1 text-xs text-ink-soft">
              Shown first under &ldquo;Explore Colleges Similar&rdquo; and in the Compare table, in the order ticked.
              Unpinned slots fill with the nearest colleges in the same stream by rank.
            </p>
            {similar.length > 0 && (
              <p className="mt-2 text-xs text-ink">
                Order:{" "}
                {similar.map((slug, i) => (
                  <span key={slug}>
                    {i > 0 && " → "}
                    {colleges.find((c) => c.slug === slug)?.name ?? slug}
                  </span>
                ))}
              </p>
            )}
            <input type="hidden" name="similarSlugs" value={similar.join(",")} />
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {colleges
                .filter((c) => c.slug !== college.slug)
                .sort((a, b) => Number(b.stream === college.stream) - Number(a.stream === college.stream))
                .map((c) => (
                  <li key={c.slug}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-brand/50">
                      <input
                        type="checkbox"
                        checked={similar.includes(c.slug)}
                        onChange={(e) =>
                          setSimilar((rows) => (e.target.checked ? [...rows, c.slug] : rows.filter((s) => s !== c.slug)))
                        }
                        className="h-3.5 w-3.5"
                      />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-ink-faint">{c.stream}</span>
                    </label>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <SubHeading>Curated comparisons featuring this college</SubHeading>
            {comparisonsFeaturing(college.slug).length === 0 ? (
              <Empty>None — the &ldquo;Which Should You Choose?&rdquo; card is hidden.</Empty>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                {comparisonsFeaturing(college.slug).map((c) => (
                  <li key={c.slug}>{c.title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ---------------- Q&A ---------------- */}
        <div {...panel("qna")} className="space-y-5">
          <RepeatableGroup
            title="Written Q&A"
            addLabel="Add question"
            onAdd={() => setFaqs((rows) => [...rows, withKey({ question: "", answer: "" })])}
          >
            {faqs.map((faq, i) => (
              <RepeatableRow key={faq.key} onRemove={() => setFaqs((rows) => rows.filter((row) => row.key !== faq.key))}>
                <TextField label="Question" name={`faq-${i}-question`} defaultValue={faq.question} className="sm:col-span-2 lg:col-span-3" />
                <TextAreaField label="Answer" name={`faq-${i}-answer`} defaultValue={faq.answer} rows={3} className="sm:col-span-2 lg:col-span-3" />
              </RepeatableRow>
            ))}
          </RepeatableGroup>
          <div>
            <SubHeading>Also shown — generated from the record</SubHeading>
            <p className="mt-1 text-xs text-ink-soft">
              These follow the written ones on the page, answered from the fields on the other tabs. Write a
              question with the same wording above to replace one.
            </p>
            <ul className="mt-3 space-y-2">
              {faqsFor(college).map((faq) => (
                <li key={faq.question} className="rounded-lg border border-dashed border-line px-4 py-3">
                  <p className="text-sm font-medium text-ink">{faq.question}</p>
                  <p className="mt-1 text-xs text-ink-soft">{faq.answer}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---------------- News ---------------- */}
        <div {...panel("news")} className="space-y-8">
          <div>
            <SubHeading>What&apos;s new — alerts on College Info</SubHeading>
            <div className="mt-3"><CollegeAlertsEditor collegeSlug={college.slug} /></div>
          </div>
          <div>
            <SubHeading>Articles — the News tab</SubHeading>
            <div className="mt-3"><CollegeArticlesEditor collegeSlug={college.slug} /></div>
          </div>
        </div>

        {/* ---------------- Active templates with no public tab ---------------- */}
        {tabs
          .filter((t) => t.id.startsWith("custom:"))
          .map((t) => {
            const slug = t.id.slice("custom:".length);
            const template = tabTemplates.find((entry) => entry.slug === slug);
            return (
              <div key={t.id} {...panel(t.id)}>
                <p className="mb-3 rounded-lg border border-gold/40 bg-gold-soft px-3 py-2 text-xs text-ink">
                  The public page has no tab for this template yet, so this content is not shown.
                </p>
                <RichTextField label={`${template?.label ?? slug} content`} hint={template?.hint} value={tabBody(college.slug, slug)} minHeight={320} />
              </div>
            );
          })}

        {/* ---------------- SEO ---------------- */}
        <div {...panel("seo")} className="space-y-5">
          <FieldGrid>
            <TextField
              label="Meta title"
              name="metaTitle"
              defaultValue={college.seo?.metaTitle}
              placeholder={`${college.name}: Courses, Fees, Placements & Reviews`}
              className="sm:col-span-2"
              hint="College Info page title. Around 60 characters."
            />
            <TextField label="Canonical URL" name="canonical" placeholder={`/college/${college.slug}`} />
            <TextField
              label="H1 tagline"
              name="h1Tagline"
              defaultValue={college.seo?.h1Tagline}
              placeholder="Courses, Fees, Admission 2027, Placements, Ranking, Scholarships"
              className="sm:col-span-2 lg:col-span-3"
              hint="After the short name in the masthead heading. Blank uses this default with next year's intake."
            />
            <TextAreaField
              label="Meta description"
              name="metaDescription"
              rows={3}
              defaultValue={college.seo?.metaDescription}
              placeholder="Around 155 characters, shown in search results. Blank uses About."
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
      </div>
    </form>
  );
}

/** Where the record contradicts itself on the page, and what is still empty. */
function ConsistencyPanel({
  issues,
  tabs,
  onGo,
}: {
  issues: AuditIssue[];
  tabs: { id: string; label: string }[];
  onGo: (tab: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const mismatches = issues.filter((issue) => issue.kind === "mismatch");
  const gaps = issues.filter((issue) => issue.kind === "gap");
  if (issues.length === 0) return null;

  const row = (issue: AuditIssue, i: number) => (
    <li key={i} className="flex items-start justify-between gap-3 text-xs">
      <span className="text-ink">{issue.message}</span>
      <button type="button" onClick={() => onGo(issue.tab)} className="shrink-0 font-semibold text-brand hover:underline">
        {tabs.find((t) => t.id === issue.tab)?.label ?? issue.tab} →
      </button>
    </li>
  );

  return (
    <div className={`mb-5 rounded-lg border px-4 py-3 ${mismatches.length ? "border-brand/40 bg-brand-soft/60" : "border-line bg-bg-alt"}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between text-left text-sm font-semibold text-ink">
        <span>
          {mismatches.length > 0 && `${mismatches.length} mismatch${mismatches.length > 1 ? "es" : ""} on the public page`}
          {mismatches.length > 0 && gaps.length > 0 && " · "}
          {gaps.length > 0 && `${gaps.length} field${gaps.length > 1 ? "s" : ""} using a fallback`}
        </span>
        <span className="text-xs text-brand">{open ? "Hide" : "Review"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {mismatches.length > 0 && <ul className="space-y-1.5">{mismatches.map(row)}</ul>}
          {gaps.length > 0 && (
            <ul className="space-y-1.5 border-t border-line pt-3 opacity-80">{gaps.map(row)}</ul>
          )}
        </div>
      )}
    </div>
  );
}

/** A single-file slot for a non-image upload — the brochure PDF. */
function FileField({ label, name, accept, hint }: { label: string; name: string; accept: string; hint?: string }) {
  const [file, setFile] = useState<string>("");
  return (
    <div>
      <p className="text-xs font-semibold text-ink">{label}</p>
      <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-bg-alt px-4 py-6 text-center text-xs text-ink transition hover:border-brand/50">
        {file || (
          <>
            Drop a file, or <span className="text-brand">browse</span>
          </>
        )}
        <input type="file" name={name} accept={accept} className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
      </label>
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

let rowKey = 0;
const withKey = <T,>(row: T): T & { key: number } => ({ ...row, key: ++rowKey });
const keyed = <T,>(rows: T[]) => rows.map((row) => withKey(row));

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">{children}</h3>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-dashed border-line bg-bg-alt px-4 py-4 text-center text-xs text-ink-soft">
      {children}
    </p>
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
        <SubHeading>{title}</SubHeading>
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
