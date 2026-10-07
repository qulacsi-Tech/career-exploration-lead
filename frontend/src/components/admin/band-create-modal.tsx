"use client";

import { useState, useTransition } from "react";
import { createHomepageBand } from "@/lib/admin-actions";
import type { LocationPicker } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { CollegeMultiPicker } from "@/components/admin/college-multi-picker";

/*
  Add a college row to the homepage without leaving this screen.

  What the homepage shows for a row is its heading, a line under it and the college
  cards (up to the card limit), then the "view all" button. So the form asks for exactly
  that: the words, the colleges (filtered by type, several at a time) and how many cards
  show. One Save creates the row, publishes it and puts it at the end of the homepage.
  Its own page, SEO text and rules can be refined later under Content -> Collections.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

const MAX_CARDS = 24;

export function BandCreateModal({
  picker,
  onClose,
}: {
  picker: LocationPicker;
  /** `message` is set when a row was added, so the page can say so and refresh. */
  onClose: (message?: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  const [limit, setLimit] = useState(6);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSave = title.trim().length >= 2 && picked.length > 0;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await createHomepageBand({
        title: title.trim(),
        heading: heading.trim(),
        subheading: subheading.trim(),
        collegeSlugs: picked,
        limit,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onClose(result.message);
    });
  };

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && (
        <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {!canSave && <span className="text-xs text-amber-800">Add a title and pick at least one college.</span>}
        <button type="button" onClick={() => onClose()} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!canSave || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Adding…" : "Add to homepage"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminModal
      open
      onClose={() => onClose()}
      size="full"
      title="Add a college row"
      description="A row of college cards on the homepage: its heading, its colleges and how many cards show."
      footer={footer}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="band-title" className="block text-xs font-semibold text-ink">
              Row name <span className="text-brand">*</span>
            </label>
            <input id="band-title" maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="e.g. Top Engineering Colleges" />
            <p className="mt-1 text-xs text-ink-faint">Also the name in Content → Collections. {title.length}/70</p>
          </div>
          <div>
            <label htmlFor="band-heading" className="block text-xs font-semibold text-ink">
              Heading on the homepage
            </label>
            <input id="band-heading" maxLength={200} value={heading} onChange={(e) => setHeading(e.target.value)} className={input} />
            <p className="mt-1 text-xs text-ink-faint">Left empty, the row name is used.</p>
          </div>
          <div className="xl:col-span-1">
            <label htmlFor="band-sub" className="block text-xs font-semibold text-ink">
              Line under the heading
            </label>
            <input id="band-sub" maxLength={300} value={subheading} onChange={(e) => setSubheading(e.target.value)} className={input} />
            <p className="mt-1 text-xs text-ink-faint">Optional. {subheading.length}/300</p>
          </div>
          <div>
            <label htmlFor="band-limit" className="block text-xs font-semibold text-ink">
              Cards shown
            </label>
            <select id="band-limit" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={input}>
              {Array.from({ length: MAX_CARDS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">The first {limit} picked colleges show; more than 3 slide.</p>
          </div>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold text-ink">
            Colleges <span className="text-brand">*</span>
          </legend>
          <p className="mb-3 mt-1 text-xs text-ink-faint">
            Choose a type to narrow the list, then tick as many colleges as you like. They show in the order you pick them.
          </p>
          <CollegeMultiPicker idPrefix="band-new" colleges={picker.colleges} streams={picker.streams} selected={picked} onChange={setPicked} max={100} />
        </fieldset>
      </div>
    </AdminModal>
  );
}
