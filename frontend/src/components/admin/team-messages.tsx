"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bold, Check, CheckCheck, Code, ImagePlus, Italic, List, ListOrdered, Loader2, Megaphone, Quote, Send, Smile, Strikethrough, X } from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";
import { ChatText } from "@/components/chat-text";
import { confirmToast } from "@/components/ui/confirm-toast";
import { sendTeamMessage, uploadHomeImage } from "@/lib/admin-actions";
import { mediaUrl } from "@/lib/media";
import type { TeamMessageSent } from "@/lib/api";

const field = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

type ToolAction = "bold" | "italic" | "strike" | "mono" | "bullets" | "numbers" | "quote";

/** The formatting buttons, in WhatsApp's markup. */
const TOOLS: { label: string; icon: typeof Bold; action: ToolAction; hint?: string }[] = [
  { label: "Bold", icon: Bold, action: "bold", hint: "Ctrl+B" },
  { label: "Italic", icon: Italic, action: "italic", hint: "Ctrl+I" },
  { label: "Strikethrough", icon: Strikethrough, action: "strike" },
  { label: "Monospace", icon: Code, action: "mono" },
  { label: "Bulleted list", icon: List, action: "bullets" },
  { label: "Numbered list", icon: ListOrdered, action: "numbers" },
  { label: "Quote", icon: Quote, action: "quote" },
];

export type Audience = { kind: "all" } | { kind: "selected"; recipients: { id: string; email: string }[] };

