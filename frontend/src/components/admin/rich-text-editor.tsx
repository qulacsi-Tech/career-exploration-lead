"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { richTextExtensions, type RichTextDoc, emptyDoc } from "@/lib/rich-text";

/**
 * The WYSIWYG editor for college and course body content (MOM §1.4).
 *
 * Reads its schema from lib/rich-text so the editor and the public renderer
 * cannot disagree about what a document may contain. It emits TipTap JSON
 * through `onChange` — see that module for why the format is JSON and not HTML.
 *
 * Not persisted this cycle: there is no content endpoint, so a document lives
 * as long as the modal is open. That is consistent with every other admin form
 * here, and it is what the plan flags as "a demonstrable prototype, not a
 * usable CMS".
 */

export function RichTextField({
  label,
  hint,
  value,
  onChange,
  minHeight = 220,
}: {
  label: string;
  hint?: string;
  value?: RichTextDoc;
  onChange?: (doc: RichTextDoc) => void;
  minHeight?: number;
}) {
  return (
    <div>
      <span className="block text-xs font-semibold text-ink">{label}</span>
      <RichTextEditor value={value} onChange={onChange} minHeight={minHeight} />
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  minHeight = 220,
}: {
  value?: RichTextDoc;
  onChange?: (doc: RichTextDoc) => void;
  minHeight?: number;
}) {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value ?? emptyDoc(),
    // The editor renders on the client only. Next would otherwise render it
    // once on the server and again on the client, and ProseMirror's own DOM
    // does not survive that comparison — this is TipTap's documented flag for
    // SSR rather than a workaround.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-body focus:outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getJSON() as RichTextDoc),
  });

  if (!editor) {
    // Reserve the height so the surrounding form does not jump when the editor
    // mounts.
    return (
      <div
        className="mt-1.5 animate-pulse rounded-lg border border-line bg-bg-alt"
        style={{ minHeight: minHeight + 44 }}
      />
    );
  }

  return (
    <div className="mt-1.5 overflow-hidden rounded-lg border border-line focus-within:border-brand">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="bg-bg px-3 py-2.5 text-sm text-ink" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Toolbar
 * ------------------------------------------------------------------ */

/**
 * A toolbar button.
 *
 * `onMouseDown` with preventDefault rather than `onClick`: clicking a button
 * would otherwise take focus out of the editor first, and a command applied
 * with no selection does nothing visible. This is why the formatting buttons
 * keep working while text stays selected.
 */
function ToolButton({
  label,
  title,
  active,
  disabled,
  onRun,
}: {
  label: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onRun: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onRun();
      }}
      className={`rounded px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-brand text-white" : "text-ink-soft hover:bg-brand-soft hover:text-brand"
      }`}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-4 w-px shrink-0 bg-line" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  // TipTap mutates the editor in place, so `isActive` reads do not re-render on
  // their own. Subscribing to transactions is what keeps the pressed states
  // honest as the caret moves.
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    editor.on("transaction", rerender);
    editor.on("selectionUpdate", rerender);
    return () => {
      editor.off("transaction", rerender);
      editor.off("selectionUpdate", rerender);
    };
  }, [editor]);

  const setLink = () => {
    const existing = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL", existing ?? "https://");

    // Cancel leaves the document alone; clearing the box removes the link.
    if (href === null) return;
    if (href.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  const inTable = editor.isActive("table");

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-bg-alt px-2 py-1.5">
      <ToolButton
        label={<strong>B</strong>}
        title="Bold"
        active={editor.isActive("bold")}
        onRun={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolButton
        label={<em>I</em>}
        title="Italic"
        active={editor.isActive("italic")}
        onRun={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolButton
        label={<span className="underline">U</span>}
        title="Underline"
        active={editor.isActive("underline")}
        onRun={() => editor.chain().focus().toggleUnderline().run()}
      />

      <Divider />

      {/* H1 is the page title, which the template owns — an editor putting a
          second one in body copy would break the document outline. */}
      {([2, 3, 4] as const).map((level) => (
        <ToolButton
          key={level}
          label={`H${level}`}
          title={`Heading ${level}`}
          active={editor.isActive("heading", { level })}
          onRun={() => editor.chain().focus().toggleHeading({ level }).run()}
        />
      ))}

      <Divider />

      <ToolButton
        label="• List"
        title="Bulleted list"
        active={editor.isActive("bulletList")}
        onRun={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolButton
        label="1. List"
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onRun={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolButton
        label="❝"
        title="Blockquote"
        active={editor.isActive("blockquote")}
        onRun={() => editor.chain().focus().toggleBlockquote().run()}
      />

      <Divider />

      <ToolButton
        label="Link"
        title="Add or edit link"
        active={editor.isActive("link")}
        onRun={setLink}
      />

      <Divider />

      <ToolButton
        label="Table"
        title="Insert table"
        onRun={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      {/* Row and column controls only mean anything inside a table, so they are
          disabled rather than hidden — a toolbar that changes shape as the
          caret moves is harder to use than one with dimmed buttons. */}
      <ToolButton
        label="+Row"
        title="Add row below"
        disabled={!inTable}
        onRun={() => editor.chain().focus().addRowAfter().run()}
      />
      <ToolButton
        label="+Col"
        title="Add column after"
        disabled={!inTable}
        onRun={() => editor.chain().focus().addColumnAfter().run()}
      />
      <ToolButton
        label="−Row"
        title="Delete row"
        disabled={!inTable}
        onRun={() => editor.chain().focus().deleteRow().run()}
      />
      <ToolButton
        label="−Col"
        title="Delete column"
        disabled={!inTable}
        onRun={() => editor.chain().focus().deleteColumn().run()}
      />
      <ToolButton
        label="✕ Table"
        title="Delete table"
        disabled={!inTable}
        onRun={() => editor.chain().focus().deleteTable().run()}
      />

      <Divider />

      <ToolButton
        label="Clear"
        title="Clear formatting"
        onRun={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      />

      <span className="ml-auto flex items-center gap-0.5">
        <ToolButton
          label="↶"
          title="Undo"
          disabled={!editor.can().undo()}
          onRun={() => editor.chain().focus().undo().run()}
        />
        <ToolButton
          label="↷"
          title="Redo"
          disabled={!editor.can().redo()}
          onRun={() => editor.chain().focus().redo().run()}
        />
      </span>
    </div>
  );
}
