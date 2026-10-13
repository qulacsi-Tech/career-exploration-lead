import type { RichTextDoc } from "@/lib/rich-text";

/**
 * What a rich-text section says, pulled out of the document so the page can
 * show it as tiles: the headings are the topics covered, the list items are
 * the key points. Plain text only; the full document still renders below.
 */
export type DocOutline = { topics: string[]; points: string[]; words: number };

type Node = { type?: string; text?: string; content?: Node[] };

const textOf = (node: Node): string =>
  node.type === "text" ? (node.text ?? "") : (node.content ?? []).map(textOf).join("");

export function docOutline(doc: RichTextDoc): DocOutline {
  const topics: string[] = [];
  const points: string[] = [];
  let words = 0;

  const walk = (node: Node) => {
    if (node.type === "heading") {
      const t = textOf(node).trim();
      if (t) topics.push(t);
    } else if (node.type === "listItem") {
      const t = textOf(node).trim();
      if (t) points.push(t);
    }
    if (node.type === "text" && node.text) words += node.text.trim().split(/\s+/).filter(Boolean).length;
    node.content?.forEach(walk);
  };
  (doc.content as Node[] | undefined)?.forEach(walk);

  return { topics: topics.slice(0, 8), points: points.slice(0, 8), words };
}
