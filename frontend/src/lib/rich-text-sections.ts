import type { RichTextDoc } from "@/lib/rich-text";

/**
 * A rich-text document cut into its sections, at its headings, so a long page (the Admissions tab) can be shown a
 * section at a time. Only the document's top-level headings split it: if it uses H2 for the courses and H3 inside
 * them, the H3s stay with their course. Whatever comes before the first heading is the "Overview".
 */
export type DocSection = { title: string; doc: RichTextDoc; text: string };

type Node = { type?: string; attrs?: { level?: number }; text?: string; content?: Node[] };

const textOf = (node: Node): string => (node.type === "text" ? (node.text ?? "") : (node.content ?? []).map(textOf).join(" "));

export function splitByHeadings(doc: RichTextDoc): DocSection[] {
  const nodes = ((doc as { content?: Node[] }).content ?? []) as Node[];
  const levels = nodes.filter((n) => n.type === "heading").map((n) => n.attrs?.level ?? 2);
  if (levels.length === 0) return [];
  const top = Math.min(...levels);

  const sections: { title: string; nodes: Node[] }[] = [];
  let current: { title: string; nodes: Node[] } | null = null;
  for (const node of nodes) {
    const startsOne = node.type === "heading" && (node.attrs?.level ?? 2) === top;
    if (startsOne) {
      current = { title: textOf(node).replace(/\s+/g, " ").trim() || "Section", nodes: [node] };
      sections.push(current);
    } else if (current) {
      current.nodes.push(node);
    } else {
      // Before the first heading.
      current = { title: "Overview", nodes: [node] };
      sections.push(current);
    }
  }
  return sections
    .map((s) => ({
      title: s.title,
      doc: { ...(doc as object), content: s.nodes } as RichTextDoc,
      text: s.nodes.map(textOf).join(" ").replace(/\s+/g, " ").trim(),
    }))
    // An "Overview" holding only a blank paragraph is not a section.
    .filter((s) => s.title !== "Overview" || s.text.length > 0);
}
