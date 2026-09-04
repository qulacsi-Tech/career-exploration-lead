import { richTextToHtml, isRichTextEmpty, type RichTextDoc } from "@/lib/rich-text";

/**
 * Renders a rich text document on the public site.
 *
 * A server component on purpose: the HTML is generated during the render, so
 * body copy is in the document a crawler receives rather than appearing after
 * hydration. That is the whole reason the format is JSON rendered server-side
 * rather than an editor mounted on the page.
 *
 * `dangerouslySetInnerHTML` is safe here in a way it would not be with stored
 * HTML: the string comes from `generateHTML` walking a ProseMirror document
 * against the schema in lib/rich-text, so it cannot contain a node the schema
 * does not define, and link protocols are filtered there. The danger in that
 * API is passing through a string somebody else authored — this one is built
 * from structure.
 *
 * Empty documents render nothing at all, not an empty wrapper: callers use
 * `isRichTextEmpty` to decide whether a section exists, and a stray margin from
 * an empty div would give the game away.
 */
export function RichText({ doc, className }: { doc?: RichTextDoc | null; className?: string }) {
  if (isRichTextEmpty(doc)) return null;

  const html = richTextToHtml(doc);
  if (!html) return null;

  return (
    <div
      className={`rich-text ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
