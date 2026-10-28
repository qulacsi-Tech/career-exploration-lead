import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, GraduationCap, HeartHandshake, ImageIcon, Sparkles, Target, type LucideIcon } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import type { ListingSlot, SlotIcon, SlotPreset } from "@/lib/api";

/**
 * One item between the colleges, drawn from what the admin set in Banners & ads. The public listing
 * and the admin's live preview both use it, so what is previewed is what is shown. It has no state
 * and no browser-only code.
 *
 * `chips` are the one-tap filters for a filter strip (the page builds them from its own filter
 * options, so they keep whatever else is applied). `preview` draws a placeholder where an ad has no
 * picture yet, instead of nothing.
 */
export const PRESETS: Record<SlotPreset, { label: string; gradient: string; swatch: string; tone: "light" | "dark" }> = {
  brand: { label: "Brand", gradient: "from-brand-ink via-brand-dark to-brand", swatch: "bg-brand", tone: "light" },
  amber: { label: "Amber", gradient: "from-amber-700 via-amber-600 to-gold", swatch: "bg-amber-600", tone: "light" },
  emerald: { label: "Emerald", gradient: "from-emerald-800 via-emerald-700 to-teal-600", swatch: "bg-emerald-700", tone: "light" },
  ocean: { label: "Ocean", gradient: "from-sky-900 via-blue-800 to-sky-600", swatch: "bg-blue-800", tone: "light" },
  plum: { label: "Plum", gradient: "from-fuchsia-900 via-purple-800 to-pink-600", swatch: "bg-purple-800", tone: "light" },
  night: { label: "Night", gradient: "from-slate-950 via-slate-800 to-slate-600", swatch: "bg-slate-800", tone: "light" },
  cream: { label: "Cream", gradient: "from-amber-50 via-orange-50 to-rose-100", swatch: "bg-orange-100", tone: "dark" },
};

export const ICONS: Record<Exclude<SlotIcon, "none">, { label: string; Icon: LucideIcon }> = {
  compare: { label: "Compare", Icon: GitCompareArrows },
  handshake: { label: "Handshake", Icon: HeartHandshake },
  target: { label: "Target", Icon: Target },
  sparkles: { label: "Sparkles", Icon: Sparkles },
  graduation: { label: "Cap", Icon: GraduationCap },
};

/** The preset's gradient as a class, or the admin's own colours / picture as an inline style. */
function look(slot: ListingSlot): { className: string; style?: CSSProperties } {
  const from = slot.bgFrom || "#7b1a2a";
  switch (slot.bgMode) {
    case "gradient":
      return { className: "", style: { backgroundImage: `linear-gradient(to right, ${from}, ${slot.bgTo || from})` } };
    case "solid":
      return { className: "", style: { backgroundColor: from } };
    case "image": {
      if (!slot.bgImage) return { className: `bg-gradient-to-r ${PRESETS[slot.bgPreset].gradient}` };
      const veil = slot.tone === "light" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.65)";
      return {
        className: "bg-cover bg-center",
        style: { backgroundImage: `linear-gradient(${veil}, ${veil}), url(${mediaUrl(slot.bgImage)})` },
      };
    }
    default:
      return { className: `bg-gradient-to-r ${PRESETS[slot.bgPreset].gradient}` };
  }
}

const isExternal = (href: string) => href.startsWith("https://");

export function ListingSlotView({
  slot,
  chips = [],
  preview = false,
  compact = false,
}: {
  slot: ListingSlot;
  chips?: { label: string; href: string }[];
  preview?: boolean;
  /** For a narrow column: the banner stacks its text and button instead of lying them side by side. */
  compact?: boolean;
}) {
  if (slot.type === "ad") return <AdView slot={slot} preview={preview} />;
  if (slot.type === "filter") return <StripView slot={slot} chips={chips} />;
  return <BannerView slot={slot} compact={compact} />;
}

