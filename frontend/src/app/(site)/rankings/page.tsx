import type { Metadata } from "next";
import Link from "next/link";
import { getRankings, type RankingList } from "@/lib/api";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Trophy, ArrowRight } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "College Rankings: NIRF & National Authority Lists",
  description:
    "Explore authoritative higher education rankings across India. Compare institutions by their standing in NIRF and other national ranking lists.",
};

export default async function RankingsPage() {
  const lists = await getRankings().catch(() => [] as RankingList[]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Rankings" }]} />

      <header className="mt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          <Trophy className="h-3.5 w-3.5" />
          <span>Official Standing</span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          College Rankings & Scorecards
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft sm:text-base">
          Accurate, verified rankings compiled from national assessment frameworks and institutional bodies. Compare
          participating colleges and their verified scores.
        </p>
      </header>

      {lists.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-line bg-surface p-8 text-center text-ink-soft">
          No ranking lists published at the moment. Please check back shortly.
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {lists.map((list) => (
            <section
              key={list.slug}
              id={list.slug}
              className="scroll-mt-24 rounded-2xl border border-line bg-surface p-6 shadow-sm"
            >
              <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">{list.name}</h2>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Authority: <span className="font-semibold text-ink">{list.authority}</span> &middot; Year:{" "}
                    <span className="font-semibold text-ink">{list.year}</span>
                    {list.stream ? ` · Stream: ${list.stream}` : ""}
                  </p>
                </div>
                <div className="text-xs font-medium text-ink-faint">
                  {list.entries.length} {list.entries.length === 1 ? "college" : "colleges"} ranked
                </div>
              </div>

              {list.entries.length === 0 ? (
                <p className="mt-4 text-sm text-ink-soft">No colleges ranked in this list yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-line-soft text-xs text-ink-faint">
                        <th className="py-2.5 pr-4 font-semibold">Rank</th>
                        <th className="py-2.5 pr-4 font-semibold">College</th>
                        {list.entries.some((e) => e.score) && <th className="py-2.5 pr-4 font-semibold">Score</th>}
                        <th className="py-2.5 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-soft">
                      {list.entries.map((entry) => {
                        const collegeName = entry.collegeSlug
                          .split("-")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ");

                        return (
                          <tr key={entry.collegeSlug} className="hover:bg-bg-alt/50 transition-colors">
                            <td className="py-3 pr-4 font-bold text-brand tabular-nums">#{entry.rank}</td>
                            <td className="py-3 pr-4 font-medium text-ink">
                              <Link href={`/college/${entry.collegeSlug}`} className="hover:text-brand transition-colors">
                                {collegeName}
                              </Link>
                            </td>
                            {list.entries.some((e) => e.score) && (
                              <td className="py-3 pr-4 font-mono text-xs text-ink-soft">{entry.score ?? "—"}</td>
                            )}
                            <td className="py-3 text-right">
                              <Link
                                href={`/college/${entry.collegeSlug}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                              >
                                View College
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
