/**
 * Rich text: one document format, one schema, shared by the editor and the
 * renderer.
 *
 * ## Why JSON and not HTML
 *
 * The tempting shortcut is to keep whatever HTML the editor produces and render
 * it with `dangerouslySetInnerHTML`. Two reasons not to, and both get harder to
 * undo the longer content exists:
 *
 * 1. **Stored XSS.** HTML from an editor is a string that a browser will
 *    execute. Any future admin compromise — or one careless paste — becomes a
 *    script running on every visitor's page. A JSON document cannot carry a
 *    node the schema below does not define, so the attack surface is the schema
 *    rather than the whole of HTML.
 * 2. **It is a one-way door.** Migrating JSON to HTML later is a render call.
 *    Migrating HTML back to JSON means parsing every document that was ever
 *    saved. Choosing now, while there is no content, costs nothing.
 *
 * Rendering happens on the server, from JSON, so body copy is in the initial
 * HTML. This site lives on organic search; content that only appears after
 * hydration is content a crawler may never weigh.
 *
 * ## One extension list
 *
 * `richTextExtensions` is the schema. The editor and `richTextToHtml` both
 * import it, because a renderer configured differently from the editor drops
 * nodes silently — the editor shows a table, the page shows nothing, and there
 * is no error anywhere. Keeping one array makes that failure impossible.
 *
 * ## Images: added 19 Sep, reversing the 5 Sep decision
 *
 * §11 Q5 of the 4 Sep plan ruled out an image node so this stayed decoupled
 * from the media pipeline while both were being built. That pipeline shipped in
 * the same cycle, so the reason has expired — and the practice module needs
 * figures in question stems, in options (an Abstract Reasoning option *is* a
 * diagram) and in worked solutions.
 *
 * Carrying figures in the document rather than in a question type is what keeps
 * text, image and mixed questions to one record shape. See
 * `docs/2026-09-19-exam-practice-module-plan.md` §3.
 *
 * Every other rich-text field on the site inherits this the moment it lands —
 * college content, articles and course detail can all carry figures now.
 */

import type { JSONContent } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { generateHTML } from "@tiptap/html";

/**
 * A TipTap/ProseMirror document.
 *
 * Built on TipTap's own `JSONContent` rather than a hand-written node union:
 * the schema is `richTextExtensions`, and a parallel type here would only drift
 * from it. Narrowing `type` to "doc" is what distinguishes a whole document
 * from the nodes inside one.
 */
export type RichTextDoc = JSONContent & { type: "doc" };

/**
 * The schema. Formatted text, tables, lists and figures.
 *
 * StarterKit in v3 already carries bold, italic, underline, headings, both
 * lists, blockquote and link — so the additions are tables and images.
 */
export const richTextExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    link: {
      openOnClick: false,
      // Anything not in this list is dropped rather than rendered — the reason
      // javascript: URLs never reach a page even if one is pasted in.
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: { rel: "noopener noreferrer nofollow" },
    },
  }),
  TableKit.configure({
    table: { resizable: false, HTMLAttributes: { class: "rich-table" } },
  }),
  /*
    `inline: false` — a figure is a block, never a character inside a sentence.
    Inline images in an exam question produce a stem whose line height jumps
    around the diagram, and there is no case in this content where a figure
    belongs mid-sentence.

    `allowBase64: false` on purpose. A pasted base64 image would inline
    megabytes into a document that is fetched on every render and cannot be
    cached, CDN-served or resized. Figures are uploads with URLs.

    Width and height ride along as attributes so the renderer can reserve the
    space before the file decodes. A question that reflows while it loads costs
    the candidate seconds, and seconds are what the whole exercise measures.
  */
  Image.configure({
    inline: false,
    allowBase64: false,
    HTMLAttributes: { class: "rich-figure" },
  }).extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: { default: null },
        height: { default: null },
      };
    },
  }),
];

