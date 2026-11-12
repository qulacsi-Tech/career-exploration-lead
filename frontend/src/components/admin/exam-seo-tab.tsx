"use client";

import { useState } from "react";
import type { Exam } from "@/lib/api";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SelectField, SelectWithOtherField } from "@/components/admin/admin-fields";
import { FieldGrid } from "@/components/admin/resource-admin";

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 320;
const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

/** "42 / 60" under a field, turning amber past the length search engines show and red past the limit. */
function Counter({ length, ideal, max }: { length: number; ideal: number; max: number }) {
  const tone = length > max ? "text-red-700" : length > ideal ? "text-amber-700" : "text-ink-faint";
  return (
    <p className={`mt-1 text-[11px] ${tone}`} aria-live="polite">
      {length} / {ideal} characters
      {length > max
        ? ` — over the ${max} limit, it will not save`
        : length > ideal
          ? " — search engines will cut the end off"
          : ""}
    </p>
  );
}

/** The exam's SEO: how it reads in search results and when shared. Saved with the rest of the exam. */
export function ExamSeoTab({ exam }: { exam: Exam }) {
  const seo = exam.seo ?? {};
  const [title, setTitle] = useState(seo.metaTitle ?? "");
  const [description, setDescription] = useState(seo.metaDescription ?? "");
  const [ogImage, setOgImage] = useState(seo.ogImage ?? "");

  return (
    <FieldGrid>
      <div className="sm:col-span-2">
        <label htmlFor="metaTitle" className="block text-xs font-semibold text-ink">Meta title</label>
        <input
          id="metaTitle"
          name="metaTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder={`${exam.name} — Dates, Pattern & Results`}
          className={input}
        />
        <Counter length={title.length} ideal={60} max={TITLE_MAX} />
      </div>

      <div>
        <label htmlFor="canonical" className="block text-xs font-semibold text-ink">Canonical URL</label>
        <input
          id="canonical"
          name="canonical"
          defaultValue={seo.canonical ?? ""}
          maxLength={300}
          placeholder={`/exams/${exam.slug}`}
          className={input}
        />
        <p className="mt-1 text-[11px] text-ink-faint">A path starting with / or a full https:// address. Empty: the page&apos;s own address.</p>
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <label htmlFor="metaDescription" className="block text-xs font-semibold text-ink">Meta description</label>
        <textarea
          id="metaDescription"
          name="metaDescription"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX}
          placeholder="Around 155 characters, shown in search results."
          className={input}
        />
        <Counter length={description.length} ideal={160} max={DESCRIPTION_MAX} />
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <input type="hidden" name="ogImage" value={ogImage} />
        <ImageUploadField kind="og" value={ogImage} onChange={setOgImage} fallbackNote="No share image. The site's default is used." />
      </div>

      <SelectWithOtherField
        label="Schema type"
        name="schemaType"
        defaultValue={seo.schemaType || "Event"}
        options={["Event", "EducationalOccupationalProgram", "WebPage"]}
        customPlaceholder="Any schema.org type"
      />
      <SelectField label="Indexing" name="robots" defaultValue={seo.robots || "Index, follow"} options={["Index, follow", "No index"]} />
    </FieldGrid>
  );
}