/** The emoji picker's sets: the ones an education team reaches for most, then the everyday ones. */
const EMOJI: { name: string; list: string[] }[] = [
  { name: "Study", list: ["📚", "📖", "✏️", "📝", "🎓", "🏫", "🧠", "💡", "🔬", "🧮", "📐", "📊", "📈", "🗂️", "📅", "⏰", "⏳", "🗓️", "📌", "📍", "🔔", "📣", "📢", "✅", "☑️", "❗", "❓", "⚠️", "🔥", "⭐"] },
  { name: "Smileys", list: ["😀", "😃", "😄", "😁", "😊", "🙂", "😉", "😍", "🤩", "😎", "🤓", "🥳", "😇", "🤗", "🤔", "😅", "😂", "🙌", "😌", "😢", "😮", "😴", "🤞", "😬", "🫡", "🥹", "😤", "😱", "🤯", "😜"] },
  { name: "Hands", list: ["👍", "👎", "👏", "🙏", "🤝", "✌️", "👌", "💪", "👉", "👈", "👆", "👇", "✋", "🖐️", "🤙", "✍️", "🫶", "👊", "🤘", "☝️"] },
  { name: "Symbols", list: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🎉", "🎊", "🏆", "🥇", "🎯", "🚀", "✨", "💯", "🔑", "🎁", "💰", "🌟", "⚡", "🌈", "➡️", "⬅️", "🔗", "📩", "📞", "💬", "🆕", "🆓", "🔝", "✔️"] },
];

/**
 * Writing a message to subscribers, in the same style as WhatsApp: a newsletter to everyone subscribed, or a direct
 * message to the addresses picked. It lands in each one's Messages inbox under My account, with a bell notification.
 * The text takes WhatsApp's markup (*bold*, _italic_, ~strike~, ```mono```, lists, > quotes), with buttons and
 * Ctrl+B / Ctrl+I for it, an emoji picker, and a preview of the chat bubble the student will see.
 */
export function MessageComposer({ audience, onClose }: { audience: Audience; onClose: () => void }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiSet, setEmojiSet] = useState(0);
  const [pending, start] = useTransition();
  // An optional banner or picture shown above the text: its stored path once uploaded.
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const toAll = audience.kind === "all";
  const count = toAll ? null : audience.recipients.length;
  const ready = subject.trim().length >= 3 && body.trim().length > 0 && !done && !uploading;

  /** Uploads the chosen picture at once, so the preview shows exactly what will be sent. */
  const upload = async (file: File | undefined) => {
    if (picker.current) picker.current.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Use a JPG, PNG or WebP picture.");
    if (file.size > 4 * 1024 * 1024) return setError("The picture is larger than 4 MB. Compress it and try again.");
    setError("");
    setUploading(true);
    const form = new FormData();
    form.set("kind", "message");
    form.set("file", file);
    const result = await uploadHomeImage(form);
    setUploading(false);
    if ("error" in result) return setError(result.error);
    setImage(result.url);
  };

  /** Puts `before`/`after` around the selection (or at the cursor), and keeps the selection on the same text. */
  const wrap = (before: string, after = before) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const picked = value.slice(a, b);
    const next = value.slice(0, a) + before + picked + after + value.slice(b);
    setBody(next.slice(0, 8000));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + before.length, b + before.length);
    });
  };

  /** Starts each selected line (or the current one) with a list or quote marker. */
  const prefixLines = (marker: (i: number) => string) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const start = value.lastIndexOf("\n", a - 1) + 1;
    const endIdx = value.indexOf("\n", b);
    const end = endIdx === -1 ? value.length : endIdx;
    const lines = value.slice(start, end).split("\n").map((l, i) => marker(i) + l.replace(/^\s*([-*•]|\d+[.)]|>)\s+/, ""));
    const replaced = lines.join("\n");
    setBody((value.slice(0, start) + replaced + value.slice(end)).slice(0, 8000));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + replaced.length);
    });
  };

  const insert = (text: string) => {
    const el = area.current;
    if (!el) return setBody((b) => (b + text).slice(0, 8000));
    const { selectionStart: a, selectionEnd: b, value } = el;
    setBody((value.slice(0, a) + text + value.slice(b)).slice(0, 8000));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + text.length, a + text.length);
    });
  };

  // Escape closes the emoji picker before it closes the window.
  useEffect(() => {
    if (!emojiOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setEmojiOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [emojiOpen]);

  const send = async () => {
    if (toAll && !(await confirmToast("It goes to the Messages inbox of everyone who is subscribed.", { title: "Send to all subscribers?", confirmLabel: "Send to everyone" }))) return;
    start(async () => {
      setError("");
      const result = await sendTeamMessage({
        subject: subject.trim(),
        body: body.trim(),
        image: image || undefined,
        audience: audience.kind,
        subscriberIds: toAll ? undefined : audience.recipients.map((r) => r.id),
      });
      if ("error" in result) return setError(result.error);
      setDone(
        `Delivered to ${result.inApp} ${result.inApp === 1 ? "inbox" : "inboxes"}.` +
          (result.skipped ? ` ${result.skipped} ${result.skipped === 1 ? "address has" : "addresses have"} no account yet, so there was no inbox to send to.` : ""),
      );
      router.refresh();
    });
  };

  /** What a toolbar button does, run when it is clicked. */
  const apply = (action: ToolAction) => {
    if (action === "bold") wrap("*");
    else if (action === "italic") wrap("_");
    else if (action === "strike") wrap("~");
    else if (action === "mono") wrap("```");
    else if (action === "bullets") prefixLines(() => "- ");
    else if (action === "numbers") prefixLines((i) => `${i + 1}. `);
    else prefixLines(() => "> ");
  };

  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <AdminModal
      open
      onClose={onClose}
      size="seventy"
      title={toAll ? "Broadcast to all subscribers" : count === 1 ? "Message a subscriber" : `Message ${count} subscribers`}
      description="It arrives in their Messages inbox under My account, with a notification on the bell."
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
            {done ? "Close" : "Cancel"}
          </button>
          {!done && (
            <button type="button" onClick={send} disabled={!ready || pending} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
              <Send className="h-4 w-4" aria-hidden="true" />
              {pending ? "Sending…" : toAll ? "Send to everyone" : "Send"}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-bg-alt px-4 py-3 text-sm text-ink-soft">
          <span className="font-semibold text-ink">To: </span>
          {toAll ? (
            "everyone currently subscribed"
          ) : (
            <span className="break-all">
              {audience.recipients.slice(0, 6).map((r) => r.email).join(", ")}
              {audience.recipients.length > 6 && ` and ${audience.recipients.length - 6} more`}
            </span>
          )}
        </div>

        {done ? (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {done}
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
            <div className="space-y-4">
              <div>
                <label htmlFor="tm-subject" className="block text-xs font-semibold text-ink">Title <span className="text-brand">*</span></label>
                <input id="tm-subject" maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. 📣 CAT registration closes this Friday" className={field} />
              </div>

              <div>
                <label htmlFor="tm-body" className="block text-xs font-semibold text-ink">Message <span className="text-brand">*</span></label>
                <div className="mt-1.5 overflow-visible rounded-xl border border-line bg-bg focus-within:border-brand">
                  <div className="relative flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5" role="toolbar" aria-label="Formatting">
                    {TOOLS.map(({ label, icon: Icon, action, hint }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => apply(action)}
                        title={hint ? `${label} (${hint})` : label}
                        aria-label={label}
                        className="grid h-8 w-8 place-items-center rounded-md text-ink-soft transition hover:bg-bg-alt hover:text-brand"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ))}
                    <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((o) => !o)}
                      aria-expanded={emojiOpen}
                      aria-label="Emoji"
                      title="Emoji"
                      className={`grid h-8 w-8 place-items-center rounded-md transition hover:bg-bg-alt hover:text-brand ${emojiOpen ? "bg-bg-alt text-brand" : "text-ink-soft"}`}
                    >
                      <Smile className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {emojiOpen && (
                      <div className="absolute left-2 top-full z-30 mt-1 w-80 rounded-xl border border-line bg-surface p-2 shadow-xl">
                        <div className="flex gap-1 border-b border-line pb-1.5" role="tablist" aria-label="Emoji sets">
                          {EMOJI.map((set, i) => (
                            <button
                              key={set.name}
                              type="button"
                              role="tab"
                              aria-selected={emojiSet === i}
                              onClick={() => setEmojiSet(i)}
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${emojiSet === i ? "bg-brand-soft text-brand-ink" : "text-ink-soft hover:bg-bg-alt"}`}
                            >
                              {set.list[0]} {set.name}
                            </button>
                          ))}
                        </div>
                        <div className="mt-1.5 grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
                          {EMOJI[emojiSet].list.map((e) => (
                            <button key={e} type="button" onClick={() => insert(e)} aria-label={`Insert ${e}`} className="grid h-9 w-9 place-items-center rounded-md text-xl transition hover:scale-110 hover:bg-bg-alt">
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <textarea
                    id="tm-body"
                    ref={area}
                    rows={10}
                    maxLength={8000}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "i")) {
                        e.preventDefault();
                        wrap(e.key === "b" ? "*" : "_");
                      }
                    }}
                    placeholder={"Type a message. *bold*, _italic_, ~strike~ and lists work just like WhatsApp."}
                    className="block w-full resize-y rounded-b-xl bg-transparent px-3 py-2.5 text-sm leading-relaxed text-ink focus:outline-none"
                  />
                </div>
                <p className="mt-1 flex justify-between text-xs text-ink-faint">
                  <span>*bold* · _italic_ · ~strike~ · ```mono``` · - list · 1. list · &gt; quote</span>
                  <span>{body.length}/8000</span>
                </p>
              </div>
              <div>
                <p className="block text-xs font-semibold text-ink">
                  Banner or picture <span className="font-normal text-ink-faint">(optional)</span>
                </p>
                {image ? (
                  <div className="relative mt-1.5 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(image)} alt="The picture to be sent" className="max-h-40 rounded-xl border border-line" />
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      aria-label="Remove picture"
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-white transition hover:bg-ink"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={`mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-bg px-4 py-4 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand ${uploading ? "pointer-events-none opacity-70" : ""}`}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                    {uploading ? "Uploading…" : "Add a banner or picture"}
                    <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} />
                  </label>
                )}
                <p className="mt-1 text-xs text-ink-faint">JPG, PNG or WebP, up to 4 MB, at least 300 × 150 px. Shown above the message.</p>
              </div>

              {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
            </div>

            {/* What the student will see: a chat bubble from the team, on a chat-style background. */}
            <div>
              <p className="text-xs font-semibold text-ink">Preview</p>
              <div className="mt-1.5 flex min-h-[18rem] flex-col justify-end rounded-xl bg-[#efe7dd] bg-[radial-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] p-4 [background-size:14px_14px]">
                <div className="relative max-w-[92%] self-start rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-ink shadow-sm">
                  <p className="text-xs font-bold text-emerald-700">TopCollegePath team</p>
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(image)} alt="" className="mt-1.5 w-full rounded-lg" />
                  )}
                  {subject.trim() && <p className="mt-0.5 text-sm font-bold">{subject}</p>}
                  {body.trim() ? <ChatText text={body} className="mt-1" /> : <p className="mt-1 text-sm italic text-ink-faint">Your message will appear here.</p>}
                  <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ink-faint">
                    {now} <Check className="h-3 w-3" aria-hidden="true" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
}

function when(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** The messages the team has sent, newest first, with how many recipients have read each. */
export function SentMessages({ messages, total }: { messages: TeamMessageSent[]; total: number }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section aria-labelledby="sent-title" className="rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id="sent-title" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Megaphone className="h-5 w-5 text-brand" aria-hidden="true" /> Sent messages
        </h2>
        <span className="text-xs text-ink-faint">{total} sent{total > messages.length ? `, latest ${messages.length} shown` : ""}</span>
      </div>
      {messages.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-soft">Nothing sent yet. Broadcast to everyone, or tick subscribers and message them.</p>
      ) : (
        <ul className="divide-y divide-line">
          {messages.map((m) => (
            <li key={m.id} className="px-5 py-3">
              <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-left">
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{m.subject}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.audience === "all" ? "bg-brand-soft text-brand-ink" : "bg-bg-alt text-ink-soft"}`}>
                  {m.audience === "all" ? "Broadcast" : "Direct"}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                  <CheckCheck className={`h-3.5 w-3.5 ${m.read > 0 ? "text-sky-500" : "text-ink-faint"}`} aria-hidden="true" />
                  <span className="font-display font-extrabold text-ink">{m.read}</span>/{m.recipients} read
                </span>
                <span className="text-xs text-ink-faint">{when(m.sentAt)}</span>
              </button>
              {open === m.id && (
                <div className="mt-2 rounded-xl bg-[#efe7dd] p-3">
                  <div className="max-w-xl rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 shadow-sm">
                    {m.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(m.image)} alt="" loading="lazy" className="mb-2 w-full rounded-lg" />
                    )}
                    <ChatText text={m.body} />
                    <p className="mt-1 text-right text-[10px] text-ink-faint">Sent by {m.sentBy || "the team"}</p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
