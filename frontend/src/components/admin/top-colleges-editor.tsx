"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveHomepageBands } from "@/lib/admin-actions";
import type { AdminHomepage, AdminHomepageAvailable, AdminHomepageBand, IndiaGeo, LocationPicker } from "@/lib/api";
import type { CollegeCardCopy } from "@/lib/home-copy";
import { AdminSection } from "@/components/admin/admin-section";
import { BandCreateModal } from "@/components/admin/band-create-modal";
import { BandCollegesModal } from "@/components/admin/band-colleges-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  The Top Colleges section of the homepage.

  There is one section. It holds colleges of several categories (Management, Engineering,
  Medical and so on) and the homepage shows a tab per category, so another category is added
  inside the section with Manage colleges, not as a new row. Once the section exists, Add a
  college row is switched off.

  A band is a collection: a group of colleges with its own heading and page. This
  list decides which bands show, in what order and how many cards each one holds,
  and every click saves at once. The colleges inside a band, their photos and the
  words on their cards are in Manage colleges. The band's heading, rules and page
  are edited under Content → Collections.
*/

const MAX_CARDS = 24;

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function TopCollegesEditor({
  data,
  streams,
  wording,
  picker,
}: {
  data: AdminHomepage;
  geo: IndiaGeo;
  streams: string[];
  wording: CollegeCardCopy;
  /** Every college with its type, for the Add a college row form. */
  picker: LocationPicker;
}) {
  const router = useRouter();
  const [bands, setBands] = useState<AdminHomepageBand[]>(data.bands);
  const [available, setAvailable] = useState<AdminHomepageAvailable[]>(data.available);
  const [seen, setSeen] = useState(data);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  const [managing, setManaging] = useState<AdminHomepageBand | null>(null);
  const [adding, setAdding] = useState("");
  const [creating, setCreating] = useState(false);

  // The page re-rendered with fresh data (after a save or the dialog closing).
  if (data !== seen) {
    setSeen(data);
    setBands(data.bands);
    setAvailable(data.available);
  }

  /** Shows the change at once, saves it, and puts the old lists back if the save fails. */
  const persist = (next: AdminHomepageBand[], nextAvailable: AdminHomepageAvailable[], success: string) => {
    const previous = { bands, available };
    setBands(next);
    setAvailable(nextAvailable);
    clearFlash();
    startTransition(async () => {
      const result = await saveHomepageBands(next.map((b) => ({ slug: b.slug, limit: b.limit, isVisible: b.isVisible })));
      if ("error" in result) {
        setBands(previous.bands);
        setAvailable(previous.available);
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        showFlash("ok", success);
        // The preview is resolved on the server, so re-read it rather than keep a local guess.
        router.refresh();
      }
    });
  };

  const patch = (slug: string, changes: Partial<Pick<AdminHomepageBand, "limit" | "isVisible">>, success: string) =>
    persist(bands.map((b) => (b.slug === slug ? { ...b, ...changes } : b)), available, success);

  const remove = (band: AdminHomepageBand) =>
    persist(
      bands.filter((b) => b.slug !== band.slug),
      [...available, { slug: band.slug, title: band.title, isPublished: band.isPublished }].sort((a, b) => a.title.localeCompare(b.title)),
      `${band.heading} was taken off the homepage.`
    );

  const add = (slug: string) => {
    const candidate = available.find((a) => a.slug === slug);
    if (!candidate) return;
    setAdding("");
    persist(
      [
        ...bands,
        {
          slug: candidate.slug,
          title: candidate.title,
          heading: candidate.title,
          isPublished: candidate.isPublished,
          isVisible: true,
          limit: 6,
          order: bands.length,
          total: 0,
          preview: [],
        },
      ],
      available.filter((a) => a.slug !== slug),
      `${candidate.title} was added to the homepage.`
    );
  };

  const shown = bands.filter((b) => b.isVisible).length;

  return (
    <AdminSection
      title="Top colleges"
      description="The homepage college section. Its categories show as tabs. Use Manage colleges to add colleges, and other categories, to it."
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-soft">
          Headings, rules and the collection page are edited under{" "}
          <Link href="/admin/collections" className="font-medium text-brand hover:underline">
            Content → Collections
          </Link>
          .
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusMessage flash={flash} />
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={bands.length >= 1}
            title={bands.length >= 1 ? "The homepage has one college section. Add other categories to it with Manage colleges." : undefined}
            className="ml-auto rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add a college row
          </button>
        </div>

        {bands.length >= 1 && (
          <p role="status" className="rounded-lg border border-line bg-bg-alt px-4 py-3 text-sm text-ink-soft">
            The homepage has one college section. To show another category, use <strong className="text-ink">Manage colleges</strong> and add that category&apos;s colleges here.
          </p>
        )}

        {bands.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            No college rows on the homepage yet. Use Add a college row to make one.
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">
              {shown} of {bands.length} shown on the homepage
            </p>
            <ul className="space-y-3">
              {bands.map((band, index) => (
                <li key={band.slug} className={`rounded-xl border border-line bg-surface p-4 ${band.isVisible ? "" : "opacity-75"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Show ${band.heading} on the homepage`}
                        checked={band.isVisible}
                        disabled={pending}
                        onChange={(e) =>
                          patch(
                            band.slug,
                            { isVisible: e.target.checked },
                            e.target.checked ? `${band.heading} is now shown on the homepage.` : `${band.heading} is now hidden from the homepage.`
                          )
                        }
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-display font-semibold text-ink">{band.heading}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {band.total} college{band.total === 1 ? "" : "s"}
                          {!band.isPublished && <span className="ml-2 text-red-700">Draft: will not show until published</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                        Cards per page
                        <select
                          value={band.limit}
                          disabled={pending}
                          onChange={(e) => patch(band.slug, { limit: Number(e.target.value) }, `${band.heading} now shows up to ${e.target.value} cards.`)}
                          className="rounded-lg border border-line bg-bg px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
                        >
                          {Array.from({ length: MAX_CARDS }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button type="button" aria-label={`Move ${band.heading} up`} disabled={index === 0 || pending} onClick={() => persist(move(bands, index, -1), available, `Moved ${band.heading} up. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                        Up
                      </button>
                      <button type="button" aria-label={`Move ${band.heading} down`} disabled={index === bands.length - 1 || pending} onClick={() => persist(move(bands, index, 1), available, `Moved ${band.heading} down. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                        Down
                      </button>
                      <button type="button" onClick={() => setManaging(band)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                        Manage colleges
                      </button>
                      <button type="button" disabled={pending} onClick={() => remove(band)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700 disabled:opacity-40">
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-line-soft pt-3">
                    {band.preview.length > 0 ? (
                      <div className="space-y-2">
                        {[...new Set(band.preview.map((c) => c.stream))].map((category) => {
                          const inCategory = band.preview.filter((c) => c.stream === category);
                          return (
                            <div key={category || "none"} className="flex flex-wrap items-center gap-2">
                              <span className="w-28 shrink-0 text-xs font-semibold text-ink">
                                {category || "No category"} <span className="font-normal text-ink-faint">({inCategory.length})</span>
                              </span>
                              <ol className="flex flex-wrap gap-2">
                                {inCategory.slice(0, band.limit).map((college, position) => (
                                  <li key={college.slug} className="rounded-lg border border-line bg-bg-alt px-2.5 py-1 text-xs text-ink-soft">
                                    {position + 1}. {college.name}
                                  </li>
                                ))}
                                {inCategory.length > band.limit && (
                                  <li className="px-1 py-1 text-xs text-ink-faint">+{inCategory.length - band.limit} load as visitors slide</li>
                                )}
                              </ol>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-brand">Empty: this section will not render on the homepage. Use Manage colleges to add some.</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {bands.length === 0 && available.length > 0 && (
          <div className="flex max-w-xl flex-wrap items-end gap-2">
            <div className="min-w-60 flex-1">
              <label htmlFor="add-homepage-collection" className="block text-xs font-semibold text-ink">
                Use an existing collection as the homepage section
              </label>
              <select
                id="add-homepage-collection"
                value={adding}
                onChange={(e) => setAdding(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              >
                <option value="">Choose a collection</option>
                {available.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.title}
                    {a.isPublished ? "" : " (draft)"}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" disabled={!adding || pending} onClick={() => add(adding)} className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40">
              Add
            </button>
          </div>
        )}
      </div>

      {creating && (
        <BandCreateModal
          picker={picker}
          onClose={(message) => {
            setCreating(false);
            if (message) {
              showFlash("ok", message);
              router.refresh();
            }
          }}
        />
      )}

      {/* Mounted only while open, so every opening starts fresh. */}
      {managing && (
        <BandCollegesModal
          key={managing.slug}
          band={managing}
          streams={streams}
          wording={wording}
          onClose={(message) => {
            setManaging(null);
            if (message) showFlash("ok", message);
            router.refresh();
          }}
        />
      )}
    </AdminSection>
  );
}
