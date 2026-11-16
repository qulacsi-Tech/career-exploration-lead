"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark, MapPin, Star } from "lucide-react";
import type { SavedCollegeItem } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { setCollegeSaved } from "@/lib/saved-actions";
import { formatFull } from "@/lib/lead-labels";
import { collegeKey } from "@/lib/entity-url";

/** The student's saved institutes. Each card opens the college; the bookmark takes it off the list. */
export function SavedColleges({ items }: { items: SavedCollegeItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const remove = (slug: string) =>
    start(async () => {
      setError("");
      const result = await setCollegeSaved(slug, false);
      if (!result.ok) return setError(result.message ?? "We could not remove it. Please try again.");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((c) => (
          <li key={c.slug} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
            <Link href={`/college/${collegeKey(c)}`} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-bg-alt">
              {c.image && <Image src={mediaUrl(c.image)} alt="" fill sizes="96px" className="object-cover" />}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/college/${collegeKey(c)}`} className="block truncate font-display text-base font-bold text-ink hover:text-brand">{c.name}</Link>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{[c.city, c.state].filter(Boolean).join(", ") || "Location not set"}</span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                {c.stream && <span className="rounded-full bg-bg-alt px-2 py-0.5 font-semibold">{c.stream}</span>}
                {c.rating > 0 && (
                  <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />{c.rating.toFixed(1)}</span>
                )}
              </div>
              {c.savedAt && <p className="mt-1 text-[11px] text-ink-faint">Saved {formatFull(c.savedAt)}</p>}
            </div>
            <button
              type="button"
              onClick={() => remove(c.slug)}
              disabled={pending}
              aria-label={`Remove ${c.name} from saved institutes`}
              title="Remove from saved"
              className="h-fit shrink-0 rounded-lg border border-brand p-2 text-brand transition hover:bg-brand-soft disabled:opacity-50"
            >
              <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