function BannerView({ slot, compact }: { slot: ListingSlot; compact: boolean }) {
  const { className, style } = look(slot);
  const light = slot.tone === "light";
  const Icon = slot.icon !== "none" ? ICONS[slot.icon].Icon : null;

  return (
    <aside
      aria-label="Promotion"
      style={style}
      className={`tcp-shimmer relative overflow-hidden rounded-2xl px-6 py-6 shadow-md ${compact ? "" : "sm:px-8"} ${className} ${light ? "text-white" : "text-ink"}`}
    >
      <span aria-hidden="true" className={`tcp-float absolute -right-6 -top-8 h-36 w-36 rounded-full ${light ? "bg-white/10" : "bg-brand/10"}`} />
      <span aria-hidden="true" className={`tcp-float-slow absolute bottom-[-2.5rem] right-32 h-24 w-24 rounded-full ${light ? "bg-white/10" : "bg-gold/20"}`} />
      {Icon && (
        <Icon aria-hidden="true" className={`tcp-float absolute right-8 top-1/2 hidden h-24 w-24 -translate-y-1/2 ${compact ? "" : "sm:block"} ${light ? "text-white/25" : "text-brand/20"}`} />
      )}
      {slot.sponsored && (
        <span className={`absolute right-3 top-2 text-[10px] font-semibold ${light ? "text-white/70" : "text-ink-faint"}`}>
          Sponsored
        </span>
      )}

      <div className={`relative flex flex-col gap-4 ${compact ? "" : "sm:flex-row sm:items-center sm:justify-between sm:pr-28"}`}>
        <div className="min-w-0">
          <p className={`font-display text-xl font-extrabold leading-tight ${compact ? "" : "sm:text-2xl"}`}>{slot.title || "Your headline here"}</p>
          {slot.text && <p className={`mt-1.5 max-w-xl text-sm leading-relaxed ${compact ? "" : "sm:text-base"} ${light ? "text-white/90" : "text-ink-soft"}`}>{slot.text}</p>}
        </div>
        {slot.buttonLabel && slot.buttonHref && (
          <Link
            href={slot.buttonHref}
            data-track={`promo_${slot.id}`}
            {...(isExternal(slot.buttonHref) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`tcp-wiggle inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${
              light ? "bg-white text-brand-ink" : "bg-brand text-white"
            }`}
          >
            {slot.buttonLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </aside>
  );
}

function StripView({ slot, chips }: { slot: ListingSlot; chips: { label: string; href: string }[] }) {
  if (chips.length === 0) return null;
  const { className, style } = look(slot);
  const light = slot.tone === "light";

  return (
    <section
      aria-label={slot.title || "Filters"}
      style={style}
      className={`relative overflow-hidden rounded-2xl px-5 py-5 shadow-md sm:px-7 ${className} ${light ? "text-white" : "text-ink"}`}
    >
      <span aria-hidden="true" className={`tcp-float-slow absolute -left-6 -top-6 h-24 w-24 rounded-full ${light ? "bg-white/10" : "bg-brand/10"}`} />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="shrink-0 lg:w-56">
          <p className="font-display text-lg font-extrabold leading-tight">{slot.title || "Filter"}</p>
          {slot.hint && <p className={`text-xs ${light ? "text-white/80" : "text-ink-soft"}`}>{slot.hint}</p>}
        </div>
        <ul className="flex flex-wrap gap-2">
          {chips.slice(0, slot.limit).map((chip) => (
            <li key={chip.label}>
              <Link
                href={chip.href}
                scroll={false}
                className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:scale-105 hover:shadow-md ${
                  light ? "bg-white text-brand-ink hover:bg-gold-soft" : "border border-line bg-surface text-brand-ink hover:bg-brand-soft"
                }`}
              >
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AdView({ slot, preview }: { slot: ListingSlot; preview: boolean }) {
  if (!slot.image) {
    if (!preview) return null;
    return (
      <div className="grid h-32 place-items-center rounded-2xl border-2 border-dashed border-line bg-bg-alt text-sm text-ink-faint">
        <span className="inline-flex items-center gap-2">
          <ImageIcon className="h-5 w-5" aria-hidden="true" /> Upload the ad picture
        </span>
      </div>
    );
  }

  const picture = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaUrl(slot.image)} alt={slot.alt || "Advertisement"} loading="lazy" className="block h-auto w-full object-cover" />
  );

  return (
    <aside aria-label="Advertisement" className="relative overflow-hidden rounded-2xl border border-line shadow-sm">
      {slot.href ? (
        <a
          href={slot.href}
          data-track={`ad_${slot.id}`}
          rel="sponsored noopener noreferrer"
          {...(isExternal(slot.href) ? { target: "_blank" } : {})}
          className="block transition hover:opacity-95"
        >
          {picture}
        </a>
      ) : (
        picture
      )}
      {slot.sponsored && (
        <span className="absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">Sponsored</span>
      )}
    </aside>
  );
}
