"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer, type Editor } from "@tiptap/react";
import { richTextExtensions, type RichTextDoc, emptyDoc } from "@/lib/rich-text";
import { ImageView, VideoView } from "@/components/admin/rich-text-media-views";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { parseVideoLink } from "@/components/admin/college-editor/tab-media";

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
  media = false,
}: {
  label: string;
  hint?: string;
  value?: RichTextDoc;
  onChange?: (doc: RichTextDoc) => void;
  minHeight?: number;
  /** Adds Image and Video to the toolbar, each with a "show in the Gallery" tick. */
  media?: boolean;
}) {
  return (
    <div>
      <span className="block text-xs font-semibold text-ink">{label}</span>
      <RichTextEditor value={value} onChange={onChange} minHeight={minHeight} media={media} />
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

/**
 * The same schema, but a picture and a video are drawn as they will look on the page, and open an editing bar when
 * clicked (see rich-text-media-views). The saved document is unchanged: it keeps the picture's stored path.
 */
const withView = (extension: (typeof richTextExtensions)[number], view: typeof ImageView) =>
  (extension as unknown as { extend: (config: object) => typeof extension }).extend({
    addNodeView() {
      return ReactNodeViewRenderer(view);
    },
  });

const editorExtensions = richTextExtensions.map((extension) =>
  extension.name === "image" ? withView(extension, ImageView) : extension.name === "video" ? withView(extension, VideoView) : extension,
);

export function RichTextEditor({
  value,
  onChange,
  minHeight = 220,
  media = false,
}: {
  value?: RichTextDoc;
  onChange?: (doc: RichTextDoc) => void;
  minHeight?: number;
  media?: boolean;
}) {
  const editor = useEditor({
    extensions: editorExtensions,
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
      <Toolbar editor={editor} media={media} />
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

function Toolbar({ editor, media = false }: { editor: Editor; media?: boolean }) {
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

  // Pictures and videos: a small panel under the toolbar to add one, and a Gallery tick for the one selected.
  const [panel, setPanel] = useState<"image" | "video" | null>(null);
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [link, setLink2] = useState("");
  const [title, setTitle] = useState("");
  const [inGallery, setInGallery] = useState(false);
  const parsed = parseVideoLink(link);
  const close = () => {
    setPanel(null);
    setSrc("");
    setAlt("");
    setLink2("");
    setTitle("");
    setInGallery(false);
  };
  const insertImage = () => {
    if (!src || alt.trim().length < 3) return;
    editor.chain().focus().insertContent({ type: "image", attrs: { src, alt: alt.trim(), gallery: inGallery } }).run();
    close();
  };
  const insertVideo = () => {
    if (!parsed) return;
    editor.chain().focus().insertContent({ type: "video", attrs: { ...parsed, title: title.trim(), gallery: inGallery } }).run();
    close();
  };
  const selectedMedia = editor.isActive("image") ? "image" : editor.isActive("video") ? "video" : null;

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

      {media && (
        <>
          <Divider />
          <ToolButton label="Image" title="Insert a picture" active={panel === "image"} onRun={() => setPanel(panel === "image" ? null : "image")} />
          <ToolButton label="Video" title="Insert a YouTube or Vimeo video" active={panel === "video"} onRun={() => setPanel(panel === "video" ? null : "video")} />
          {selectedMedia && (
            <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-ink">
              <input
                type="checkbox"
                checked={!!editor.getAttributes(selectedMedia).gallery}
                onChange={(e) => editor.chain().focus().updateAttributes(selectedMedia, { gallery: e.target.checked }).run()}
                className="h-3.5 w-3.5 accent-[var(--color-brand)]"
              />
              Also in Gallery
            </label>
          )}
        </>
      )}

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

      {media && panel && (
        <div className="mt-1.5 w-full space-y-3 rounded-lg border border-line bg-surface p-3">
          {panel === "image" ? (
            <>
              <ImageUploadField kind="gallery" value={src} onChange={setSrc} fallbackNote="Choose a picture to add." />
              <label className="block text-xs font-semibold text-ink">
                What the picture shows <span className="font-normal text-ink-faint">(at least 3 characters; read aloud and used by image search)</span>
                <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm font-normal text-ink focus:border-brand focus:outline-none" />
              </label>
            </>
          ) : (
            <>
              <label className="block text-xs font-semibold text-ink">
                YouTube or Vimeo link
                <input value={link} onChange={(e) => setLink2(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm font-normal text-ink focus:border-brand focus:outline-none" />
                {link.trim() !== "" && !parsed && <span className="mt-1 block font-normal text-red-700">That is not a YouTube or Vimeo link.</span>}
              </label>
              <label className="block text-xs font-semibold text-ink">
                Title <span className="font-normal text-ink-faint">(optional)</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm font-normal text-ink focus:border-brand focus:outline-none" />
              </label>
            </>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={inGallery} onChange={(e) => setInGallery(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
            Also show it in the Gallery tab
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={panel === "image" ? insertImage : insertVideo} disabled={panel === "image" ? !src || alt.trim().length < 3 : !parsed} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
              Insert {panel}
            </button>
            <button type="button" onClick={close} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
