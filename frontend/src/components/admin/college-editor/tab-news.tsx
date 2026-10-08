"use client";

import type { CollegeAlert, CollegeArticle, CollegeMediaItem } from "@/lib/api";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { AddButton, Card, EmptyNote, IsoDate, Row, SelectInput, TextArea, TextInput, today } from "@/components/admin/college-editor/shared";

/*
  News: what the college's News tab and the overview's "What's new?" card are built from.

    Alerts   dated notices (admission windows, results, exam dates). Urgent ones lead the
             overview card and glow.
    Articles the college's own news items, with a short summary and optional full text.
    Press    where the college was written about, with a link out.
*/

const KINDS = ["Admission", "Exam", "Result", "Notice"];

export function NewsTab({ record, update }: EditorProps) {
  const { alerts, articles, media } = record.detail;
  const setDetail = (patch: Partial<typeof record.detail>) => update((r) => ({ ...r, detail: { ...r.detail, ...patch } }));

  const patchAlert = (i: number, change: Partial<CollegeAlert>) => setDetail({ alerts: alerts.map((a, n) => (n === i ? { ...a, ...change } : a)) });
  const patchArticle = (i: number, change: Partial<CollegeArticle>) => setDetail({ articles: articles.map((a, n) => (n === i ? { ...a, ...change } : a)) });
  const patchMedia = (i: number, change: Partial<CollegeMediaItem>) => setDetail({ media: media.map((m, n) => (n === i ? { ...m, ...change } : m)) });

  return (
    <div className="space-y-5">
      <Card
        title="Alerts"
        description="Short dated notices. Urgent ones lead the overview card."
        actions={<AddButton onClick={() => setDetail({ alerts: [{ title: "", date: today(), kind: "Notice", isUrgent: false, link: "" }, ...alerts] })} disabled={alerts.length >= 30}>Add an alert</AddButton>}
      >
        {alerts.length === 0 ? (
          <EmptyNote>No alerts.</EmptyNote>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a, i) => (
              <Row key={i} title={a.title || `Alert ${i + 1}`} index={i} count={alerts.length} onRemove={() => setDetail({ alerts: alerts.filter((_, n) => n !== i) })}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_12rem_10rem]">
                  <TextInput id={`al-${i}-title`} label="Notice" required max={200} value={a.title} onChange={(v) => patchAlert(i, { title: v })} />
                  <IsoDate id={`al-${i}-date`} label="Date" value={a.date} onChange={(v) => patchAlert(i, { date: v || a.date })} />
                  <SelectInput id={`al-${i}-kind`} label="Type" value={a.kind} onChange={(v) => patchAlert(i, { kind: v as CollegeAlert["kind"] })} options={KINDS} />
                </div>
                <div className="mt-4 grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <TextInput id={`al-${i}-link`} label="Link" max={300} value={a.link} onChange={(v) => patchAlert(i, { link: v })} placeholder="/enquiry or https://…" hint="A page on this site or an https link. Optional." />
                  <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-ink">
                    <input type="checkbox" checked={a.isUrgent} onChange={(e) => patchAlert(i, { isUrgent: e.target.checked })} className="h-4 w-4 accent-[var(--color-brand)]" />
                    Urgent
                  </label>
                </div>
              </Row>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Articles"
        description="The college's own news items, newest first on the News tab."
        actions={<AddButton onClick={() => setDetail({ articles: [{ title: "", date: today(), author: "Editorial Desk", summary: "", body: "" }, ...articles] })} disabled={articles.length >= 20}>Add an article</AddButton>}
      >
        {articles.length === 0 ? (
          <EmptyNote>No articles.</EmptyNote>
        ) : (
          <ul className="space-y-3">
            {articles.map((a, i) => (
              <Row key={i} title={a.title || `Article ${i + 1}`} index={i} count={articles.length} onRemove={() => setDetail({ articles: articles.filter((_, n) => n !== i) })}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_12rem_minmax(0,1fr)]">
                  <TextInput id={`ar-${i}-title`} label="Title" required max={200} value={a.title} onChange={(v) => patchArticle(i, { title: v })} />
                  <IsoDate id={`ar-${i}-date`} label="Date" value={a.date} onChange={(v) => patchArticle(i, { date: v || a.date })} />
                  <TextInput id={`ar-${i}-author`} label="Author" max={120} value={a.author} onChange={(v) => patchArticle(i, { author: v })} />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <TextArea id={`ar-${i}-summary`} label="Summary" rows={3} max={600} value={a.summary} onChange={(v) => patchArticle(i, { summary: v })} hint="One or two lines under the title." />
                  <TextArea id={`ar-${i}-body`} label="Full text" rows={3} max={20000} value={a.body} onChange={(v) => patchArticle(i, { body: v })} hint="Optional. A blank line starts a new paragraph." />
                </div>
              </Row>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="In the press"
        description="Coverage of the college elsewhere, with a link to it."
        actions={<AddButton onClick={() => setDetail({ media: [{ title: "", publication: "", date: today(), link: "" }, ...media] })} disabled={media.length >= 20}>Add coverage</AddButton>}
      >
        {media.length === 0 ? (
          <EmptyNote>No press coverage.</EmptyNote>
        ) : (
          <ul className="space-y-3">
            {media.map((m, i) => (
              <Row key={i} title={m.title || `Coverage ${i + 1}`} index={i} count={media.length} onRemove={() => setDetail({ media: media.filter((_, n) => n !== i) })}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <TextInput id={`me-${i}-title`} label="Headline" required max={200} value={m.title} onChange={(v) => patchMedia(i, { title: v })} />
                  <TextInput id={`me-${i}-pub`} label="Publication" max={120} value={m.publication} onChange={(v) => patchMedia(i, { publication: v })} placeholder="e.g. The Economic Times" />
                  <IsoDate id={`me-${i}-date`} label="Date" value={m.date} onChange={(v) => patchMedia(i, { date: v })} />
                  <TextInput id={`me-${i}-link`} label="Link" max={300} value={m.link} onChange={(v) => patchMedia(i, { link: v })} placeholder="https://…" hint="Must start with https://." />
                </div>
              </Row>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
