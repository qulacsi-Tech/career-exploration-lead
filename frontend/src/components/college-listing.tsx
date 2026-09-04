import Link from "next/link";
import type { ReactNode } from "react";
import type { College } from "@/lib/mock-data";
import { CollegeCard } from "@/components/college-card";
import { Breadcrumbs } from "@/components/breadcrumbs";

/**
 * The shell shared by the filtered college listings — a city page, a stream
 * page, and anything else that is "these colleges, under this heading".
 *
 * Written once because the three would otherwise be the same 120 lines of
 * header, count, empty state and sidebar with one filter swapped, and would
 * drift apart the first time any of them was touched. The pages supply what is
 * genuinely different: the copy, the breadcrumb trail, and the set of colleges.
 */
export function CollegeListing({
  breadcrumbs,
  title,
  subtitle,
  intro,
  colleges,
  emptyMessage,
  sidebar,
}: {
  breadcrumbs: { label: string; href?: string }[];
  title: string;
  subtitle: string;
  intro?: string;
  colleges: College[];
  emptyMessage: string;
  sidebar?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        </div>
        <Link
          href="/enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Free Counselling
        </Link>
      </div>

      {intro && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-soft">{intro}</p>}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {colleges.length > 0 ? (
            <div className="space-y-4">
              {colleges.map((college) => (
                <CollegeCard key={college.slug} college={college} />
              ))}
            </div>
          ) : (
            /* An honest empty state rather than a zero-result page that looks
               broken — the directory is still small, and saying so is better
               than implying no such college exists. */
            <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-6 py-12 text-center">
              <p className="text-sm text-ink-soft">{emptyMessage}</p>
              <Link
                href="/colleges"
                className="mt-4 inline-block rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
              >
                Browse all colleges
              </Link>
            </div>
          )}
        </div>

        {sidebar && <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">{sidebar}</aside>}
      </div>
    </div>
  );
}

/** The counselling card most listings carry. */
export function CounsellingCard({ context }: { context: string }) {
  return (
    <div className="rounded-2xl border border-brand/30 bg-brand-soft p-5">
      <p className="font-display font-semibold text-brand-ink">Talk to a counsellor</p>
      <p className="mt-1 text-xs text-brand-ink/80">
        Free guidance on {context} — fees, cutoffs and which colleges to target.
      </p>
      <Link
        href="/enquiry"
        className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Request a Callback
      </Link>
    </div>
  );
}

/** A simple linked list for the listing sidebars. */
export function SidebarLinks({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string; meta?: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="font-display font-semibold text-ink">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.href} className="flex items-center justify-between gap-3">
            <Link href={item.href} className="min-w-0 truncate text-ink-soft hover:text-brand">
              {item.label}
            </Link>
            {item.meta && <span className="shrink-0 text-xs text-ink-faint">{item.meta}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
