"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createBandCollege, loadBandColleges, saveBandColleges, saveHomeCopy, updateBandCollege } from "@/lib/admin-actions";
import type { AdminHomepageBand, BandCollege, BandColleges, CollegeCardInput, IndiaGeo } from "@/lib/api";
import type { CollegeCardCopy } from "@/lib/home-copy";
import { mediaUrl } from "@/lib/media";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  Manage colleges: the colleges in one homepage band, in three tabs.

    Colleges       who is in the band and in what order; add one that exists
    Add / edit     create a college or change one, photo included
    Card wording   the fixed words on every college card (shared by all bands)

  Adding, removing and reordering save the moment you click, as on the other
  homepage screens. A new college is created and added to this band in one step.
  Courses, placements and reviews live on the college's full record under Content.

  A college removed here only leaves the band. It stays in the directory.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

type TabId = "colleges" | "college" | "wording";

const TABS: { id: TabId; label: string }[] = [
  { id: "colleges", label: "Colleges" },
  { id: "college", label: "Add / edit college" },
  { id: "wording", label: "Card wording" },
];

const BLANK: CollegeCardInput = { name: "", city: "", state: "", ownership: "Private", stream: "", feesRange: "", image: "" };

function toInput(c: BandCollege): CollegeCardInput {
  return { name: c.name, city: c.city, state: c.state, ownership: c.ownership, stream: c.stream, feesRange: c.feesRange, image: c.image };
}

