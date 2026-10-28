import type { FieldChange } from "@/lib/api";

const text = (value: unknown, max = 220): string => {
  if (value === null || value === undefined || value === "") return "empty";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

/** What a list entry is called, for saying which were added, removed or edited. */
const nameOf = (item: unknown): string => {
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    for (const key of ["name", "title", "question", "author", "year", "exam", "url", "label"]) {
      if (o[key] !== undefined && o[key] !== null && o[key] !== "") return String(o[key]).slice(0, 60);
    }
    return JSON.stringify(item).slice(0, 60);
  }
  return String(item).slice(0, 60);
};

/** "detail.brochureUrl" as "Brochure url", "courses" as "Courses". */
const label = (path: string): string => {
  const last = path.split(".").pop() ?? path;
  const spaced = last.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

function ListChange({ before, after }: { before: unknown[]; after: unknown[] }) {
  const was = new Map(before.map((i) => [nameOf(i), JSON.stringify(i)]));
  const now = new Map(after.map((i) => [nameOf(i), JSON.stringify(i)]));
  const added = [...now.keys()].filter((k) => !was.has(k));
  const removed = [...was.keys()].filter((k) => !now.has(k));
  const edited = [...now.keys()].filter((k) => was.has(k) && was.get(k) !== now.get(k));
  const line = (title: string, names: string[], tone: string) =>
    names.length > 0 && (
      <p className="text-sm">
        <span className={`font-semibold ${tone}`}>{title}</span> <span className="text-ink-soft">{names.slice(0, 8).join(", ")}{names.length > 8 ? ` and ${names.length - 8} more` : ""}</span>
      </p>
    );
  return (
    <div className="space-y-1">
      <p className="text-xs text-ink-faint">
        {before.length} → {after.length} items
      </p>
      {line("Added:", added, "text-brand-ink")}
      {line("Removed:", removed, "text-red-700")}
      {line("Edited:", edited, "text-ink")}
      {added.length + removed.length + edited.length === 0 && <p className="text-sm text-ink-soft">Reordered.</p>}
    </div>
  );
}

/**
 * The changes a college admin wants, one field at a time, before and after. Lists (courses,
 * placements, gallery and so on) say what was added, removed and edited rather than printing both.
 */
export function DiffView({ diff }: { diff: FieldChange[] }) {
  if (diff.length === 0) return <p className="text-sm text-ink-soft">No differences from the live college.</p>;

  return (
    <ul className="divide-y divide-line-soft rounded-xl border border-line">
      {diff.map((change) => (
        <li key={change.path} className="grid gap-2 px-4 py-3 md:grid-cols-[12rem_1fr]">
          <div>
            <p className="text-sm font-semibold text-ink">{label(change.path)}</p>
            <p className="text-[11px] text-ink-faint">{change.path}</p>
          </div>
          {Array.isArray(change.before) && Array.isArray(change.after) ? (
            <ListChange before={change.before} after={change.after} />
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="min-w-0 break-words rounded-lg bg-red-50 px-3 py-2 text-red-900">
                <span className="mb-0.5 block text-[10px] font-semibold text-red-700">Now</span>
                {text(change.before)}
              </p>
              <p className="min-w-0 break-words rounded-lg bg-brand-soft px-3 py-2 text-brand-ink">
                <span className="mb-0.5 block text-[10px] font-semibold text-brand">Proposed</span>
                {text(change.after)}
              </p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
