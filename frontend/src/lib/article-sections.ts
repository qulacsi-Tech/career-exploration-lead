/**
 * An article page is sections of blocks: each section has a heading and any mix
 * of paragraphs, lists, tables, steps, notes, quotes and key facts. The admin
 * builds them with buttons (no rich-text editor), and the site draws each block
 * its own way. Everything is plain text.
 */

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; style: "bullet" | "numbered" | "check"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "note"; tone: "info" | "tip" | "warning"; title: string; text: string }
  | { type: "quote"; text: string; by: string }
  | { type: "facts"; items: { label: string; value: string }[] }
  | {
      type: "image";
      /** /api/uploads/... or /images/... */
      src: string;
      alt: string;
      caption: string;
      size: ImageSize;
      shape: ImageShape;
      align: ImageAlign;
    };

export type ImageSize = "small" | "medium" | "large" | "full";
export type ImageShape = "original" | "landscape" | "wide" | "square" | "portrait" | "circle";
export type ImageAlign = "left" | "center" | "right";

export const IMAGE_SIZES: { value: ImageSize; label: string; box: string }[] = [
  { value: "small", label: "Small", box: "max-w-[14rem]" },
  { value: "medium", label: "Medium", box: "max-w-sm" },
  { value: "large", label: "Large", box: "max-w-xl" },
  { value: "full", label: "Full width", box: "max-w-full" },
];

export const IMAGE_SHAPES: { value: ImageShape; label: string; frame: string }[] = [
  { value: "original", label: "Original", frame: "rounded-xl" },
  { value: "landscape", label: "Landscape", frame: "aspect-[3/2] rounded-xl" },
  { value: "wide", label: "Wide", frame: "aspect-[2/1] rounded-xl" },
  { value: "square", label: "Square", frame: "aspect-square rounded-xl" },
  { value: "portrait", label: "Portrait", frame: "aspect-[3/4] rounded-xl" },
  { value: "circle", label: "Circle", frame: "aspect-square rounded-full" },
];

export const IMAGE_ALIGN_CLASS: Record<ImageAlign, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

export type ArticleSection = { heading: string; blocks: ArticleBlock[] };

export type BlockType = ArticleBlock["type"];

export const BLOCK_TYPES: { type: BlockType; label: string; hint: string }[] = [
  { type: "paragraph", label: "Text", hint: "A paragraph" },
  { type: "list", label: "Points", hint: "Bullets, numbers or ticks" },
  { type: "table", label: "Table", hint: "Rows and columns" },
  { type: "steps", label: "Steps", hint: "A process, step by step" },
  { type: "facts", label: "Key facts", hint: "Label and value pairs" },
  { type: "note", label: "Note", hint: "A highlighted tip or warning" },
  { type: "quote", label: "Quote", hint: "A pull quote" },
  { type: "image", label: "Image", hint: "A picture, in the size and shape you choose" },
];

export function emptyBlock(type: BlockType): ArticleBlock {
  switch (type) {
    case "paragraph":
      return { type, text: "" };
    case "list":
      return { type, style: "bullet", items: [""] };
    case "table":
      return { type, headers: ["", ""], rows: [["", ""]] };
    case "steps":
      return { type, items: [{ title: "", text: "" }] };
    case "note":
      return { type, tone: "info", title: "", text: "" };
    case "quote":
      return { type, text: "", by: "" };
    case "facts":
      return { type, items: [{ label: "", value: "" }] };
    case "image":
      return { type, src: "", alt: "", caption: "", size: "large", shape: "landscape", align: "center" };
  }
}

/** An article written before sections existed: its plain text becomes one section of paragraphs. */
export function sectionsFromBody(body: string): ArticleSection[] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.length ? [{ heading: "", blocks: paragraphs.map((text) => ({ type: "paragraph" as const, text })) }] : [];
}

const clean = (s: string) => s.trim();

/** Drops what was left blank so a half-built block never reaches the page. */
export function cleanSections(sections: ArticleSection[]): ArticleSection[] {
  const out: ArticleSection[] = [];
  for (const section of sections) {
    const blocks: ArticleBlock[] = [];
    for (const block of section.blocks) {
      switch (block.type) {
        case "paragraph": {
          const text = clean(block.text);
          if (text) blocks.push({ type: "paragraph", text });
          break;
        }
        case "list": {
          const items = block.items.map(clean).filter(Boolean);
          if (items.length) blocks.push({ type: "list", style: block.style, items });
          break;
        }
        case "table": {
          const headers = block.headers.map(clean);
          const rows = block.rows
            .map((row) => headers.map((_, i) => clean(row[i] ?? "")))
            .filter((row) => row.some(Boolean));
          // Columns that are blank in the header and in every row are dropped.
          const keep = headers.map((h, i) => h !== "" || rows.some((r) => r[i] !== ""));
          if (rows.length && keep.some(Boolean)) {
            blocks.push({
              type: "table",
              headers: headers.filter((_, i) => keep[i]),
              rows: rows.map((r) => r.filter((_, i) => keep[i])),
            });
          }
          break;
        }
        case "steps": {
          const items = block.items
            .map((i) => ({ title: clean(i.title), text: clean(i.text) }))
            .filter((i) => i.title || i.text)
            // A step needs a title; one with only a description borrows it.
            .map((i) => (i.title ? i : { title: i.text.slice(0, 80), text: "" }));
          if (items.length) blocks.push({ type: "steps", items });
          break;
        }
        case "note": {
          const text = clean(block.text);
          if (text) blocks.push({ type: "note", tone: block.tone, title: clean(block.title), text });
          break;
        }
        case "quote": {
          const text = clean(block.text);
          if (text) blocks.push({ type: "quote", text, by: clean(block.by) });
          break;
        }
        case "image": {
          if (block.src.trim()) {
            blocks.push({ ...block, src: block.src.trim(), alt: clean(block.alt), caption: clean(block.caption) });
          }
          break;
        }
        case "facts": {
          const items = block.items
            .map((i) => ({ label: clean(i.label), value: clean(i.value) }))
            .filter((i) => i.label && i.value);
          if (items.length) blocks.push({ type: "facts", items });
          break;
        }
      }
    }
    const heading = clean(section.heading);
    if (heading || blocks.length) out.push({ heading, blocks });
  }
  return out;
}

/** A readable anchor for a section heading: "Eligibility & fees" -> "eligibility-fees". */
export function sectionAnchor(heading: string, index: number): string {
  const slug = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `${slug}-${index + 1}` : `section-${index + 1}`;
}
