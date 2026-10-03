"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveHomepageBands } from "@/lib/admin-actions";
import type { AdminHomepage, AdminHomepageAvailable, AdminHomepageBand } from "@/lib/api";

const MAX_CARDS = 24;

/**
 * The homepage's college bands: which collections appear, in what order, at how
 * many cards, and whether each is shown. Edits are held here and saved together,
 * so the homepage is never left half-updated. The order and placement live on each
 * collection, so this screen and the collection editor always agree.
 */
export function HomepageCollectionsPicker({ data }: { data: AdminHomepage }) {
  const router = useRouter();
  const [bands, setBands] = useState<AdminHomepageBand[]>(data.bands);
  const [available, setAvailable] = useState<AdminHomepageAvailable[]>(data.available);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  const change = (next: AdminHomepageBand[], nextAvailable = available) => {
    setBands(next);
    setAvailable(nextAvailable);
    setDirty(true);
    setMessage(null);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= bands.length) return;
    const next = [...bands];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  };

  const patch = (index: number, changes: Partial<Pick<AdminHomepageBand, "limit" | "isVisible">>) =>
    change(bands.map((b, i) => (i === index ? { ...b, ...changes } : b)));

  const remove = (index: number) => {
    const band = bands[index];
    change(
      bands.filter((_, i) => i !== index),
      [...available, { slug: band.slug, title: band.title, isPublished: band.isPublished }].sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
    );
  };

  const add = (slug: string) => {
    const candidate = available.find((a) => a.slug === slug);
    if (!candidate) return;
    change(
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
    );
  };

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveHomepageBands(
        bands.map((b) => ({ slug: b.slug, limit: b.limit, isVisible: b.isVisible })),
      );
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setDirty(false);
        setMessage({ kind: "ok", text: "Saved. The homepage now shows these bands." });
        // The preview is resolved on the server, so re-read it rather than keep a local guess.
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-soft">
        Each band shows one collection, top to bottom in this order. Headings, colleges and search copy are edited on the
        collection, under{" "}
        <Link href="/admin/collections" className="font-medium text-brand hover:underline">
          Content → Collections
        </Link>
        .
      </p>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${message.kind === "error" ? "border border-red-200 bg-red-50 text-red-700" : "border border-line bg-bg-alt text-ink-soft"}`}>
          {message.text}
        </p>
      )}

      <div className="space-y-3">
        {bands.map((band, index) => (
          <div key={band.slug} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${band.title} up`} className="text-xs text-ink-faint transition hover:text-brand disabled:opacity-30">▲</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === bands.length - 1} aria-label={`Move ${band.title} down`} className="text-xs text-ink-faint transition hover:text-brand disabled:opacity-30">▼</button>
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink">{band.heading}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {band.total} college{band.total === 1 ? "" : "s"}
                    {!band.isPublished && <span className="ml-2 text-red-700">Draft: will not show until published</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-medium text-ink">
                  <input type="checkbox" checked={band.isVisible} onChange={(e) => patch(index, { isVisible: e.target.checked })} className="h-4 w-4 accent-brand" />
                  Show
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  Cards
                  <input
                    type="number"
                    min={1}
                    max={MAX_CARDS}
                    value={band.limit}
                    onChange={(e) => patch(index, { limit: Math.min(MAX_CARDS, Math.max(1, Number(e.target.value) || 1)) })}
                    className="w-16 rounded-lg border border-line bg-bg px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
                  />
                </label>
                <Link href="/admin/collections" className="text-xs font-medium text-brand hover:underline">Edit</Link>
                <button type="button" onClick={() => remove(index)} className="text-xs font-medium text-ink-faint hover:text-brand">Remove</button>
              </div>
            </div>
            <div className="mt-3 border-t border-line-soft pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                Preview (as of last save)
              </p>
              {band.preview.length > 0 ? (
                <ol className="mt-2 flex flex-wrap gap-2">
                  {band.preview.slice(0, band.limit).map((college, position) => (
                    <li key={college.slug} className="rounded-lg border border-line bg-bg-alt px-2.5 py-1 text-xs text-ink-soft">
                      {position + 1}. {college.name}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-xs text-brand">Empty: this band will not render on the homepage.</p>
              )}
            </div>
          </div>
        ))}
        {bands.length === 0 && (
          <p className="rounded-lg border border-dashed border-line bg-bg-alt px-4 py-8 text-center text-sm text-ink-soft">
            No collections on the homepage yet.
          </p>
        )}
      </div>

      {available.length > 0 && (
        <div>
          <label htmlFor="add-homepage-collection" className="block text-xs font-semibold text-ink">
            Add a collection to the homepage
          </label>
          <select
            id="add-homepage-collection"
            value=""
            onChange={(e) => e.target.value && add(e.target.value)}
            className="mt-1.5 w-full max-w-sm rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Choose a collection…</option>
            {available.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.title}{a.isPublished ? "" : " (draft)"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-line-soft pt-4">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save homepage bands"}
        </button>
        {dirty && !pending && <span className="text-xs text-ink-soft">Unsaved changes</span>}
        <span className="text-xs text-ink-faint">Max {MAX_CARDS} cards per band</span>
      </div>
    </div>
  );
}
