"use client";

import { useState, useTransition } from "react";
import { resetAuthPage, saveAuthPage } from "@/lib/admin-actions";
import type { AuthPageCopy, AuthPages } from "@/lib/api";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { StatusMessage, useFlash } from "@/components/admin/status-message";
import { AuthPanel } from "@/components/auth/auth-shell";

type Page = "login" | "signup";

const TABS: { id: Page; label: string; blurb: string }[] = [
  { id: "login", label: "Log in", blurb: "/login" },
  { id: "signup", label: "Sign up", blurb: "/register" },
];

const INPUT = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

function Text({ label, value, onChange, max, hint, rows }: { label: string; value: string; onChange: (v: string) => void; max: number; hint?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink">{label}</span>
      {rows ? (
        <textarea rows={rows} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} className={INPUT} />
      ) : (
        <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} className={INPUT} />
      )}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

/**
 * The words and the picture of the log in and sign up pages. The form itself (its fields, checks and the
 * Google button) stays as it is; this changes what it says around it. Empty text hides that line, except
 * the heading and the button text, which the page needs. Reset puts back the original wording.
 */
export function AuthPagesAdmin({ initial, defaults }: { initial: AuthPages; defaults: AuthPages }) {
  const [tab, setTab] = useState<Page>("login");
  const [saved, setSaved] = useState<AuthPages>(initial);
  const [draft, setDraft] = useState<AuthPages>(initial);
  const [pending, startTransition] = useTransition();
  const [flash, showFlash] = useFlash();

  const copy = draft[tab];
  const set = (change: Partial<AuthPageCopy>) => setDraft((d) => ({ ...d, [tab]: { ...d[tab], ...change } }));
  const dirty = JSON.stringify(draft[tab]) !== JSON.stringify(saved[tab]);
  const isDefault = JSON.stringify(saved[tab]) === JSON.stringify(defaults[tab]);

  const save = () =>
    startTransition(async () => {
      const result = await saveAuthPage(tab, copy);
      if ("error" in result) return showFlash("error", result.error);
      setSaved((s) => ({ ...s, [tab]: copy }));
      showFlash("ok", `${TABS.find((t) => t.id === tab)?.label} page saved.`);
    });

  const reset = () =>
    startTransition(async () => {
      const result = await resetAuthPage(tab);
      if ("error" in result) return showFlash("error", result.error);
      setSaved((s) => ({ ...s, [tab]: defaults[tab] }));
      setDraft((d) => ({ ...d, [tab]: defaults[tab] }));
      showFlash("ok", "Back to the original wording.");
    });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Login & Signup"
        description="The words and the picture on the log in and sign up pages. The form, its checks and Google sign-in stay as they are."
      />
      <StatusMessage flash={flash} floating />

      <div role="tablist" aria-label="Page" className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === t.id ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-brand hover:text-brand"}`}
          >
            {t.label} <span className={`text-xs font-normal ${tab === t.id ? "text-white/80" : "text-ink-faint"}`}>{t.blurb}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <AdminSection title="Text" description="What the page says around the form.">
            <Text label="Heading" value={copy.heading} max={80} onChange={(heading) => set({ heading })} />
            <Text label="Line under the heading" value={copy.subheading} max={200} rows={2} onChange={(subheading) => set({ subheading })} hint="Leave empty to hide it." />
            {tab === "login" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Text label="Email label" value={copy.emailLabel} max={40} onChange={(emailLabel) => set({ emailLabel })} />
                <Text label="Email placeholder" value={copy.emailPlaceholder} max={60} onChange={(emailPlaceholder) => set({ emailPlaceholder })} />
                <Text label="Password label" value={copy.passwordLabel} max={40} onChange={(passwordLabel) => set({ passwordLabel })} />
                <Text label="Tick box text" value={copy.rememberLabel} max={60} onChange={(rememberLabel) => set({ rememberLabel })} hint="Leave empty to hide the tick box." />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Text label="Main button" value={copy.submitLabel} max={40} onChange={(submitLabel) => set({ submitLabel })} />
              <Text label="Text between the buttons" value={copy.dividerText} max={20} onChange={(dividerText) => set({ dividerText })} hint="Shown in the line above the Google button." />
              <Text label="Line at the bottom" value={copy.switchText} max={80} onChange={(switchText) => set({ switchText })} hint={tab === "login" ? "e.g. New here?" : "e.g. Already have an account?"} />
              <Text label="Link after it" value={copy.switchLink} max={60} onChange={(switchLink) => set({ switchLink })} hint={tab === "login" ? "Goes to the sign up page." : "Goes to the log in page."} />
            </div>
          </AdminSection>

          <AdminSection title="Picture panel" description="The picture on the right of the page (not shown on phones), with a headline and a sentence over it.">
            <div>
              <p className="text-xs font-semibold text-ink">Picture</p>
              <ImageUploadField kind="hero" value={copy.image} onChange={(image) => set({ image })} fallbackNote="The brand-coloured panel with soft shapes." />
            </div>
            <Text label="Picture description" value={copy.imageAlt} max={140} onChange={(imageAlt) => set({ imageAlt })} hint="For screen readers. Empty if the picture is only decoration." />
            <Text label="Headline over the picture" value={copy.panelTitle} max={100} onChange={(panelTitle) => set({ panelTitle })} hint="Leave empty to show no text." />
            <Text label="Sentence under it" value={copy.panelText} max={240} rows={2} onChange={(panelText) => set({ panelText })} />
            <Text
              label="Small cards on the picture"
              value={(copy.highlights ?? []).join("\n")}
              max={260}
              rows={4}
              onChange={(v) => set({ highlights: v.split("\n").slice(0, 4) })}
              hint="One line each, up to four, each at most 60 characters. Leave empty to show none."
            />
          </AdminSection>

          <div className="flex items-center justify-end gap-3">
            {!isDefault && !dirty && (
              <button type="button" onClick={reset} disabled={pending} className="mr-auto text-sm text-ink-soft underline hover:text-brand">
                Reset to the original wording
              </button>
            )}
            {dirty && (
              <button type="button" onClick={() => setDraft((d) => ({ ...d, [tab]: saved[tab] }))} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand">
                Discard changes
              </button>
            )}
            <button type="button" onClick={save} disabled={!dirty || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* What visitors will see: the form's words on the left, the picture panel on the right. */}
        <div className="min-w-0">
          <div className="sticky top-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <p className="border-b border-line-soft px-4 py-2 text-xs font-semibold text-ink-faint">Preview</p>
            <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <div className="space-y-3 p-5">
                <p className="font-display text-xl font-extrabold leading-tight text-ink">{copy.heading || "Heading"}</p>
                {copy.subheading && <p className="text-xs text-ink-soft">{copy.subheading}</p>}
                {tab === "login" && (
                  <>
                    <div>
                      <p className="text-[11px] font-semibold text-ink">{copy.emailLabel}</p>
                      <div className="mt-1 rounded-full border border-line bg-bg px-3 py-1.5 text-[11px] text-ink-faint">{copy.emailPlaceholder || " "}</div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-ink">{copy.passwordLabel}</p>
                      <div className="mt-1 rounded-full border border-line bg-bg px-3 py-1.5 text-[11px] text-ink-faint">••••••••</div>
                    </div>
                    {copy.rememberLabel && <p className="text-[11px] text-ink-soft">☐ {copy.rememberLabel}</p>}
                  </>
                )}
                {tab === "signup" && (
                  <>
                    {["Full name", "Email", "Password"].map((f) => (
                      <div key={f} className="rounded-full border border-line bg-bg px-3 py-1.5 text-[11px] text-ink-faint">{f}</div>
                    ))}
                  </>
                )}
                <div className="rounded-full bg-brand px-3 py-2 text-center text-[11px] font-semibold text-white">{copy.submitLabel || "Button"}</div>
                <div className="flex items-center gap-2 text-[10px] text-ink-faint">
                  <span className="h-px flex-1 bg-line" />
                  {copy.dividerText}
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div className="rounded-full border border-line px-3 py-1.5 text-center text-[11px] text-ink-soft">Continue with Google</div>
                {(copy.switchText || copy.switchLink) && (
                  <p className="text-[11px] text-ink-soft">
                    {copy.switchText} <span className="font-semibold text-ink underline">{copy.switchLink}</span>
                  </p>
                )}
              </div>
              <AuthPanel copy={copy} className="block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
