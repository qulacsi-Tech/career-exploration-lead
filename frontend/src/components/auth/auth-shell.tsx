import Link from "next/link";
import { Check } from "lucide-react";
import { SiteLogo } from "@/components/site-logo";
import { mediaUrl } from "@/lib/media";
import type { AuthPageCopy } from "@/lib/api";

/**
 * The frame of the log in and sign up pages: a compact form on the left, and on the right a picture (or, with
 * none, a coloured panel) with a headline, a sentence and a few small cards over it. All of it comes from what
 * the admin set under Listings & Pages > Login & Signup. On a phone the panel is left out and the form fills
 * the screen. The panel stays in view while the form scrolls, so its text is never pushed below the fold.
 *
 * No marketing header or footer: nothing on the screen but the task. The logo is the way back to the site.
 */
export function AuthShell({ copy, children, wide = false }: { copy: AuthPageCopy; children: React.ReactNode; /** A wider form, for the sign up page, whose short fields sit two to a row. */ wide?: boolean }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      {/* The form side: a soft tinted background with blurred colour, the logo centred above a frosted card. */}
      <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-gradient-to-br from-brand-soft via-bg-alt to-gold-soft px-6 py-8 sm:px-12">
        <span aria-hidden className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand/15 blur-3xl" />
        <span aria-hidden className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-gold/25 blur-3xl" />
        <span
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: "radial-gradient(rgba(123,26,42,0.10) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />

        <Link href="/" aria-label="TopCollegePath — home" className="relative z-10 block w-fit">
          <SiteLogo className="h-16 w-auto" />
        </Link>

        <div className="relative z-10 flex w-full flex-1 items-center justify-center py-6">
          <div className={`w-full rounded-3xl border border-white/70 bg-white/80 p-7 shadow-[0_20px_60px_-20px_rgba(123,26,42,0.35)] backdrop-blur-md sm:p-8 ${wide ? "max-w-[30rem]" : "max-w-[25rem]"}`}>
            {children}
          </div>
        </div>

        <footer className="relative z-10 text-center text-xs text-ink-soft">
          <Link href="/" className="hover:text-brand">
            Back to site
          </Link>
          <span className="px-2">·</span>
          <Link href="/privacy" className="hover:text-brand">
            Privacy Policy
          </Link>
        </footer>
      </div>

      <AuthPanel copy={copy} className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:justify-center lg:p-8 [&>div]:h-[min(34rem,calc(100vh-4rem))] [&>div]:max-w-md" />
    </div>
  );
}

/** The picture side. Also drawn, smaller, by the admin's preview. */
export function AuthPanel({ copy, className = "hidden lg:block" }: { copy: AuthPageCopy; className?: string }) {
  return (
    <aside className={`p-3 ${className}`}>
      <div
        className="relative flex h-full min-h-[22rem] w-full flex-col justify-between overflow-hidden rounded-[1.75rem] text-white"
        style={
          copy.image
            ? undefined
            : {
                backgroundImage:
                  "radial-gradient(60% 45% at 88% 8%, rgba(255,196,120,0.45), transparent 62%), radial-gradient(50% 40% at 6% 92%, rgba(255,255,255,0.16), transparent 65%), linear-gradient(155deg, var(--color-brand-ink), var(--color-brand-dark) 55%, var(--color-brand))",
              }
        }
      >
        {copy.image ? (
          // Plain img: an upload comes from the API's origin, which is not in the optimiser's allow-list.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(copy.image)} alt={copy.imageAlt} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            {/* A faint dot grid, fading out towards the bottom where the text sits. */}
            <span
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
                maskImage: "linear-gradient(to bottom, black 20%, transparent 75%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 20%, transparent 75%)",
              }}
            />
            <span aria-hidden className="tcp-float absolute -right-20 top-24 h-64 w-64 rounded-full border border-white/15" />
            <span aria-hidden className="tcp-float-slow absolute -right-6 top-40 h-36 w-36 rounded-full border border-white/10" />
          </>
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

        {/* Small cards, staggered, so the panel has something to look at even with no picture. */}
        <ul className="relative z-10 space-y-2.5 p-6 pt-8 sm:p-7 sm:pt-10">
          {(copy.highlights ?? []).filter((line) => line.trim()).map((line, i) => (
            <li
              key={`${line}-${i}`}
              style={{ marginLeft: `${(i % 3) * 1.75}rem` }}
              className="flex w-fit max-w-full items-center gap-3 rounded-2xl border border-white/25 bg-white/15 px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/90 text-brand-ink">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {line}
            </li>
          ))}
        </ul>

        {(copy.panelTitle || copy.panelText) && (
          <div className="relative z-10 p-6 pt-0 sm:p-7 sm:pt-0">
            {copy.panelTitle && <p className="font-display text-2xl font-extrabold leading-tight xl:text-3xl">{copy.panelTitle}</p>}
            {copy.panelText && <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">{copy.panelText}</p>}
          </div>
        )}
      </div>
    </aside>
  );
}