/** An empty document — what a field holds before anyone types in it. */
export const emptyDoc = (): RichTextDoc => ({ type: "doc", content: [] });

/**
 * Is this document actually empty?
 *
 * This is the check the whole "tabs only appear when content exists" rule
 * (MOM §1.2) rests on, and the naive version is wrong. Opening a TipTap editor
 * and closing it without typing leaves `{doc: [{type: "paragraph"}]}` — one
 * empty paragraph, which is structurally non-empty. Testing `content.length`
 * would call that filled, and every untouched tab would render as a blank
 * panel on the public site.
 *
 * So: walk the document, and treat it as empty unless it holds either text with
 * a non-space character, or a node that means something without text — a table,
 * an image, a horizontal rule. A heading containing only spaces is empty; a
 * table with empty cells is not, because someone deliberately built it.
 */
const MEANINGFUL_WITHOUT_TEXT = new Set(["table", "image", "horizontalRule"]);

export function isRichTextEmpty(doc: RichTextDoc | null | undefined): boolean {
  if (!doc || !doc.content) return true;

  const hasSubstance = (node: unknown): boolean => {
    if (!node || typeof node !== "object") return false;
    const n = node as { type?: string; text?: string; content?: unknown[] };

    if (n.type === "text") return typeof n.text === "string" && n.text.trim().length > 0;
    if (n.type && MEANINGFUL_WITHOUT_TEXT.has(n.type)) return true;
    return Array.isArray(n.content) && n.content.some(hasSubstance);
  };

  return !doc.content.some(hasSubstance);
}

/**
 * JSON to HTML, for server rendering.
 *
 * Safe to place in the DOM because the output is generated from the schema
 * rather than passed through from a user — no node the extensions above do not
 * define can appear in it, and link protocols are filtered at the schema level.
 *
 * A malformed document renders as nothing rather than throwing: a single bad
 * record should cost one tab, not the whole page.
 */
export function richTextToHtml(doc: RichTextDoc | null | undefined): string {
  if (!doc || isRichTextEmpty(doc)) return "";
  try {
    return generateHTML(doc, richTextExtensions);
  } catch {
    return "";
  }
}

/**
 * A plain-text excerpt, for meta descriptions and list previews.
 * Nodes are joined with a space so words from adjacent blocks do not run
 * together into one nonsense token.
 */
export function richTextToPlain(doc: RichTextDoc | null | undefined, limit = 200): string {
  if (!doc?.content) return "";

  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === "text" && n.text) parts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  doc.content.forEach(walk);

  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

/**
 * Builds a document from plain paragraphs — used to seed mock content without
 * hand-writing ProseMirror JSON in the data files.
 */
export function docFromParagraphs(...paragraphs: string[]): RichTextDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}

/* ------------------------------------------------------------------ *
   Seed builders

   `docFromParagraphs` covers prose. Question content mixes prose with
   figures, so these compose instead: `doc(para(…), figure({…}))`.
   They exist for the mock data files — nothing at runtime builds
   documents by hand.
 * ------------------------------------------------------------------ */

/** One paragraph node. An empty string gives an empty paragraph. */
export function para(text: string): JSONContent {
  return { type: "paragraph", content: text ? [{ type: "text", text }] : [] };
}

/**
 * One figure node.
 *
 * `alt` is required rather than optional, and the type enforces it. On a public
 * page a missing alt is an accessibility failure; on an exam question it is
 * also a candidate who cannot answer at all. See the plan's §3 note on writing
 * alt text that describes a figure without solving it.
 *
 * `width` and `height` are the file's intrinsic pixel dimensions, used to
 * reserve layout space — not a display size.
 */
export function figure(attrs: {
  src: string;
  alt: string;
  width: number;
  height: number;
  title?: string;
}): JSONContent {
  return { type: "image", attrs };
}

/** Assembles nodes into a document. */
export function doc(...nodes: JSONContent[]): RichTextDoc {
  return { type: "doc", content: nodes };
}
