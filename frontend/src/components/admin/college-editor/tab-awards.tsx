"use client";

import { ImageUploadField } from "@/components/admin/image-upload-field";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { AddButton, Card, EmptyNote, Row, TextArea, TextInput, move } from "@/components/admin/college-editor/shared";

export type Award = { title: string; year: string; awardedBy: string; description: string; image: string };

export const blankAward = (): Award => ({ title: "", year: "", awardedBy: "", description: "", image: "" });

/**
 * The awards this college has won, each with an optional small picture (the trophy, the certificate or the
 * badge). They show on the college's Rankings tab and on its overview, in this order. Saved with the Save button.
 */
export function AwardsTab({ record, update }: EditorProps) {
  const awards: Award[] = record.detail.awards ?? [];
  const set = (list: Award[]) => update((r) => ({ ...r, detail: { ...r.detail, awards: list } }));
  const patch = (i: number, change: Partial<Award>) => set(awards.map((a, n) => (n === i ? { ...a, ...change } : a)));

  return (
    <Card
      title="Awards"
      description="Awards and recognition this college has won. They show on its Rankings tab and on its overview page, in this order. A small picture of the award is optional."
      actions={<AddButton onClick={() => set([...awards, blankAward()])} disabled={awards.length >= 40}>Add an award</AddButton>}
    >
      {awards.length === 0 ? (
        <EmptyNote>No awards yet. Nothing is shown on the college page until one is added.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {awards.map((a, i) => (
            <Row key={i} title={a.title || `Award ${i + 1}`} index={i} count={awards.length} onMove={(d) => set(move(awards, i, d))} onRemove={() => set(awards.filter((_, n) => n !== i))}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)]">
                <TextInput id={`aw-${i}-title`} label="Award" required max={150} value={a.title} onChange={(v) => patch(i, { title: v })} placeholder="e.g. Best B-School in Western India" />
                <TextInput id={`aw-${i}-year`} label="Year" max={9} value={a.year} onChange={(v) => patch(i, { year: v.replace(/[^\d-]/g, "") })} placeholder="2025" hint="A year, or a range such as 2024-25." />
                <TextInput id={`aw-${i}-by`} label="Awarded by" max={150} value={a.awardedBy} onChange={(v) => patch(i, { awardedBy: v })} placeholder="e.g. Times Education" />
              </div>
              <div className="mt-4">
                <TextArea id={`aw-${i}-desc`} label="About the award (optional)" rows={2} max={400} value={a.description} onChange={(v) => patch(i, { description: v })} />
              </div>
              <div className="mt-4 max-w-sm">
                <p className="mb-1.5 text-sm font-semibold text-ink">Picture <span className="font-normal text-ink-faint">(optional)</span></p>
                <ImageUploadField kind="award" value={a.image} onChange={(v) => patch(i, { image: v })} fallbackNote="No picture. The award is shown with its name only." />
              </div>
            </Row>
          ))}
        </ul>
      )}
    </Card>
  );
}
