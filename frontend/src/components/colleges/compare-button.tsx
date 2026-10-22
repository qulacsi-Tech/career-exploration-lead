"use client";

import { Check, GitCompareArrows } from "lucide-react";
import { useCompare } from "@/components/compare-tray";

/** Outline Compare button that drives the shared compare tray. */
/** `block` stretches it to fill its container, for the stacked actions on a listing card. */
export function CompareButton({ slug, name, block = false }: { slug: string; name: string; block?: boolean }) {
  const { isSelected, isFull, toggle } = useCompare();
  const selected = isSelected(slug);
  const disabled = !selected && isFull;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => toggle({ slug, name })}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        block ? "w-full justify-center py-2.5" : ""
      } ${
        selected ? "border-brand bg-brand-soft text-brand-ink" : "border-brand text-brand hover:bg-brand-soft"
      }`}
    >
      {selected ? <Check className="h-4 w-4" /> : <GitCompareArrows className="h-4 w-4" />}
      {selected ? "Added" : "Compare"}
    </button>
  );
}
