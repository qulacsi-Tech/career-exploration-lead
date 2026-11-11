import type { Metadata } from "next";
import Link from "next/link";
import { getMySavedColleges } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";
import { SavedColleges } from "@/components/account/saved-colleges";

export const metadata: Metadata = {
  title: "Saved institutes — TopCollegePath",
  robots: { index: false, follow: false },
};

/** The colleges the student saved from a college page, newest first, with a way to remove each. */
export default async function SavedPage() {
  const token = await getUserToken();
  const items = token ? await getMySavedColleges(token).catch(() => null) : [];

  if (items === null) {
    return <p className="text-sm text-red-700">We could not load your saved institutes just now. Please refresh in a moment.</p>;
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="font-display text-lg font-bold text-ink">No saved institutes yet</p>
        <p className="mt-1 text-sm text-ink-soft">Press Save on a college&apos;s page and it will be kept here for you.</p>
        <Link href="/colleges" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">Browse colleges</Link>
      </div>
    );
  }
  return <SavedColleges items={items} />;
}
