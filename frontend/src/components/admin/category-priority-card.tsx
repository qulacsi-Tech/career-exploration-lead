"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ListOrdered } from "lucide-react";
import { saveCategoryPriority } from "@/lib/admin-actions";
import type { CategoryPrioritySection } from "@/lib/api";
import { ordered } from "@/components/colleges-menu-data";
import { AdminSection } from "@/components/admin/admin-section";

const arrow = "grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-soft";

/**
 * Which category comes first in a homepage section. The categories are the Fields list's; the number beside each is
 * its priority (1 first). Until an order is saved they follow the Fields list. Saved with its own button.
 */
export function CategoryPriorityCard({ section, categories, initial, where }: { section: CategoryPrioritySection; categories: string[]; initial: string[]; where: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<string[]>(() => ordered(categories, initial, (c) => c));
  const [saved, setSaved] = useState<string[]>(initial);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(order) !== JSON.stringify(ordered(categories, saved, (c) => c));
  const isDefault = JSON.stringify(order) === JSON.stringify(categories);

  const move = (i: number, by: -1 | 1) => {
    const next = [...order];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    setMessage(null);
  };
  const save = (value: string[]) => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveCategoryPriority(section, value);
      if ("error" in result) return setMessage({ kind: "error", text: result.error });
      setSaved(value);
      setOrder(ordered(categories, value, (c) => c));
      setMessage({ kind: "ok", text: value.length === 0 ? "Back to the Fields list order." : "Saved. The homepage follows this order." });
      router.refresh();
    });
  };

  return (
    <AdminSection
      title="Category priority"
      description={`Which category comes first ${where}. 1 is first; the rest follow in this order. Without one they follow the Fields tab.`}
      actions={
        <>
          <button type="button" onClick={() => save([])} disabled={pending || (saved.length === 0 && isDefault)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-40">Reset</button>
          <button type="button" onClick={() => save(order)} disabled={pending || !dirty} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">{pending ? "Saving…" : "Save order"}</button>
        </>
      }
    >
      {message && <p role="status" className={`rounded-lg px-4 py-2.5 text-sm ${message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
      {categories.length === 0 ? (
        <p className="text-sm text-ink-soft">There are no categories yet. Add them on the Fields tab.</p>
      ) : (
        <ol className="max-w-xl divide-y divide-line-soft rounded-xl border border-line">
          {order.map((name, i) => (
            <li key={name} className="flex items-center gap-3 px-3 py-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{name}</span>
              <button type="button" aria-label={`Move ${name} up`} disabled={i === 0} onClick={() => move(i, -1)} className={arrow}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label={`Move ${name} down`} disabled={i === order.length - 1} onClick={() => move(i, 1)} className={arrow}><ArrowDown className="h-4 w-4" /></button>
            </li>
          ))}
        </ol>
      )}
      <p className="inline-flex items-center gap-1.5 text-xs text-ink-faint"><ListOrdered className="h-3.5 w-3.5" aria-hidden="true" /> A category with nothing in this section is skipped on the homepage.</p>
    </AdminSection>
  );
}
