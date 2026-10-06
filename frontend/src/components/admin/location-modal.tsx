"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLocation, deleteLocation, saveHomeCopy, updateLocation } from "@/lib/admin-actions";
import type { AdminHomeLocation, AdminLocationLabel, IndiaGeo, LocationInput, LocationPicker } from "@/lib/api";
import type { LocationCardCopy } from "@/lib/home-copy";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { CategoriesPicker } from "@/components/admin/location-categories-picker";

/*
  One location, one full-width form in four tabs:

    Details       where it is, its name and count, and whether it shows
    Categories    which categories the card offers and the colleges listed under each
    Card content  the description, the average package and the labels
    Photo         the card's picture
    Card wording  the fixed words on every card (shared, not per location)

  Add and edit are the same screen. One Save at the bottom saves the location, and
  also the card wording if it was changed.

  Labels are typed straight onto the card. Labels other cards already use are
  offered as one-click suggestions, so a tag is reused rather than retyped, and a
  label nobody uses any more disappears by itself.

  A location's page address is made from its name when it is created and stays
  the same after a rename, so links to it keep working.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

const MAX_LABELS = 6;
const MAX_COURSE_FEES = 3;
const SOFT_LABELS = 4;

type TabId = "details" | "categories" | "content" | "photo" | "wording";

const TABS: { id: TabId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "categories", label: "Categories & colleges" },
  { id: "content", label: "Card content" },
  { id: "photo", label: "Photo" },
  { id: "wording", label: "Card wording" },
];

const BLANK: LocationInput = {
  name: "",
  state: "",
  district: "",
  collegeCount: 0,
  description: "",
  avgPackage: "",
  image: "",
  labels: [],
  courseFees: [],
  featured: [],
  show: true,
};

function toInput(loc: AdminHomeLocation): LocationInput {
  return {
    name: loc.name,
    state: loc.state,
    district: loc.district,
    collegeCount: loc.collegeCount,
    description: loc.description,
    avgPackage: loc.avgPackage,
    image: loc.image,
    labels: loc.labels,
    courseFees: loc.courseFees,
    featured: loc.featured,
    show: loc.show,
  };
}

function Text({
  id,
  label,
  value,
  onChange,
  max,
  hint,
  multiline,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  hint?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {multiline ? (
        <textarea id={id} rows={4} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      ) : (
        <input id={id} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      )}
      <p className="mt-1 text-xs text-ink-faint">
        {hint ? `${hint} ` : ""}
        {value.length}/{max}
      </p>
    </div>
  );
}

export function LocationModal({
  location,
  geo,
  labelPool,
  picker,
  wording,
  onClose,
}: {
  /** The location to edit, or null to add a new one. */
  location: AdminHomeLocation | null;
  geo: IndiaGeo;
  labelPool: AdminLocationLabel[];
  /** Every category and its colleges, for the Categories tab. */
  picker: LocationPicker;
  /** The fixed words on every card. Saved with the location when changed. */
  wording: LocationCardCopy;
  /** Called when the form closes. `message` is set when something was saved, added or deleted. */
  onClose: (message?: string) => void;
}) {
  const router = useRouter();
  const editing = location;
  const [tab, setTab] = useState<TabId>("details");
  const [draft, setDraft] = useState<LocationInput>(() => (location ? toInput(location) : BLANK));
  const [wordingDraft, setWordingDraft] = useState<LocationCardCopy>(wording);
  // What the server holds for the wording, so a retry after a failed save does not resend it.
  const [savedWording, setSavedWording] = useState<LocationCardCopy>(wording);
  const [typed, setTyped] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof LocationInput>(key: K, value: LocationInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };
  const setWording = (key: keyof LocationCardCopy, value: string) => {
    setWordingDraft((w) => ({ ...w, [key]: value }));
    setError(null);
  };

  // Choosing a state clears the district, which belongs to the old state. Choosing a
  // district names a blank location after it, so the common case needs no typing.
  const chooseState = (state: string) => {
    setDraft((d) => ({ ...d, state, district: "" }));
    setError(null);
  };
  const chooseDistrict = (district: string) => {
    setDraft((d) => ({ ...d, district, name: d.name.trim() === "" ? district : d.name }));
    setError(null);
  };

  const states = Object.keys(geo).sort();
  // A location saved before the lists existed may hold a name that is not in them. Keep it selectable.
  const stateOptions = draft.state && !states.includes(draft.state) ? [draft.state, ...states] : states;
  const districts = draft.state ? (geo[draft.state] ?? []) : [];

  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const hasLabel = (text: string) => draft.labels.some((l) => same(l, text));
  const full = draft.labels.length >= MAX_LABELS;

  const addLabel = (raw: string) => {
    const text = raw.trim();
    if (!text || full || hasLabel(text)) return;
    // Typing "student capital" reuses the existing "Student Capital".
    const existing = labelPool.find((l) => same(l.text, text))?.text ?? text;
    set("labels", [...draft.labels, existing]);
  };
  const submitTyped = () => {
    addLabel(typed);
    setTyped("");
  };

  const suggestions = labelPool.map((l) => l.text).filter((text) => !hasLabel(text));

  const canSave = draft.name.trim().length >= 2 && draft.state !== "";
  const wordingChanged =
    wordingDraft.institutionsLabel !== savedWording.institutionsLabel ||
    wordingDraft.ctcLabel !== savedWording.ctcLabel ||
    wordingDraft.coursesLabel !== savedWording.coursesLabel ||
    wordingDraft.buttonLabel !== savedWording.buttonLabel;

  const save = () => {
    // A label typed but not yet confirmed with Enter still counts.
    const pendingText = typed.trim();
    const labels =
      pendingText && !full && !hasLabel(pendingText)
        ? [...draft.labels, labelPool.find((l) => same(l.text, pendingText))?.text ?? pendingText]
        : draft.labels;
    setError(null);
    startTransition(async () => {
      // The wording is shared and simple, so it goes first: if it is refused, nothing else has changed.
      if (wordingChanged) {
        const result = await saveHomeCopy("locationCard", { ...wordingDraft });
        if ("error" in result) {
          setTab("wording");
          setError(result.error);
          return;
        }
        setSavedWording(wordingDraft);
      }
      // A half-filled row would be refused, so only complete rows are sent.
      const courseFees = draft.courseFees
        .map((r) => ({ category: r.category.trim(), fees: r.fees.trim() }))
        .filter((r) => r.category && r.fees);
      const body = { ...draft, labels, courseFees };
      const result = editing ? await updateLocation(editing.slug, body) : await createLocation(body);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose(editing ? `${draft.name.trim()} saved.` : `${draft.name.trim()} added to the homepage carousel list.`);
    });
  };

  const remove = () => {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteLocation(editing.slug);
      if ("error" in result) {
        setConfirmingDelete(false);
        setError(result.error);
        return;
      }
      router.refresh();
      onClose(`${editing.name} deleted.`);
    });
  };

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && (
        <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {editing && (
        <div className="flex items-center gap-2">
          {confirmingDelete ? (
            <>
              <span className="text-xs text-ink-soft">Delete {editing.name}? Its page stops working.</span>
              <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {pending ? "Deleting…" : "Yes, delete"}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-brand">
                Keep
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">
              Delete location
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-3">
        {!canSave && <span className="text-xs text-amber-800">Choose a state and enter a name on the Details tab.</span>}
        {canSave && wordingChanged && <span className="text-xs text-ink-soft">Card wording changed. It applies to every card.</span>}
        <button type="button" onClick={() => onClose()} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!canSave || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending && !confirmingDelete ? "Saving…" : editing ? "Save" : "Add location"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminModal
      open
      onClose={() => onClose()}
      size="full"
      title={editing ? `Edit ${editing.name}` : "Add location"}
      description="Everything about this location and its homepage card. One Save at the bottom keeps all the tabs."
      footer={footer}
    >
      <div role="tablist" aria-label="Location sections" className="-mt-1 mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const active = tab === t.id;
          const flag = t.id === "details" && !canSave ? "incomplete" : t.id === "wording" && wordingChanged ? "changed" : null;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`loc-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`loc-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
              {flag && (
                <span className={`h-2 w-2 rounded-full ${flag === "incomplete" ? "bg-amber-500" : "bg-brand"}`} title={flag === "incomplete" ? "Needs a state and a name" : "Unsaved change"} />
              )}
            </button>
          );
        })}
      </div>

      {tab === "details" && (
        <div role="tabpanel" id="loc-panel-details" aria-labelledby="loc-tab-details" className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="loc-state" className="block text-xs font-semibold text-ink">
                State <span className="text-brand">*</span>
              </label>
              <select id="loc-state" value={draft.state} onChange={(e) => chooseState(e.target.value)} className={input}>
                <option value="">Select a state or union territory</option>
                {stateOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="loc-district" className="block text-xs font-semibold text-ink">
                District
              </label>
              <select
                id="loc-district"
                value={draft.district}
                disabled={!draft.state}
                onChange={(e) => chooseDistrict(e.target.value)}
                className={`${input} disabled:opacity-60`}
              >
                <option value="">{draft.state ? "Select a district (optional)" : "Select a state first"}</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <Text
              id="loc-name"
              label="Name"
              required
              max={200}
              value={draft.name}
              onChange={(v) => set("name", v)}
              hint={editing ? "The page address stays the same after a rename." : "Picking a district fills this in. Edit it for a hub such as Delhi NCR."}
            />
            <div>
              <label htmlFor="loc-count" className="block text-xs font-semibold text-ink">
                Institutions count
              </label>
              <input
                id="loc-count"
                type="number"
                min={0}
                max={100000}
                value={draft.collegeCount}
                onChange={(e) => set("collegeCount", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className={input}
              />
              <p className="mt-1 text-xs text-ink-faint">Shown as &ldquo;189+ Ranked Institutions&rdquo;.</p>
            </div>
          </div>

          <label className="flex max-w-xl cursor-pointer items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-3">
            <input
              type="checkbox"
              checked={draft.show}
              onChange={(e) => set("show", e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
            />
            <span className="text-sm text-ink">Show this card in the homepage carousel</span>
          </label>
        </div>
      )}

      {tab === "categories" && (
        <div role="tabpanel" id="loc-panel-categories" aria-labelledby="loc-tab-categories">
          <CategoriesPicker picker={picker} value={draft.featured} onChange={(v) => set("featured", v)} />
        </div>
      )}

      {tab === "content" && (
        <div role="tabpanel" id="loc-panel-content" aria-labelledby="loc-tab-content" className="space-y-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Text id="loc-description" label="Description" multiline max={400} value={draft.description} onChange={(v) => set("description", v)} hint="The paragraph under the city name." />
            </div>
            <Text id="loc-avg" label="Average package" max={60} value={draft.avgPackage} onChange={(v) => set("avgPackage", v)} hint="e.g. ₹7.0 - 18 LPA." />
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-ink">
              Courses &amp; fees <span className="font-normal text-ink-soft">({draft.courseFees.length} of {MAX_COURSE_FEES})</span>
            </legend>
            <p className="mt-1 text-xs text-ink-faint">
              Shown as tiles on the card: a course category and its fee range, such as MBA and ₹6L - 24L.
            </p>
            <div className="mt-2 max-w-2xl space-y-2">
              {draft.courseFees.map((row, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                  <input
                    aria-label={`Course category ${i + 1}`}
                    maxLength={60}
                    value={row.category}
                    placeholder="Category, e.g. MBA"
                    onChange={(e) => set("courseFees", draft.courseFees.map((r, n) => (n === i ? { ...r, category: e.target.value } : r)))}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                  />
                  <input
                    aria-label={`Fees range ${i + 1}`}
                    maxLength={40}
                    value={row.fees}
                    placeholder="Fees, e.g. ₹6L - 24L"
                    onChange={(e) => set("courseFees", draft.courseFees.map((r, n) => (n === i ? { ...r, fees: e.target.value } : r)))}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => set("courseFees", draft.courseFees.filter((_, n) => n !== i))}
                    className="rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:border-red-700 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {draft.courseFees.length < MAX_COURSE_FEES && (
                <button
                  type="button"
                  onClick={() => set("courseFees", [...draft.courseFees, { category: "", fees: "" }])}
                  className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white"
                >
                  Add a course
                </button>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-ink">
              Labels <span className="font-normal text-ink-soft">({draft.labels.length} of {MAX_LABELS})</span>
            </legend>
            <p className="mt-1 text-xs text-ink-faint">The small pills at the top of the card. Type one and press Enter.</p>

            {draft.labels.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {draft.labels.map((text) => (
                  <li key={text} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-alt py-1 pl-3 pr-1.5 text-sm text-ink">
                    {text}
                    <button
                      type="button"
                      aria-label={`Remove ${text}`}
                      onClick={() => set("labels", draft.labels.filter((l) => !same(l, text)))}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-ink-soft hover:bg-red-50 hover:text-red-700"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 flex max-w-xl gap-2">
              <label htmlFor="loc-label" className="sr-only">
                Add a label
              </label>
              <input
                id="loc-label"
                maxLength={60}
                value={typed}
                disabled={full}
                placeholder={full ? `A card can show up to ${MAX_LABELS} labels` : "e.g. Student Capital"}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    submitTyped();
                  }
                }}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none disabled:opacity-60"
              />
              <button type="button" onClick={submitTyped} disabled={!typed.trim() || full} className="shrink-0 rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40">
                Add
              </button>
            </div>

            {suggestions.length > 0 && !full && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-faint">Used on other cards:</span>
                {suggestions.map((text) => (
                  <button key={text} type="button" onClick={() => addLabel(text)} className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-ink-soft hover:border-brand hover:text-brand">
                    + {text}
                  </button>
                ))}
              </div>
            )}

            {draft.labels.length > SOFT_LABELS && (
              <p role="status" className="mt-2 max-w-xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                More than {SOFT_LABELS} labels will wrap onto several lines across the top of the card.
              </p>
            )}
          </fieldset>
        </div>
      )}

      {tab === "photo" && (
        <div role="tabpanel" id="loc-panel-photo" aria-labelledby="loc-tab-photo">
          <ImageUploadField
            kind="location"
            value={draft.image}
            onChange={(v) => set("image", v)}
            fallbackNote="No photo. The card shows a plain dark background."
          />
        </div>
      )}

      {tab === "wording" && (
        <div role="tabpanel" id="loc-panel-wording" aria-labelledby="loc-tab-wording" className="space-y-5">
          <p className="max-w-3xl rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            These words repeat on <strong>every</strong> destination card, not only this one. Changing them here changes all cards when you save.
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Text
              id="wording-institutions"
              label="Text after the count"
              max={40}
              value={wordingDraft.institutionsLabel}
              onChange={(v) => setWording("institutionsLabel", v)}
              hint="Reads as 189+ Ranked Institutions."
            />
            <Text
              id="wording-ctc"
              label="Label above the average package"
              max={40}
              value={wordingDraft.ctcLabel}
              onChange={(v) => setWording("ctcLabel", v)}
            />
            <Text
              id="wording-courses"
              label="Heading over the courses"
              max={40}
              value={wordingDraft.coursesLabel}
              onChange={(v) => setWording("coursesLabel", v)}
              hint="Above the sliding course fees."
            />
            <Text
              id="wording-button"
              label="Button label"
              max={30}
              value={wordingDraft.buttonLabel}
              onChange={(v) => setWording("buttonLabel", v)}
            />
          </div>
        </div>
      )}
    </AdminModal>
  );
}