function Thumb({ image }: { image: string }) {
  return (
    <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-bg-alt">
      {image && (
        // Plain img: uploads come from the API's origin, not the optimizer's allow-list.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(image)} alt="" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

export function BandCollegesModal({
  band,
  geo,
  streams,
  wording,
  onClose,
}: {
  band: AdminHomepageBand;
  geo: IndiaGeo;
  /** Stream names the stream pages know, for the stream dropdown. */
  streams: string[];
  wording: CollegeCardCopy;
  /** `message` is set when anything was changed, so the page can say so and refresh. */
  onClose: (message?: string) => void;
}) {
  const [tab, setTab] = useState<TabId>("colleges");
  const [data, setData] = useState<BandColleges | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  const [changed, setChanged] = useState(false);

  const [pick, setPick] = useState("");
  const [editing, setEditing] = useState<BandCollege | null>(null);
  const [draft, setDraft] = useState<CollegeCardInput>(BLANK);
  const [wordingDraft, setWordingDraft] = useState<CollegeCardCopy>(wording);
  const [savedWording, setSavedWording] = useState<CollegeCardCopy>(wording);

  const read = () =>
    loadBandColleges(band.slug).then((result) => {
      if ("error" in result) setLoadError(result.error);
      else {
        setLoadError(null);
        setData(result);
      }
      return result;
    });

  useEffect(() => {
    let alive = true;
    loadBandColleges(band.slug).then((result) => {
      if (!alive) return;
      if ("error" in result) setLoadError(result.error);
      else setData(result);
    });
    return () => {
      alive = false;
    };
  }, [band.slug]);

  /** Shows the change at once, saves it, and puts the old list back if the save fails. */
  const persist = (next: BandCollege[], success: string) => {
    if (!data) return;
    const previous = data;
    const everyone = new Map([...data.colleges, ...data.options].map((c) => [c.slug, c]));
    const nextSlugs = new Set(next.map((c) => c.slug));
    setData({
      ...data,
      colleges: next,
      options: [...everyone.values()].filter((c) => !nextSlugs.has(c.slug)).sort((a, b) => a.name.localeCompare(b.name)),
    });
    clearFlash();
    startTransition(async () => {
      const result = await saveBandColleges(band.slug, next.map((c) => c.slug));
      if ("error" in result) {
        setData(previous);
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        setChanged(true);
        showFlash("ok", success);
      }
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.colleges.length) return;
    const next = [...data.colleges];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next, `Moved ${data.colleges[index].name} ${direction < 0 ? "up" : "down"}. Order saved.`);
  };

  const openForm = (college: BandCollege | null) => {
    setEditing(college);
    setDraft(college ? toInput(college) : BLANK);
    setTab("college");
    clearFlash();
  };

  const set = <K extends keyof CollegeCardInput>(key: K, value: CollegeCardInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    clearFlash();
  };

  const states = Object.keys(geo).sort();
  const stateOptions = draft.state && !states.includes(draft.state) ? [draft.state, ...states] : states;
  const streamOptions = draft.stream && !streams.includes(draft.stream) ? [draft.stream, ...streams] : streams;
  const formOk = draft.name.trim().length >= 2 && draft.city.trim() !== "" && draft.state !== "" && draft.stream !== "";

  const saveCollege = () => {
    clearFlash();
    startTransition(async () => {
      if (editing) {
        const result = await updateBandCollege(editing.slug, draft);
        if ("error" in result) {
          showFlash("error", `Not saved: ${result.error}`);
          return;
        }
        await read();
        setChanged(true);
        showFlash("ok", `${draft.name.trim()} saved.`);
        setTab("colleges");
        return;
      }
      const created = await createBandCollege(draft);
      if ("error" in created) {
        showFlash("error", `Not added: ${created.error}`);
        return;
      }
      const slugs = [...(data?.colleges.map((c) => c.slug) ?? []), created.slug];
      const added = await saveBandColleges(band.slug, slugs);
      await read();
      setChanged(true);
      if ("error" in added) {
        showFlash("error", `${draft.name.trim()} was created, but could not be added to this band: ${added.error}`);
      } else {
        showFlash("ok", `${draft.name.trim()} was created and added to this band.`);
      }
      setTab("colleges");
    });
  };

  const wordingChanged =
    wordingDraft.buttonLabel !== savedWording.buttonLabel || wordingDraft.viewAllLabel !== savedWording.viewAllLabel;

  const saveWording = () => {
    clearFlash();
    startTransition(async () => {
      const result = await saveHomeCopy("collegeCard", { ...wordingDraft });
      if ("error" in result) {
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        setSavedWording(wordingDraft);
        setChanged(true);
        showFlash("ok", "Card wording saved for every college card.");
      }
    });
  };

  const members = data?.colleges ?? [];

  return (
    <AdminModal
      open
      onClose={() => onClose(changed ? `${band.heading}: colleges updated.` : undefined)}
      size="full"
      title={`Manage colleges: ${band.heading}`}
      description="The colleges in this homepage band, their photos and the words on their cards."
      footer={
        <button
          type="button"
          onClick={() => onClose(changed ? `${band.heading}: colleges updated.` : undefined)}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Done
        </button>
      }
    >
      <div role="tablist" aria-label="Manage colleges" className="-mt-1 mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`band-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`band-panel-${t.id}`}
              onClick={() => (t.id === "college" ? openForm(null) : setTab(t.id))}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
              {t.id === "wording" && wordingChanged && <span className="h-2 w-2 rounded-full bg-brand" title="Unsaved change" />}
            </button>
          );
        })}
      </div>

      <div className="mb-5">
        <StatusMessage flash={flash} />
      </div>

      {loadError && (
        <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load this band&apos;s colleges: {loadError}
        </p>
      )}

      {tab === "colleges" && (
        <div role="tabpanel" id="band-panel-colleges" aria-labelledby="band-tab-colleges" className="space-y-5">
          {!data && !loadError && <p className="text-sm text-ink-soft">Loading colleges…</p>}

          {data && (
            <>
              <p className="max-w-3xl text-sm text-ink-soft">
                {data.rankingBound
                  ? "This band follows a ranking list, so the order on the homepage comes from the ranking. The order below only settles colleges the ranking does not list."
                  : `The first ${band.limit} colleges, in this order, are shown on the homepage. Change how many cards show in the band's row.`}
              </p>

              <div className="flex max-w-2xl flex-wrap items-end gap-2">
                <div className="min-w-60 flex-1">
                  <label htmlFor="band-add-existing" className="block text-xs font-semibold text-ink">
                    Add an existing college
                  </label>
                  <select id="band-add-existing" value={pick} onChange={(e) => setPick(e.target.value)} className={input}>
                    <option value="">{data.options.length === 0 ? "Every college is already here" : "Choose a college"}</option>
                    {data.options.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!pick || pending}
                  onClick={() => {
                    const college = data.options.find((c) => c.slug === pick);
                    if (!college) return;
                    setPick("");
                    persist([...members, college], `${college.name} added to this band.`);
                  }}
                  className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40"
                >
                  Add to band
                </button>
                <button type="button" onClick={() => openForm(null)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                  Create a new college
                </button>
              </div>

              {members.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
                  No colleges in this band yet, so it will not show on the homepage. Add one above.
                </p>
              ) : (
                <ul className="space-y-2">
                  {members.map((c, i) => {
                    const hidden = !data.rankingBound && i >= band.limit;
                    return (
                      <li key={c.slug} className={`flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 ${hidden ? "opacity-70" : ""}`}>
                        <Thumb image={c.image} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {i + 1}. {c.name}
                          </span>
                          <span className="block truncate text-xs text-ink-soft">
                            {c.city}, {c.state} · {c.stream} · {c.ownership}
                            {c.feesRange ? ` · ${c.feesRange}` : ""}
                          </span>
                        </span>
                        {!c.image && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">No photo</span>}
                        {hidden && <span className="rounded-full bg-bg-alt px-2.5 py-1 text-xs text-ink-soft">Over the card limit, not shown</span>}
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label={`Move ${c.name} up`} disabled={i === 0 || pending} onClick={() => move(i, -1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                            Up
                          </button>
                          <button type="button" aria-label={`Move ${c.name} down`} disabled={i === members.length - 1 || pending} onClick={() => move(i, 1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                            Down
                          </button>
                          <button type="button" onClick={() => openForm(c)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => persist(members.filter((m) => m.slug !== c.slug), `${c.name} removed from this band. It is still in the college directory.`)}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {tab === "college" && (
        <div role="tabpanel" id="band-panel-college" aria-labelledby="band-tab-college" className="space-y-6">
          <p className="max-w-3xl text-sm text-ink-soft">
            {editing
              ? `Editing ${editing.name}.`
              : "A new college is created and added to the end of this band."}{" "}
            Courses, placements and reviews are on the college&apos;s full record under{" "}
            <Link href="/admin/colleges" className="font-medium text-brand hover:underline">
              Content → Colleges
            </Link>
            .
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label htmlFor="col-name" className="block text-xs font-semibold text-ink">
                Name <span className="text-brand">*</span>
              </label>
              <input id="col-name" maxLength={500} value={draft.name} onChange={(e) => set("name", e.target.value)} className={input} />
              <p className="mt-1 text-xs text-ink-faint">
                {editing ? "The page address stays the same after a rename." : "Becomes the page address."}
              </p>
            </div>
            <div>
              <label htmlFor="col-state" className="block text-xs font-semibold text-ink">
                State <span className="text-brand">*</span>
              </label>
              <select id="col-state" value={draft.state} onChange={(e) => set("state", e.target.value)} className={input}>
                <option value="">Select a state</option>
                {stateOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="col-city" className="block text-xs font-semibold text-ink">
                City <span className="text-brand">*</span>
              </label>
              <input id="col-city" maxLength={200} value={draft.city} onChange={(e) => set("city", e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="col-ownership" className="block text-xs font-semibold text-ink">
                Ownership
              </label>
              <select id="col-ownership" value={draft.ownership} onChange={(e) => set("ownership", e.target.value as CollegeCardInput["ownership"])} className={input}>
                <option value="Private">Private</option>
                <option value="Government">Government</option>
                <option value="Deemed">Deemed</option>
              </select>
            </div>
            <div>
              <label htmlFor="col-stream" className="block text-xs font-semibold text-ink">
                Stream <span className="text-brand">*</span>
              </label>
              <select id="col-stream" value={draft.stream} onChange={(e) => set("stream", e.target.value)} className={input}>
                <option value="">Select a stream</option>
                {streamOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-faint">Sets which stream page lists this college.</p>
            </div>
            <div>
              <label htmlFor="col-fees" className="block text-xs font-semibold text-ink">
                Fees range
              </label>
              <input id="col-fees" maxLength={100} value={draft.feesRange} onChange={(e) => set("feesRange", e.target.value)} className={input} />
              <p className="mt-1 text-xs text-ink-faint">Shown on the card until the college has courses with fees.</p>
            </div>
          </div>

          <ImageUploadField kind="college" value={draft.image} onChange={(v) => set("image", v)} fallbackNote="No photo. The card shows a plain background." />

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button type="button" onClick={saveCollege} disabled={!formOk || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
              {pending ? "Saving…" : editing ? "Save college" : "Create and add to band"}
            </button>
            <button type="button" onClick={() => setTab("colleges")} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">
              Back to the band
            </button>
            {!formOk && <span className="text-xs text-amber-800">A name, state, city and stream are needed.</span>}
          </div>
        </div>
      )}

      {tab === "wording" && (
        <div role="tabpanel" id="band-panel-wording" aria-labelledby="band-tab-wording" className="space-y-5">
          <p className="max-w-3xl rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            These words repeat on <strong>every</strong> college card in <strong>every</strong> band, not only this one.
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="cw-button" className="block text-xs font-semibold text-ink">
                Card button
              </label>
              <input id="cw-button" maxLength={30} value={wordingDraft.buttonLabel} onChange={(e) => setWordingDraft((w) => ({ ...w, buttonLabel: e.target.value }))} className={input} />
              <p className="mt-1 text-xs text-ink-faint">{wordingDraft.buttonLabel.length}/30</p>
            </div>
            <div>
              <label htmlFor="cw-viewall" className="block text-xs font-semibold text-ink">
                View all button under a band
              </label>
              <input id="cw-viewall" maxLength={30} value={wordingDraft.viewAllLabel} onChange={(e) => setWordingDraft((w) => ({ ...w, viewAllLabel: e.target.value }))} className={input} />
              <p className="mt-1 text-xs text-ink-faint">{wordingDraft.viewAllLabel.length}/30</p>
            </div>
          </div>
          <button
            type="button"
            onClick={saveWording}
            disabled={!wordingChanged || pending || !wordingDraft.buttonLabel.trim() || !wordingDraft.viewAllLabel.trim()}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save wording"}
          </button>
        </div>
      )}
    </AdminModal>
  );
}
