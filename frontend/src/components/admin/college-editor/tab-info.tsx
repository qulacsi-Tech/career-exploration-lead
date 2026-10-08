"use client";

import type { CollegePools, CollegeRecord } from "@/lib/api";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RangeField } from "@/components/admin/range-field";
import { Card, ChipInput, NumberInput, SelectInput, TextArea, TextInput } from "@/components/admin/college-editor/shared";

export type EditorProps = {
  record: CollegeRecord;
  /** Applies a change to the record, in one place for every tab. */
  update: (change: (r: CollegeRecord) => CollegeRecord) => void;
  pools: CollegePools;
  slug: string;
};

const YEAR = new Date().getFullYear();

/** College Info: who the college is, what the masthead shows, and its photos. */
export function InfoTab({ record, update, pools, slug }: EditorProps) {
  const set = <K extends keyof CollegeRecord>(key: K, value: CollegeRecord[K]) => update((r) => ({ ...r, [key]: value }));
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
              <TextInput id="ci-city" label="City" required max={200} value={record.city} onChange={(v) => set("city", v)} />
              <TextInput id="ci-locality" label="Locality" max={120} value={record.detail.locality} onChange={(v) => detail({ locality: v })} hint="The street or area before the city, e.g. Hosur Road." />
              <SelectInput id="ci-ownership" label="Ownership" required value={record.ownership} onChange={(v) => set("ownership", v as CollegeRecord["ownership"])} options={["Private", "Government", "Deemed"]} />
              <SelectInput id="ci-stream" label="Category" required value={record.stream} onChange={(v) => set("stream", v)} options={pools.streams} placeholder="Select a category" hint="The category the college is listed under." />
              <NumberInput id="ci-established" label="Established" min={1000} max={YEAR} value={record.established} onChange={(v) => set("established", v)} placeholder="e.g. 1998" hint="The year it was founded." />
            </div>
          </Card>

          <Card title="Masthead" description="The title and chips at the top of every page of this college.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TextInput id="ci-short" label="Short title" max={80} value={record.detail.shortName} onChange={(v) => detail({ shortName: v })} hint="e.g. BIMS Bengaluru. Empty: the initials and city." />
              <TextInput id="ci-tagline" label="Heading after the title" max={160} value={record.detail.tagline} onChange={(v) => detail({ tagline: v })} hint="e.g. Courses, Fees, Admission 2027. Empty: a default." />
            </div>
            <ChipInput id="ci-approvals" label="Approvals" value={record.approvals} onChange={(v) => set("approvals", v)} suggestions={pools.approvals} max={20} hint="Shown as chips: AICTE, NAAC A++, UGC." />
            <ChipInput id="ci-tags" label="Tags" value={record.tags} onChange={(v) => set("tags", v)} suggestions={pools.tags} max={12} hint="Badges on the college's cards in lists." />
          </Card>

          <Card title="About and admissions" description="The overview text, the entrance exams accepted and the overall fee range.">
            <TextArea id="ci-about" label="About" rows={6} max={20000} value={record.about} onChange={(v) => set("about", v)} hint="Shown on the overview and used for the search snippet." />
            <ChipInput id="ci-exams" label="Entrance exams accepted" value={record.examsAccepted} onChange={(v) => set("examsAccepted", v)} suggestions={pools.exams} max={40} hint="Chosen from the exams in the directory." />
            <div className="max-w-xl">
              <RangeField id="ci-fees" label="Total fee range" compact units={["L", "Cr"]} value={record.feesRange} onChange={(v) => set("feesRange", v)} hint="Across all programmes." />
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
