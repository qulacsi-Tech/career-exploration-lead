"use client";

import { useState } from "react";
import type { CollegePools, CollegeRecord } from "@/lib/api";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RangeField } from "@/components/admin/range-field";
import { CategoryTicks } from "@/components/admin/college-editor/course-picker";
import { Card, ChipInput, Labelled, NumberInput, SelectInput, TextArea, TextInput, inputCls } from "@/components/admin/college-editor/shared";
import { TAG_MAX_CHARS, YEAR_MIN } from "@/lib/college-rules";
import { ShareLeadsModal } from "@/components/admin/share-leads-modal";

export type EditorProps = {
  record: CollegeRecord;
  /** Applies a change to the record, in one place for every tab. */
  update: (change: (r: CollegeRecord) => CollegeRecord) => void;
  pools: CollegePools;
  slug: string;
  /** "full" is the platform admin; a college admin edits through requests and has no access to the articles list. */
  mode?: "full" | "readonly" | "submit";
};

const YEAR = new Date().getFullYear();

const BADGES = [
  { key: "isFeatured", label: "Featured", hint: "Hand-picked by the team." },
  { key: "isTopRated", label: "Top rated", hint: "Students rate it among the best." },
  { key: "isMostViewed", label: "Most viewed", hint: "A page many visitors open." },
] as const;

