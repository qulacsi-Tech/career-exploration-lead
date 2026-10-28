"use client";

import { useMemo, useState, useTransition } from "react";
import { setOnlineOfferingEnabled } from "@/lib/admin-actions";
import type { OnlineOffering } from "@/lib/api";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/**
 * Every programme a college has marked "also offered online" (on its Courses & Fees tab), with the online
 * duration and fees it entered. Nothing is added or edited here: this is where an offering is switched on
 * or off for the site. Off keeps it on the college record and hides it from the public pages.
 */
export function OnlineOfferingsAdmin({ offerings }: { offerings: OnlineOffering[] }) {
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [flash, showFlash] = useFlash();

  const isOn = (o: OnlineOffering) => enabled[o.id] ?? o.enabled;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? offerings.filter((o) => [o.college, o.course, o.specialisation].some((f) => f.toLowerCase().includes(q))) : offerings;
  }, [offerings, query]);

  const toggle = (o: OnlineOffering) => {
    const next = !isOn(o);
    setPendingId(o.id);
    startTransition(async () => {
      const result = await setOnlineOfferingEnabled(o.id, next);
      setPendingId(null);
      if ("error" in result) return showFlash("error", result.error);
      setEnabled((prev) => ({ ...prev, [o.id]: next }));
      showFlash("ok", `${o.course}${o.specialisation ? ` · ${o.specialisation}` : ""} at ${o.college} is ${next ? "shown on the site" : "hidden from the site"}.`);
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Online Programmes"
        description="The online courses colleges have entered on their Courses & Fees tab. Switch one off to hide it from the site; to add or change one, edit the college."
      />
      <StatusMessage flash={flash} floating />
      <AdminSection
        title="All online programmes"
        description={`${shown.length} of ${offerings.length} shown`}
        actions={
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search college or programme"
            aria-label="Search online programmes"
            className="w-64 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        }
      >
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                <th scope="col" className="py-2 pr-3 font-semibold">Programme</th>
                <th scope="col" className="py-2 pr-3 font-semibold">College</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Online duration</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Online fees</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">On the site</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className="border-b border-line-soft last:border-b-0">
                  <td className="py-3 pr-3 font-medium text-ink">
                    {o.course}
                    {o.specialisation && <span className="font-normal text-ink-soft"> · {o.specialisation}</span>}
                  </td>
                  <td className="py-3 pr-3 text-ink-soft">{o.college}</td>
                  <td className="py-3 pr-3 text-ink-soft">{o.duration || "—"}</td>
                  <td className="py-3 pr-3 text-ink-soft">{o.fees || "—"}</td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn(o)}
                      aria-label={`${o.course} at ${o.college}: ${isOn(o) ? "shown" : "hidden"}`}
                      disabled={pendingId === o.id}
                      onClick={() => toggle(o)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${isOn(o) ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-line bg-bg-alt text-ink-soft"}`}
                    >
                      <span aria-hidden className={`h-2 w-2 rounded-full ${isOn(o) ? "bg-emerald-600" : "bg-ink-faint"}`} />
                      {isOn(o) ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-ink-soft">
                    {offerings.length === 0
                      ? "No college has an online programme yet. Tick “Also offered online” on a course in a college’s Courses & Fees tab."
                      : `No online programmes match “${query}”.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </div>
  );
}
