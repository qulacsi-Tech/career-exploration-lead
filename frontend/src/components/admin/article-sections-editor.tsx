"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Image as ImageIcon,
  Info,
  List,
  ListOrdered,
  Plus,
  Quote,
  Table2,
  Trash2,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { mediaUrl } from "@/lib/media";
import {
  BLOCK_TYPES,
  IMAGE_ALIGN_CLASS,
  IMAGE_SHAPES,
  IMAGE_SIZES,
  emptyBlock,
  type ArticleBlock,
  type ArticleSection,
  type BlockType,
} from "@/lib/article-sections";

/*
  Builds an article page from buttons, with no editor: add a section, give it a
  heading, then add the kinds of content it needs (text, points, a table, steps,
  key facts, a note, a quote). Each block is a small form of its own, and
  sections and blocks can be moved up or down or removed. Blank blocks are
  dropped when the article is saved.
*/

const input =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

const ICON: Record<BlockType, LucideIcon> = {
  paragraph: Type,
  list: List,
  table: Table2,
  steps: ListOrdered,
  facts: List,
  note: Info,
  quote: Quote,
  image: ImageIcon,
};

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const replaceAt = <T,>(list: T[], index: number, item: T): T[] => list.map((x, i) => (i === index ? item : x));
const removeAt = <T,>(list: T[], index: number): T[] => list.filter((_, i) => i !== index);

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft transition disabled:opacity-30 ${
        danger ? "hover:border-red-300 hover:bg-red-50 hover:text-red-700" : "hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand/50 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-soft"
    >
      <Plus className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
   One block's form
 * ------------------------------------------------------------------ */

function BlockForm({ block, onChange }: { block: ArticleBlock; onChange: (b: ArticleBlock) => void }) {
  switch (block.type) {
    case "paragraph":
      return (
        <textarea
          rows={4}
          value={block.text}
          maxLength={5000}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Write the paragraph"
          className={input}
        />
      );

    case "list":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["bullet", "Bullets"],
                ["numbered", "Numbered"],
                ["check", "Ticks"],
              ] as const
            ).map(([style, label]) => (
              <button
                key={style}
                type="button"
                onClick={() => onChange({ ...block, style })}
                aria-pressed={block.style === style}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  block.style === style ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-brand"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-ink-faint">
                  {block.style === "numbered" ? i + 1 : block.style === "check" ? "✓" : "•"}
                </span>
                <input
                  value={item}
                  maxLength={300}
                  onChange={(e) => onChange({ ...block, items: replaceAt(block.items, i, e.target.value) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onChange({ ...block, items: [...block.items.slice(0, i + 1), "", ...block.items.slice(i + 1)] });
                    }
                  }}
                  placeholder="Point"
                  className={input}
                />
                <IconButton label="Remove point" onClick={() => onChange({ ...block, items: removeAt(block.items, i) })} disabled={block.items.length === 1} danger>
                  <X className="h-3.5 w-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
          <AddButton onClick={() => onChange({ ...block, items: [...block.items, ""] })}>Add point</AddButton>
        </div>
      );

    case "table": {
      const cols = block.headers.length;
      return (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-separate border-spacing-1.5">
              <thead>
                <tr>
                  {block.headers.map((h, c) => (
                    <th key={c} className="font-normal">
                      <div className="flex items-center gap-1">
                        <input
                          value={h}
                          maxLength={300}
                          onChange={(e) => onChange({ ...block, headers: replaceAt(block.headers, c, e.target.value) })}
                          placeholder={`Column ${c + 1}`}
                          className={`${input} font-semibold`}
                        />
                        <IconButton
                          label="Remove column"
                          disabled={cols <= 1}
                          danger
                          onClick={() =>
                            onChange({
                              ...block,
                              headers: removeAt(block.headers, c),
                              rows: block.rows.map((r) => removeAt(r, c)),
                            })
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {block.headers.map((_, c) => (
                      <td key={c}>
                        <input
                          value={row[c] ?? ""}
                          maxLength={300}
                          onChange={(e) => {
                            const next = block.headers.map((__, i) => (i === c ? e.target.value : (row[i] ?? "")));
                            onChange({ ...block, rows: replaceAt(block.rows, r, next) });
                          }}
                          className={input}
                        />
                      </td>
                    ))}
                    <td>
                      <IconButton label="Remove row" onClick={() => onChange({ ...block, rows: removeAt(block.rows, r) })} disabled={block.rows.length === 1} danger>
                        <X className="h-3.5 w-3.5" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <AddButton onClick={() => onChange({ ...block, rows: [...block.rows, block.headers.map(() => "")] })}>Add row</AddButton>
            <AddButton
              onClick={() =>
                cols < 10 && onChange({ ...block, headers: [...block.headers, ""], rows: block.rows.map((r) => [...r, ""]) })
              }
            >
              Add column
            </AddButton>
          </div>
        </div>
      );
    }

    case "steps":
      return (
        <div className="space-y-3">
          <ol className="space-y-3">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-3 rounded-lg bg-bg-alt p-3">
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={item.title}
                    maxLength={300}
                    onChange={(e) => onChange({ ...block, items: replaceAt(block.items, i, { ...item, title: e.target.value }) })}
                    placeholder="Step title"
                    className={`${input} font-semibold`}
                  />
                  <textarea
                    rows={2}
                    value={item.text}
                    maxLength={1000}
                    onChange={(e) => onChange({ ...block, items: replaceAt(block.items, i, { ...item, text: e.target.value }) })}
                    placeholder="What happens in this step (optional)"
                    className={input}
                  />
                </div>
                <IconButton label="Remove step" onClick={() => onChange({ ...block, items: removeAt(block.items, i) })} disabled={block.items.length === 1} danger>
                  <X className="h-3.5 w-3.5" />
                </IconButton>
              </li>
            ))}
          </ol>
          <AddButton onClick={() => onChange({ ...block, items: [...block.items, { title: "", text: "" }] })}>Add step</AddButton>
        </div>
      );

    case "facts":
      return (
        <div className="space-y-3">
          <ul className="space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  value={item.label}
                  maxLength={300}
                  onChange={(e) => onChange({ ...block, items: replaceAt(block.items, i, { ...item, label: e.target.value }) })}
                  placeholder="Label, e.g. Duration"
                  className={input}
                />
                <input
                  value={item.value}
                  maxLength={300}
                  onChange={(e) => onChange({ ...block, items: replaceAt(block.items, i, { ...item, value: e.target.value }) })}
                  placeholder="Value, e.g. 24 months"
                  className={input}
                />
                <IconButton label="Remove fact" onClick={() => onChange({ ...block, items: removeAt(block.items, i) })} disabled={block.items.length === 1} danger>
                  <X className="h-3.5 w-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
          <AddButton onClick={() => onChange({ ...block, items: [...block.items, { label: "", value: "" }] })}>Add fact</AddButton>
        </div>
      );

    case "note":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["info", "Info"],
                ["tip", "Tip"],
                ["warning", "Warning"],
              ] as const
            ).map(([tone, label]) => (
              <button
                key={tone}
                type="button"
                onClick={() => onChange({ ...block, tone })}
                aria-pressed={block.tone === tone}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  block.tone === tone ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-brand"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input value={block.title} maxLength={300} onChange={(e) => onChange({ ...block, title: e.target.value })} placeholder="Title (optional)" className={`${input} font-semibold`} />
          <textarea rows={3} value={block.text} maxLength={2000} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="The note" className={input} />
        </div>
      );

    case "image": {
      const size = IMAGE_SIZES.find((x) => x.value === block.size) ?? IMAGE_SIZES[2];
      const shape = IMAGE_SHAPES.find((x) => x.value === block.shape) ?? IMAGE_SHAPES[1];
      const choice = <T extends string>(label: string, options: { value: T; label: string }[], current: T, pick: (v: T) => void) => (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink">{label}</p>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                aria-pressed={current === o.value}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  current === o.value ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-brand"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );
      return (
        <div className="space-y-4">
          <ImageUploadField
            kind="article_figure"
            value={block.src}
            onChange={(src) => onChange({ ...block, src })}
            fallbackNote="No picture yet. Choose one to add it to the section."
          />
          {choice("Size", IMAGE_SIZES, block.size, (v) => onChange({ ...block, size: v }))}
          {choice("Shape", IMAGE_SHAPES, block.shape, (v) => onChange({ ...block, shape: v }))}
          {choice(
            "Position",
            [
              { value: "left", label: "Left" },
              { value: "center", label: "Centre" },
              { value: "right", label: "Right" },
            ],
            block.align,
            (v) => onChange({ ...block, align: v }),
          )}
          <input value={block.alt} maxLength={300} onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Describe the picture (for screen readers and search)" className={input} />
          <input value={block.caption} maxLength={300} onChange={(e) => onChange({ ...block, caption: e.target.value })} placeholder="Caption (optional)" className={input} />
          {block.src && (
            <div className="rounded-lg bg-bg-alt p-3">
              <p className="mb-2 text-xs font-semibold text-ink-faint">Preview, as it will look in the article</p>
              <figure className={`w-full ${size.box} ${IMAGE_ALIGN_CLASS[block.align]}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(block.src)} alt="" className={`w-full border border-line object-cover ${shape.frame}`} />
                {block.caption && <figcaption className="mt-1.5 text-center text-xs text-ink-faint">{block.caption}</figcaption>}
              </figure>
            </div>
          )}
        </div>
      );
    }

    case "quote":
      return (
        <div className="space-y-3">
          <textarea rows={3} value={block.text} maxLength={1000} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="The quote" className={input} />
          <input value={block.by} maxLength={300} onChange={(e) => onChange({ ...block, by: e.target.value })} placeholder="Who said it (optional)" className={input} />
        </div>
      );
  }
}

/* ------------------------------------------------------------------ *
   The editor
 * ------------------------------------------------------------------ */

const MAX_SECTIONS = 30;
const MAX_BLOCKS = 40;

export function ArticleSectionsEditor({
  sections,
  onChange,
}: {
  sections: ArticleSection[];
  onChange: (sections: ArticleSection[]) => void;
}) {
  const [closed, setClosed] = useState<Set<number>>(new Set());

  const setSection = (i: number, section: ArticleSection) => onChange(replaceAt(sections, i, section));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">Article sections</h3>
        <p className="text-xs text-ink-faint">Build the page with the buttons: a heading, then any mix of content.</p>
      </div>

      <div className="mt-3 space-y-4">
        {sections.map((section, i) => {
          const isClosed = closed.has(i);
          return (
            <div key={i} className="rounded-xl border border-line bg-surface">
              <div className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-bg-alt px-3 py-2.5">
                <span className="rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-white">Section {i + 1}</span>
                <input
                  value={section.heading}
                  maxLength={200}
                  onChange={(e) => setSection(i, { ...section, heading: e.target.value })}
                  placeholder="Section heading"
                  aria-label={`Heading of section ${i + 1}`}
                  className={`${input} min-w-48 flex-1 font-semibold`}
                />
                <IconButton label="Move section up" onClick={() => onChange(move(sections, i, i - 1))} disabled={i === 0}>
                  <ArrowUp className="h-4 w-4" />
                </IconButton>
                <IconButton label="Move section down" onClick={() => onChange(move(sections, i, i + 1))} disabled={i === sections.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label={isClosed ? "Open section" : "Collapse section"}
                  onClick={() =>
                    setClosed((c) => {
                      const next = new Set(c);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })
                  }
                >
                  <ChevronDown className={`h-4 w-4 transition ${isClosed ? "-rotate-90" : ""}`} />
                </IconButton>
                <IconButton label="Delete section" onClick={() => onChange(removeAt(sections, i))} danger>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>

              {!isClosed && (
                <div className="space-y-3 p-3">
                  {section.blocks.length === 0 && (
                    <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-sm text-ink-faint">
                      Empty. Add some content below.
                    </p>
                  )}

                  {section.blocks.map((block, j) => {
                    const Icon = ICON[block.type];
                    const meta = BLOCK_TYPES.find((b) => b.type === block.type);
                    return (
                      <div key={j} className="rounded-lg border border-line p-3">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink">
                            <Icon className="h-3.5 w-3.5" />
                            {meta?.label}
                          </span>
                          <span className="ml-auto flex gap-1.5">
                            <IconButton label="Move up" onClick={() => setSection(i, { ...section, blocks: move(section.blocks, j, j - 1) })} disabled={j === 0}>
                              <ArrowUp className="h-4 w-4" />
                            </IconButton>
                            <IconButton label="Move down" onClick={() => setSection(i, { ...section, blocks: move(section.blocks, j, j + 1) })} disabled={j === section.blocks.length - 1}>
                              <ArrowDown className="h-4 w-4" />
                            </IconButton>
                            <IconButton label="Delete block" onClick={() => setSection(i, { ...section, blocks: removeAt(section.blocks, j) })} danger>
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          </span>
                        </div>
                        <BlockForm block={block} onChange={(b) => setSection(i, { ...section, blocks: replaceAt(section.blocks, j, b) })} />
                      </div>
                    );
                  })}

                  {section.blocks.length < MAX_BLOCKS && (
                    <div className="rounded-lg bg-bg-alt p-3">
                      <p className="mb-2 text-xs font-semibold text-ink">Add to this section</p>
                      <div className="flex flex-wrap gap-2">
                        {BLOCK_TYPES.map(({ type, label, hint }) => {
                          const Icon = ICON[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              title={hint}
                              onClick={() => setSection(i, { ...section, blocks: [...section.blocks, emptyBlock(type)] })}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sections.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
          No sections yet. Add the first one to start building the article.
        </p>
      )}

      {sections.length < MAX_SECTIONS && (
        <button
          type="button"
          onClick={() => onChange([...sections, { heading: "", blocks: [emptyBlock("paragraph")] }])}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Add section
        </button>
      )}
    </div>
  );
}
