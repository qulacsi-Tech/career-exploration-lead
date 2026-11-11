import { Fragment, type ReactNode } from "react";

/**
 * Message text in WhatsApp's own markup, drawn as React (never as HTML, so nothing typed can run as code):
 *
 *   *bold*   _italic_   ~strike~   `code`   ```monospace```
 *   - item / * item    1. item    > quote    links are clickable
 *
 * Shared by the admin's composer preview, the sent history and the student's inbox, so all three look the same.
 */

const URL = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

/** The inline marks in one line of text. */
function inline(text: string, key: string): ReactNode[] {
  // Longest markers first, so ``` is not read as three `.
  const pattern = /```([^`]+)```|`([^`\n]+)`|\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(...links(text.slice(last, m.index), `${key}-t${i}`));
    const k = `${key}-m${i++}`;
    if (m[1] !== undefined || m[2] !== undefined) {
      out.push(
        <code key={k} className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.92em]">
          {m[1] ?? m[2]}
        </code>,
      );
    } else if (m[3] !== undefined) out.push(<strong key={k} className="font-bold">{inline(m[3], k)}</strong>);
    else if (m[4] !== undefined) out.push(<em key={k}>{inline(m[4], k)}</em>);
    else if (m[5] !== undefined) out.push(<s key={k}>{inline(m[5], k)}</s>);
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(...links(text.slice(last), `${key}-end`));
  return out;
}

/** Web addresses in plain text, as links that open in a new tab. */
function links(text: string, key: string): ReactNode[] {
  const parts = text.split(URL);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a key={`${key}-${i}`} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-brand underline underline-offset-2">
        {part}
      </a>
    ) : (
      <Fragment key={`${key}-${i}`}>{part}</Fragment>
    ),
  );
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "pre"; text: string };

function blocks(text: string): Block[] {
  const out: Block[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // A ``` block that spans lines.
    if (line.trim().startsWith("```") && !/```.*```/.test(line.trim())) {
      const body: string[] = [line.trim().slice(3)];
      while (++i < lines.length && !lines[i].includes("```")) body.push(lines[i]);
      if (i < lines.length) body.push(lines[i].slice(0, lines[i].indexOf("```")));
      out.push({ kind: "pre", text: body.join("\n").replace(/^\n|\n$/g, "") });
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const number = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const quote = line.match(/^\s*>\s?(.*)$/);
    const prev = out[out.length - 1];
    if (bullet) {
      if (prev?.kind === "ul") prev.items.push(bullet[1]);
      else out.push({ kind: "ul", items: [bullet[1]] });
    } else if (number) {
      if (prev?.kind === "ol") prev.items.push(number[1]);
      else out.push({ kind: "ol", items: [number[1]] });
    } else if (quote) {
      if (prev?.kind === "quote") prev.lines.push(quote[1]);
      else out.push({ kind: "quote", lines: [quote[1]] });
    } else if (line.trim() === "") {
      out.push({ kind: "p", lines: [] }); // a blank line ends the paragraph
    } else if (prev?.kind === "p" && prev.lines.length > 0) {
      prev.lines.push(line);
    } else {
      out.push({ kind: "p", lines: [line] });
    }
  }
  return out.filter((b) => !(b.kind === "p" && b.lines.length === 0));
}

/** One message's text, formatted. */
export function ChatText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-2 break-words text-sm leading-relaxed ${className}`}>
      {blocks(text).map((b, i) => {
        const key = `b${i}`;
        switch (b.kind) {
          case "pre":
            return (
              <pre key={key} className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/5 px-3 py-2 font-mono text-[0.92em]">
                {b.text}
              </pre>
            );
          case "ul":
            return (
              <ul key={key} className="list-disc space-y-0.5 pl-5">
                {b.items.map((item, j) => (
                  <li key={j}>{inline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="list-decimal space-y-0.5 pl-5">
                {b.items.map((item, j) => (
                  <li key={j}>{inline(item, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={key} className="border-l-4 border-brand/40 pl-3 italic text-ink-soft">
                {b.lines.map((l, j) => (
                  <p key={j}>{inline(l, `${key}-${j}`)}</p>
                ))}
              </blockquote>
            );
          default:
            return (
              <p key={key}>
                {b.lines.map((l, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {inline(l, `${key}-${j}`)}
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
