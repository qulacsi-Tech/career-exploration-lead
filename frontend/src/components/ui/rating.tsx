export function RatingPill({
  score,
  label,
}: {
  score: number;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gold-soft px-2 py-1 text-xs font-semibold text-gold">
      <StarIcon />
      {score.toFixed(1)}
      {label ? <span className="font-normal text-ink-soft">{label}</span> : null}
    </span>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.62 1-5.8-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  );
}
