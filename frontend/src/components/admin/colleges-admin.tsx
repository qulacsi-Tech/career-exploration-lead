"use client";

import { useMemo, useState } from "react";
import { College } from "@/lib/mock-data";
import { AdminPageHeader, AdminSection, AdminSubsection } from "@/components/admin/admin-section";
import { AdminModal } from "@/components/admin/admin-modal";
import { CollegeEditModal } from "@/components/admin/college-edit-modal";
import { TextField, SelectField, Field } from "@/components/admin/admin-fields";

/**
 * Colleges module: a scannable table, with everything bulky behind View.
 *
 * The table carries only what you sort and search on. Courses, fees, rankings,
 * placements, cutoffs and SEO all live in the View dialog — a college has
 * enough attached to it that showing any of it inline makes the list unusable
 * once there are more than a handful of records.
 */
export function CollegesAdmin({ colleges }: { colleges: College[] }) {
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<College | null>(null);
  const [editing, setEditing] = useState<College | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colleges;
    return colleges.filter((c) =>
      [c.name, c.city, c.state, c.stream].some((field) => field.toLowerCase().includes(q)),
    );
  }, [colleges, query]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Colleges"
        description="Every institute in the directory, with its courses, fees, placements and SEO fields."
        actions={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Add college
          </button>
        }
      />

      <AdminSection
        title="All colleges"
        description={`${filtered.length} of ${colleges.length} shown`}
        actions={
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, city, stream"
            aria-label="Search colleges"
            className="w-56 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        }
      >
        {/* Wide table on a narrow screen: scroll it rather than wrap the cells. */}
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th scope="col" className="py-2 pr-3 font-semibold">Name</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Location</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Ownership</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Stream</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Courses</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Rating</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((college) => (
                <tr key={college.slug} className="border-b border-line-soft last:border-b-0">
                  <td className="py-3 pr-3">
                    <p className="font-medium text-ink">{college.name}</p>
                    <p className="text-xs text-ink-faint">{college.slug}</p>
                  </td>
                  <td className="py-3 pr-3 text-ink-soft">
                    {college.city}, {college.state}
                  </td>
                  <td className="py-3 pr-3 text-ink-soft">{college.ownership}</td>
                  <td className="py-3 pr-3 text-ink-soft">{college.stream}</td>
                  <td className="py-3 pr-3 text-ink-soft">{college.coursesOffered}</td>
                  <td className="py-3 pr-3 text-ink-soft">
                    {college.rating}
                    <span className="text-ink-faint"> ({college.reviewCount})</span>
                  </td>
                  <td className="py-3 pl-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(college)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(college)}
                        className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand-soft"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-ink-soft">
                    No colleges match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <ViewCollegeModal
        college={viewing}
        onClose={() => setViewing(null)}
        onEdit={(c) => {
          setViewing(null);
          setEditing(c);
        }}
      />
      <CollegeEditModal college={editing} onClose={() => setEditing(null)} />
      <AddCollegeModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

/** Everything attached to one college, so the listing stays short. */
function ViewCollegeModal({
  college,
  onClose,
  onEdit,
}: {
  college: College | null;
  onClose: () => void;
  onEdit: (college: College) => void;
}) {
  return (
    <AdminModal
      open={college !== null}
      onClose={onClose}
      size="lg"
      title={college?.name ?? ""}
      description={college ? `${college.city}, ${college.state} · ${college.slug}` : undefined}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => college && onEdit(college)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Edit record
          </button>
        </>
      }
    >
      {college && (
        <div className="space-y-6">
          <AdminSubsection title="Basic details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Ownership" value={college.ownership} />
              <Field label="Stream" value={college.stream} />
              <Field label="Established" value={String(college.established)} />
              <Field label="Fees range" value={college.feesRange} />
              <Field label="Ranking" value={`${college.ranking.authority} #${college.ranking.rank}`} />
              <Field label="Rating" value={`${college.rating} (${college.reviewCount} reviews)`} />
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{college.about}</p>
          </AdminSubsection>

          <AdminSubsection title="Courses & fees">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th scope="col" className="py-2 pr-3 font-semibold">Course</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Duration</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Mode</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Fees</th>
                    <th scope="col" className="py-2 font-semibold">Exams</th>
                  </tr>
                </thead>
                <tbody>
                  {college.courses.map((course) => (
                    <tr key={course.name} className="border-b border-line-soft last:border-b-0">
                      <td className="py-2 pr-3 font-medium text-ink">{course.name}</td>
                      <td className="py-2 pr-3 text-ink-soft">{course.duration}</td>
                      <td className="py-2 pr-3 text-ink-soft">{course.mode}</td>
                      <td className="py-2 pr-3 text-ink-soft">{course.fees}</td>
                      <td className="py-2 text-ink-soft">{course.exams.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSubsection>

          <AdminSubsection title="Placements" description={`Batch of ${college.placement.year}`}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Average" value={college.placement.average} />
              <Field label="Median" value={college.placement.median} />
              <Field label="Highest" value={college.placement.highest} />
            </dl>
            <p className="mt-2 text-xs text-ink-soft">
              Top recruiters: {college.placement.topRecruiters.join(", ")}
            </p>
          </AdminSubsection>

          <AdminSubsection title="Cutoffs">
            <ul className="space-y-1 text-sm text-ink-soft">
              {college.cutoffs.map((cutoff) => (
                <li key={`${cutoff.exam}-${cutoff.category}`}>
                  <span className="font-medium text-ink">{cutoff.exam}</span> · {cutoff.category} ·{" "}
                  {cutoff.score}
                </li>
              ))}
            </ul>
          </AdminSubsection>

          <AdminSubsection title="Approvals & tags">
            <div className="flex flex-wrap gap-2">
              {[...college.approvals, ...college.tags].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft"
                >
                  {tag}
                </span>
              ))}
            </div>
          </AdminSubsection>

          <AdminSubsection title="SEO" description="Title, meta description, canonical and schema.">
            <p className="rounded-lg border border-dashed border-line bg-bg-alt px-4 py-5 text-center text-xs text-ink-soft">
              No SEO fields on the record yet — they arrive with the colleges API.
            </p>
          </AdminSubsection>
        </div>
      )}
    </AdminModal>
  );
}

function AddCollegeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Add college"
      description="Basic details now; courses, placements and SEO on the record afterwards."
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
            form="add-college-form"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Save college
          </button>
        </>
      }
    >
      {/* A child of the modal, so its state is discarded when the modal closes
          rather than persisting into the next opening. */}
      <AddCollegeForm onDone={onClose} />
    </AdminModal>
  );
}

/**
 * URL-safe slug from a college name. Strips accents before dropping
 * non-alphanumerics, so "Amrita Viśva" gives "amrita-visva" rather than losing
 * the character entirely.
 */
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AddCollegeForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  /*
    Once the slug has been edited by hand it stops tracking the name. A slug is
    a permanent URL — silently rewriting a deliberate choice on the next
    keystroke in the name field would be the wrong call.
  */
  const [slugEdited, setSlugEdited] = useState(false);

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  return (
    <form
      id="add-college-form"
      onSubmit={(e) => {
        // Nothing is persisted: there is no colleges endpoint to post to yet.
        // Wire this when the API exists rather than inventing a request shape
        // it then has to match.
        e.preventDefault();
        onDone();
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <TextField
        label="College name"
        name="name"
        placeholder="Bengaluru Institute of Management"
        required
        value={name}
        onChange={onNameChange}
      />

      <TextField
        label="URL slug"
        name="slug"
        placeholder="bengaluru-institute-of-management"
        required
        value={slug}
        onChange={(value) => {
          setSlug(value);
          setSlugEdited(true);
        }}
        hint={slugEdited ? "Edited manually." : "Generated from the name."}
        labelAction={
          slugEdited ? (
            <button
              type="button"
              onClick={() => {
                setSlug(slugify(name));
                setSlugEdited(false);
              }}
              className="text-[11px] font-medium text-brand hover:underline"
            >
              Reset to name
            </button>
          ) : undefined
        }
      />

      <TextField label="City" name="city" placeholder="Bengaluru" required />
      <TextField label="State" name="state" placeholder="Karnataka" required />

      <SelectField label="Ownership" name="ownership" options={["Private", "Government", "Deemed"]} />
      <SelectField
        label="Stream"
        name="stream"
        options={["Management", "Engineering", "Medical", "Science", "Arts", "Commerce", "Pharmacy", "Law"]}
      />

      <TextField label="Established" name="established" placeholder="1998" />
      <TextField label="Fees range" name="feesRange" placeholder="₹9.5L - 21L" />

      <div className="sm:col-span-2">
        <label htmlFor="about" className="block text-xs font-semibold text-ink">
          About
        </label>
        <textarea
          id="about"
          name="about"
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          placeholder="Short description used on the college page and in search results."
        />
      </div>
    </form>
  );
}