/** College Info: who the college is, what the masthead shows, and its photos. */
export function InfoTab({ record, update, pools, slug, mode = "full" }: EditorProps) {
  const set = <K extends keyof CollegeRecord>(key: K, value: CollegeRecord[K]) => update((r) => ({ ...r, [key]: value }));
  const [sharing, setSharing] = useState(false);
  const detail = (patch: Partial<CollegeRecord["detail"]>) => update((r) => ({ ...r, detail: { ...r.detail, ...patch } }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card title="Identity" description="The college's name and where it is. The page address (/college/…) is made from the name when the college is created and does not change.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TextInput id="ci-name" label="College name" required max={500} value={record.name} onChange={(v) => set("name", v)} />
              <div>
                <p className="block text-xs font-semibold text-ink">Page address</p>
                <p className="mt-1.5 rounded-lg border border-line bg-bg-alt px-3 py-2 text-sm text-ink-soft">/college/{slug}</p>
                <p className="mt-1 text-xs text-ink-faint">Fixed, so links keep working.</p>
              </div>
              <SelectInput id="ci-state" label="State" required value={record.state} onChange={(v) => set("state", v)} options={pools.states} placeholder="Select a state" />
              <CityField state={record.state} value={record.city} districts={pools.districts?.[record.state] ?? []} onChange={(v) => set("city", v)} />
              <TextInput id="ci-locality" label="Locality" max={120} value={record.detail.locality} onChange={(v) => detail({ locality: v })} hint="The street or area before the city, e.g. Hosur Road." />
              <SelectInput id="ci-type" label="Type" required value={record.institutionType ?? "College"} onChange={(v) => set("institutionType", v as CollegeRecord["institutionType"])} options={["College", "University"]} hint="Whether this is a college or a university." />
              <SelectInput id="ci-ownership" label="Ownership" required value={record.ownership} onChange={(v) => set("ownership", v as CollegeRecord["ownership"])} options={["Private", "Government", "Deemed"]} />
              <div className="md:col-span-2"><CategoryTicks value={record.streams} options={pools.streams} onChange={(next) => update((r) => ({ ...r, streams: next, stream: next[0] ?? "" }))} /></div>
              <NumberInput id="ci-established" label="Established" min={YEAR_MIN} max={YEAR} value={record.established} onChange={(v) => set("established", v)} placeholder="e.g. 1998" hint="The year it was founded." />
            </div>
          </Card>

          <Card title="Masthead" description="The title and chips at the top of every page of this college.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TextInput id="ci-short" label="Short name" max={80} value={record.detail.shortName} onChange={(v) => detail({ shortName: v })} hint="e.g. BIMS Bengaluru. Used where space is tight. Empty: the full name." />
              <TextInput id="ci-tagline" label="Heading after the title" max={160} value={record.detail.tagline} onChange={(v) => detail({ tagline: v })} hint="e.g. Courses, Fees, Admission 2027. Empty: a default." />
            </div>
            <ChipInput id="ci-approvals" label="Approvals" value={record.approvals} onChange={(v) => set("approvals", v)} suggestions={pools.approvals} max={20} maxChars={TAG_MAX_CHARS} hint={`Shown as chips: AICTE, NAAC A++, UGC. Up to ${TAG_MAX_CHARS} characters each.`} />
            <ChipInput id="ci-tags" label="Tags" value={record.tags} onChange={(v) => set("tags", v)} suggestions={pools.tags} max={12} maxChars={TAG_MAX_CHARS} hint={`Badges on the college's cards in lists. Up to ${TAG_MAX_CHARS} characters each.`} />
          </Card>

          {mode === "full" && (
            <Card title="Listing badges" description="The badges on this college's card in the college list, and the counts above the list. Tick the ones it should carry.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {BADGES.map(({ key, label, hint }) => (
                  <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-bg-alt px-4 py-3 transition hover:border-brand">
                    <input
                      type="checkbox"
                      checked={!!record[key]}
                      onChange={(e) => set(key, e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink">{label}</span>
                      <span className="block text-xs text-ink-faint">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          )}

          {mode === "full" && (
            <Card title="Sponsorship" description="A sponsored college receives leads from the platform team, which you choose and share with it in bulk. Its admin sees them in their Leads inbox.">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-bg-alt px-4 py-3 transition hover:border-brand">
                <input type="checkbox" checked={!!record.isSponsored} onChange={(e) => set("isSponsored", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" />
                <span>
                  <span className="block text-sm font-semibold text-ink">Sponsored college</span>
                  <span className="block text-xs text-ink-faint">Tick it and save the college, then share leads below.</span>
                </span>
              </label>
              {record.isSponsored && (
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => setSharing(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
                    Share leads with this college
                  </button>
                  <span className="text-xs text-ink-faint">Pick leads one by one or share the newest few, filtered by stream, city or type.</span>
                </div>
              )}
              {sharing && <ShareLeadsModal slug={slug} name={record.name} onClose={() => setSharing(false)} />}
            </Card>
          )}

          <Card title="About and admissions" description="The overview text, the entrance exams accepted and the overall fee range.">
            <TextArea id="ci-about" label="About" rows={6} max={20000} value={record.about} onChange={(v) => set("about", v)} hint="Shown on the overview and used for the search snippet." />
            <ChipInput id="ci-exams" label="Entrance exams accepted" value={record.examsAccepted} onChange={(v) => set("examsAccepted", v)} suggestions={pools.exams} max={40} strict hint="Only exams in the directory can be added. Type the name or its short form, such as CAT." />
            <div className="max-w-xl">
              <RangeField id="ci-fees" label="Total fee range" compact units={["K", "L", "Cr"]} value={record.feesRange} onChange={(v) => set("feesRange", v)} hint="Across all programmes." />
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Photo" description="The banner on the college's own page, and its cards on the homepage and in lists.">
            <ImageUploadField kind="college" value={record.image} onChange={(v) => set("image", v)} fallbackNote="No photo. The site's shared photo set is used." />
          </Card>
          <Card title="Logo" description="The small square tile over the banner.">
            <ImageUploadField kind="logo" value={record.detail.logo} onChange={(v) => detail({ logo: v })} fallbackNote="No logo. The tile shows the college's initials." />
          </Card>
          <Card title="Brochure">
            <TextInput id="ci-brochure" label="Brochure link" max={300} value={record.detail.brochureUrl} onChange={(v) => detail({ brochureUrl: v })} placeholder="https://…" hint="A link to the PDF, starting with https://. Empty: the Brochure button opens the enquiry form." />
          </Card>
        </div>
      </div>
    </div>
  );
}

const OTHER = "__other__";

/**
 * The city: one of the state's districts, or "Other" and typed in (a city is often not a district's name, and
 * a hub such as Delhi NCR spans several). With no districts for the state it is a plain text box.
 */
function CityField({ state, value, districts, onChange }: { state: string; value: string; districts: string[]; onChange: (v: string) => void }) {
  const [other, setOther] = useState(value !== "" && !districts.includes(value));
  if (districts.length === 0) return <TextInput id="ci-city" label="City" required max={200} value={value} onChange={onChange} />;
  const picked = other ? OTHER : value;
  return (
    <div>
      <Labelled id="ci-city" label="City" required hint={state ? undefined : "Choose a state first."}>
        <select
          id="ci-city"
          aria-required="true"
          value={picked}
          disabled={!state}
          onChange={(e) => {
            if (e.target.value === OTHER) {
              setOther(true);
              onChange("");
            } else {
              setOther(false);
              onChange(e.target.value);
            }
          }}
          className={inputCls}
        >
          <option value="">Select a city</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value={OTHER}>Other, type it</option>
        </select>
      </Labelled>
      {other && <input aria-label="City" aria-required="true" value={value} maxLength={200} placeholder="Type the city" onChange={(e) => onChange(e.target.value)} className={inputCls} />}
    </div>
  );
}
