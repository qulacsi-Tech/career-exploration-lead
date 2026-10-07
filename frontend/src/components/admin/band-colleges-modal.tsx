"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { loadBandColleges, saveBandColleges, saveBandWords, saveHomeCopy } from "@/lib/admin-actions";
import type { AdminHomepageBand, BandCollege, BandColleges } from "@/lib/api";
import type { CollegeCardCopy } from "@/lib/home-copy";
import { mediaUrl } from "@/lib/media";
import { AdminModal } from "@/components/admin/admin-modal";
import { CollegeMultiPicker } from "@/components/admin/college-multi-picker";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  Manage colleges: one homepage band, in three tabs.

    Heading & text the row's heading and the line under it
    Colleges       who is in the band and in what order; pick several existing colleges
    Card wording   the fixed words on every college card (shared by all bands)

  Creating or editing a college itself (details, photo, courses) is on its own screen,
  Content -> Colleges, which the "Add / edit colleges" buttons open.

  Adding, removing and reordering save the moment you click, as on the other
  homepage screens.   Courses, placements and reviews live on the college's full record under Content.

  A college removed here only leaves the band. It stays in the directory.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

type TabId = "words" | "colleges" | "wording";

const TABS: { id: TabId; label: string }[] = [
  { id: "words", label: "Heading & text" },
  { id: "colleges", label: "Colleges" },
  { id: "wording", label: "Card wording" },
];

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
  streams,
  wording,
  onClose,
}: {
  band: AdminHomepageBand;
  /** Stream names the stream pages know, for the stream dropdown. */
  streams: string[];
  wording: CollegeCardCopy;
  /** `message` is set when anything was changed, so the page can say so and refresh. */
  onClose: (message?: string) => void;
}) {
  const [tab, setTab] = useState<TabId>("colleges");
  const [headingDraft, setHeadingDraft] = useState(band.heading);
  const [subDraft, setSubDraft] = useState(band.subheading ?? "");
  const [savedWords, setSavedWords] = useState({ heading: band.heading, sub: band.subheading ?? "" });
  const [data, setData] = useState<BandColleges | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  const [changed, setChanged] = useState(false);

  const [picked, setPicked] = useState<string[]>([]);
  // The category whose colleges are being added in the "Add another category" panel.
  const [addCategory, setAddCategory] = useState("");
  const [wordingDraft, setWordingDraft] = useState<CollegeCardCopy>(wording);
  const [savedWording, setSavedWording] = useState<CollegeCardCopy>(wording);

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

  /** Moves a college up or down among the colleges of its own category. */
  const moveInCategory = (slug: string, direction: -1 | 1) => {
    if (!data) return;
    const at = data.colleges.findIndex((c) => c.slug === slug);
    if (at < 0) return;
    const category = data.colleges[at].stream;
    let to = at + direction;
    while (to >= 0 && to < data.colleges.length && data.colleges[to].stream !== category) to += direction;
    if (to < 0 || to >= data.colleges.length) return;
    const next = [...data.colleges];
    [next[at], next[to]] = [next[to], next[at]];
    persist(next, `Moved ${data.colleges[at].name} ${direction < 0 ? "up" : "down"}. Order saved.`);
  };

  const wordsChanged = headingDraft !== savedWords.heading || subDraft !== savedWords.sub;
  const saveWords = () => {
    clearFlash();
    startTransition(async () => {
      const result = await saveBandWords(band.slug, headingDraft.trim(), subDraft.trim());
      if ("error" in result) {
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        setSavedWords({ heading: headingDraft.trim(), sub: subDraft.trim() });
        setHeadingDraft(headingDraft.trim());
        setSubDraft(subDraft.trim());
        setChanged(true);
        showFlash("ok", "Heading and text saved.");
      }
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
  // Every category a college can be added under: the Fields list, plus any a college already has.
  const categoriesToAdd = [...new Set([...streams, ...(data ? [...data.colleges, ...data.options].map((c) => c.stream) : [])])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const optionsInCategory = data ? data.options.filter((c) => c.stream === addCategory) : [];

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
              onClick={() => setTab(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
              {((t.id === "wording" && wordingChanged) || (t.id === "words" && wordsChanged)) && <span className="h-2 w-2 rounded-full bg-brand" title="Unsaved change" />}
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

      {tab === "words" && (
        <div role="tabpanel" id="band-panel-words" aria-labelledby="band-tab-words" className="max-w-2xl space-y-5">
          <p className="text-sm text-ink-soft">The words above this row&apos;s cards on the homepage.</p>
          <div>
            <label htmlFor="bw-heading" className="block text-xs font-semibold text-ink">
              Heading <span className="text-brand">*</span>
            </label>
            <input id="bw-heading" maxLength={200} value={headingDraft} onChange={(e) => setHeadingDraft(e.target.value)} className={input} />
            <p className="mt-1 text-xs text-ink-faint">{headingDraft.length}/200</p>
          </div>
          <div>
            <label htmlFor="bw-sub" className="block text-xs font-semibold text-ink">
              Line under the heading
            </label>
            <textarea id="bw-sub" rows={3} maxLength={300} value={subDraft} onChange={(e) => setSubDraft(e.target.value)} className={input} />
            <p className="mt-1 text-xs text-ink-faint">Optional. {subDraft.length}/300</p>
          </div>
          <button type="button" onClick={saveWords} disabled={!wordsChanged || pending || !headingDraft.trim()} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {pending ? "Saving…" : "Save heading and text"}
          </button>
        </div>
      )}

      {tab === "colleges" && (
        <div role="tabpanel" id="band-panel-colleges" aria-labelledby="band-tab-colleges" className="space-y-5">
          {!data && !loadError && <p className="text-sm text-ink-soft">Loading colleges…</p>}

          {data && (
            <>
              <p className="max-w-3xl text-sm text-ink-soft">
                {data.rankingBound
                  ? "This band follows a ranking list, so the order on the homepage comes from the ranking. The order below only settles colleges the ranking does not list."
                  : `Each category is a tab on the homepage. A category with more than three colleges slides, and loads ${band.limit} at a time from the server. Change that number in the section's row.`}
              </p>

              {/* The section's colleges, grouped by category: each category is a tab on the homepage. */}
              {members.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
                  No colleges in this section yet, so it will not show on the homepage. Add a category below.
                </p>
              ) : (
                <div className="space-y-6">
                  {[...new Set(members.map((m) => m.stream))].map((category) => {
                    const group = members.filter((m) => m.stream === category);
                    return (
                      <section key={category || "none"} aria-label={`${category || "No category"} colleges`}>
                        <h3 className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-ink">
                          {category || "No category"}
                          <span className="text-xs font-normal text-ink-soft">
                            {group.length} college{group.length === 1 ? "" : "s"} · a tab on the homepage
                          </span>
                        </h3>
                        <ul className="mt-2 space-y-2">
                          {group.map((c, i) => (
                            <li key={c.slug} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
                              <Thumb image={c.image} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-ink">
                                  {i + 1}. {c.name}
                                </span>
                                <span className="block truncate text-xs text-ink-soft">
                                  {c.city}, {c.state} · {c.ownership}
                                  {c.feesRange ? ` · ${c.feesRange}` : ""}
                                </span>
                              </span>
                              {!c.image && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">No photo</span>}
                              <div className="flex items-center gap-2">
                                <button type="button" aria-label={`Move ${c.name} up`} disabled={i === 0 || pending} onClick={() => moveInCategory(c.slug, -1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                                  Up
                                </button>
                                <button type="button" aria-label={`Move ${c.name} down`} disabled={i === group.length - 1 || pending} onClick={() => moveInCategory(c.slug, 1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                                  Down
                                </button>
                                <Link href="/admin/colleges" className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => persist(members.filter((m) => m.slug !== c.slug), `${c.name} removed from this section. It is still in the college directory.`)}
                                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700 disabled:opacity-40"
                                >
                                  Remove
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {group.length > 3 && (
                          <p className="mt-2 text-xs text-ink-faint">
                            More than three, so this category slides on the homepage, {band.limit} at a time loaded from the server as visitors slide.
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}

              {/* Another category goes into this same section, not into a new row. */}
              <section className="space-y-3 rounded-xl border border-line bg-bg-alt p-4" aria-label="Add colleges">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">Add another category</h3>
                  <Link href="/admin/colleges" className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-brand">
                    Add / edit colleges
                  </Link>
                </div>
                <div className="max-w-xs">
                  <label htmlFor="band-add-category" className="block text-xs font-semibold text-ink">
                    Category
                  </label>
                  <select
                    id="band-add-category"
                    value={addCategory}
                    onChange={(e) => {
                      setAddCategory(e.target.value);
                      setPicked([]);
                    }}
                    className={input}
                  >
                    <option value="">Choose a category</option>
                    {categoriesToAdd.map((category) => (
                      <option key={category} value={category}>
                        {category}
                        {members.some((m) => m.stream === category) ? " (already in this section)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {addCategory &&
                  (optionsInCategory.length === 0 ? (
                    <p className="text-sm text-ink-soft">Every {addCategory} college is already in this section.</p>
                  ) : (
                    <>
                      <CollegeMultiPicker
                        key={addCategory}
                        idPrefix="band-add"
                        hideType
                        colleges={optionsInCategory}
                        streams={[addCategory]}
                        selected={picked}
                        onChange={setPicked}
                      />
                      <button
                        type="button"
                        disabled={picked.length === 0 || pending}
                        onClick={() => {
                          const chosen = picked
                            .map((slug) => data.options.find((c) => c.slug === slug))
                            .filter((c): c is BandCollege => !!c);
                          setPicked([]);
                          persist([...members, ...chosen], `${chosen.length} ${addCategory} college${chosen.length === 1 ? "" : "s"} added to this section.`);
                        }}
                        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
                      >
                        {picked.length > 0 ? `Add ${picked.length} selected` : "Add selected"}
                      </button>
                    </>
                  ))}
              </section>
            </>
          )}
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
