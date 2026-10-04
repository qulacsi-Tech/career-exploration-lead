"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHomeCopy } from "@/lib/admin-actions";
import type { HomeCopy, SectionCopy } from "@/lib/home-copy";
import { AdminSection } from "@/components/admin/admin-section";

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

/**
 * One homepage section's copy. Each tab saves only its own part, so editing the
 * hero never rewrites the locations or streams wording.
 */
function CopyForm<P extends keyof HomeCopy>({
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
  fields: { key: keyof HomeCopy[P] & string; label: string; multiline?: boolean; hint?: string; optional?: boolean }[];
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
          {fields.map((f) => (
            <Field
              key={f.key}
              id={`${part}-${f.key}`}
              label={f.label}
              multiline={f.multiline}
              hint={f.hint}
              value={String((value as Record<string, unknown>)[f.key] ?? "")}
              onChange={(v) => set(f.key, v)}
            />
          ))}
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
      title="Hero"
      description="The headline and search box at the top of the homepage."
      initial={copy}
      fields={[
        { key: "headline", label: "Headline", hint: "5 to 150 characters." },
        { key: "subheadline", label: "Sub-headline", multiline: true, hint: "5 to 300 characters." },
        { key: "searchPlaceholder", label: "Search placeholder" },
        { key: "searchButton", label: "Search button label" },
      ]}
    />
  );
}

export function SectionCopyEditor({
  part,
  title,
  description,
  copy,
}: {
  part: "locations" | "streams";
  title: string;
  description: string;
  copy: SectionCopy;
}) {
  return (
    <CopyForm
      part={part}
      title={title}
      description={description}
      initial={copy}
      fields={[
        { key: "eyebrow", label: "Small label above the heading", hint: "Optional." },
        { key: "heading", label: "Heading" },
        { key: "accent", label: "Emphasised words", hint: "Shown in the brand colour after the heading. Optional." },
        { key: "subheading", label: "Supporting text", multiline: true, hint: "Optional." },
      ]}
    />
  );
}
