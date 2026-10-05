"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHomeCopy } from "@/lib/admin-actions";
import type { HomeCopy, HomeCopyPart, SectionCopy, StoryCopy } from "@/lib/home-copy";
import { AdminSection } from "@/components/admin/admin-section";
import { ImageUploadField } from "@/components/admin/image-upload-field";

type Message = { kind: "ok" | "error"; text: string } | null;

function Field({
  id,
  label,
  value,
  onChange,
  multiline,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  const cls = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

type FieldSpec<K extends string> =
  | { key: K; label: string; multiline?: boolean; hint?: string }
  | { key: K; image: "hero" | "banner"; fallbackNote: string };

/**
 * One homepage section's copy. Each part saves on its own, so editing the hero
 * never rewrites the wording of any other section.
 */
function CopyForm<P extends HomeCopyPart>({
  part,
  title,
  description,
  initial,
  fields,
}: {
  part: P;
  title: string;
  description: string;
  initial: HomeCopy[P];
  fields: FieldSpec<keyof HomeCopy[P] & string>[];
}) {
  const router = useRouter();
  const [value, setValue] = useState<HomeCopy[P]>(initial);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: string, v: string) => {
    setValue((prev) => ({ ...prev, [key]: v }));
    setDirty(true);
    setMessage(null);
  };

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveHomeCopy(part, value as unknown as Record<string, string>);
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setDirty(false);
        setMessage({ kind: "ok", text: "Saved. The homepage now shows this wording." });
        router.refresh();
      }
    });
  };

  return (
    <AdminSection title={title} description={description}>
      <div className="space-y-4">
        <FieldGrid>
          {fields.map((f) => {
            const current = String((value as Record<string, unknown>)[f.key] ?? "");
            return "image" in f ? (
              <ImageUploadField
                key={f.key}
                kind={f.image}
                value={current}
                fallbackNote={f.fallbackNote}
                onChange={(v) => set(f.key, v)}
              />
            ) : (
              <Field
                key={f.key}
                id={`${part}-${f.key}`}
                label={f.label}
                multiline={f.multiline}
                hint={f.hint}
                value={current}
                onChange={(v) => set(f.key, v)}
              />
            );
          })}
        </FieldGrid>

        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${message.kind === "error" ? "border border-red-200 bg-red-50 text-red-700" : "border border-line bg-bg-alt text-ink-soft"}`}>
            {message.text}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={!dirty || pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          {dirty && !pending && <span className="text-xs text-ink-soft">Unsaved changes</span>}
        </div>
      </div>
    </AdminSection>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

export function HeroCopyEditor({ copy }: { copy: HomeCopy["hero"] }) {
  return (
    <CopyForm
      part="hero"
      title="Search box"
      description="The search box under the hero slides. It is the same for every slide."
      initial={copy}
      fields={[
        { key: "searchPlaceholder", label: "Search placeholder" },
        { key: "searchButton", label: "Search button label" },
      ]}
    />
  );
}

type SectionField = "eyebrow" | "heading" | "accent" | "subheading";

const SECTION_FIELDS: Record<SectionField, { label: string; multiline?: boolean; hint?: string }> = {
  eyebrow: { label: "Small label above the heading", hint: "Optional." },
  heading: { label: "Heading" },
  accent: { label: "Emphasised words", hint: "Shown in the brand colour after the heading. Optional." },
  subheading: { label: "Supporting text", multiline: true, hint: "Optional." },
};

/** The fields a section's page actually shows. A field the page ignores is not offered. */
export function SectionCopyEditor({
  part,
  title,
  description,
  copy,
  show = ["eyebrow", "heading", "accent", "subheading"],
}: {
  part: "locations" | "streams" | "topExams" | "careers" | "data" | "articles";
  title: string;
  description: string;
  copy: SectionCopy;
  show?: SectionField[];
}) {
  return (
    <CopyForm
      part={part}
      title={title}
      description={description}
      initial={copy}
      fields={show.map((key) => ({ key, ...SECTION_FIELDS[key] }))}
    />
  );
}

/** Heading and labels for the two rotating-card rows. */
export function StoryCopyEditor({
  part,
  title,
  description,
  copy,
  extra,
}: {
  part: "programs" | "universities";
  title: string;
  description: string;
  copy: StoryCopy;
  extra: "itemEyebrow" | "itemSubline";
}) {
  return (
    <CopyForm
      part={part}
      title={title}
      description={description}
      initial={copy}
      fields={[
        { key: "heading", label: "Heading" },
        { key: "accent", label: "Emphasised words", hint: "Shown in the brand colour after the heading. Optional." },
        extra === "itemEyebrow"
          ? { key: "itemEyebrow", label: "Small line above each card's title", hint: "Optional." }
          : { key: "itemSubline", label: "Line under each card's title", multiline: true, hint: "Optional." },
        { key: "buttonLabel", label: "Card button label" },
      ]}
    />
  );
}

export function PromoBannerEditor({ copy }: { copy: HomeCopy["promoBanner"] }) {
  return (
    <CopyForm
      part="promoBanner"
      title="Promo banner"
      description="The brand-coloured banner under the careers panels."
      initial={copy}
      fields={[
        { key: "heading", label: "Heading", multiline: true, hint: "5 to 120 characters." },
        { key: "buttonLabel", label: "Button label" },
        { key: "buttonHref", label: "Button link", hint: "A path on this site, starting with /, such as /colleges." },
        {
          key: "image",
          image: "banner",
          fallbackNote: "No picture chosen. The site shows the built-in campus picture.",
        },
        {
          key: "imageAlt",
          label: "Picture description",
          hint: "Read aloud by screen readers. Leave empty if the picture is only decoration.",
        },
      ]}
    />
  );
}
