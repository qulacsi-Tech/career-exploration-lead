import { ReactNode } from "react";

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "gold";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-bg-alt text-ink-soft border-line",
    brand: "bg-brand-soft text-brand-ink border-brand-soft",
    gold: "bg-gold-soft text-gold border-gold-soft",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
