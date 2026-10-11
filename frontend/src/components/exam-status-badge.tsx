/**
 * The badge on an exam card: Upcoming, Live, Expired, or any words the admin typed.
 *
 * The three common ones have their own colour (amber, green with a pulsing dot, grey);
 * anything else is a plain dark badge. Matching ignores case, so "LIVE" and "live" are the same.
 */
export function examBadgeTone(label: string): "live" | "upcoming" | "expired" | "custom" {
  const key = label.trim().toLowerCase();
  if (key === "live" || key === "open" || key === "registration open") return "live";
  if (key === "upcoming" || key === "coming soon") return "upcoming";
  if (key === "expired" || key === "closed" || key === "ended") return "expired";
  return "custom";
}

const TONE: Record<ReturnType<typeof examBadgeTone>, string> = {
  live: "bg-emerald-600 text-white",
  upcoming: "bg-amber-500 text-white",
  expired: "bg-slate-600 text-white",
  custom: "bg-ink text-white",
};

export function ExamStatusBadge({ label, className = "" }: { label?: string | null; className?: string }) {
  const text = (label ?? "").trim();
  if (!text) return null;
  const tone = examBadgeTone(text);
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] shadow-sm ${TONE[tone]} ${className}`}>
      {tone === "live" && (
        <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      )}
      <span className="truncate">{text}</span>
    </span>
  );
}
