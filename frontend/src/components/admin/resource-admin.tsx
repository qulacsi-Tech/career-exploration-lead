"use client";

import { ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminActionResult } from "@/lib/admin-actions";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { AdminModal } from "@/components/admin/admin-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/**
 * The shared shell for a CMS module: header, search, table, and the add / view /
 * edit dialogs.
 *
 * Courses, Specialisations and Exams are the same screen with different columns
 * and fields. Writing each one out separately means three copies of the search,
 * the modal wiring and the empty state, drifting apart the first time one is
 * touched. Each module supplies its config; everything structural lives here.
 *
 * Colleges predates this and keeps its own bespoke screen — it has extra
 * behaviour these three do not need. Worth folding in if it grows further.
 */

export type ResourceColumn<T> = {
  key: string;
  label: string;
  /** Cell content. Kept a function so a module can render badges, not just text. */
  render: (row: T) => ReactNode;
  className?: string;
};

export type ResourceEditTab<T> = {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
};

export function ResourceAdmin<T>({
  title,
  description,
  addLabel,
  addDescription,
  rows,
  getKey,
  searchIn,
  searchPlaceholder,
  columns,
  renderView,
  editTabs,
  renderAddForm,
  onSave,
  onAdd,
  onDelete,
}: {
  title: string;
  description: string;
  addLabel: string;
  addDescription?: string;
  rows: T[];
  getKey: (row: T) => string;
  /** Fields the search box matches against. */
  searchIn: (row: T) => string[];
  searchPlaceholder?: string;
  columns: ResourceColumn<T>[];
  renderView: (row: T) => ReactNode;
  editTabs: ResourceEditTab<T>[];
  renderAddForm: () => ReactNode;
  /** Persists an edit. Without it the edit form closes without saving. */
  onSave?: (row: T, data: FormData) => Promise<AdminActionResult>;
  /** Deletes a record from its edit form. The server decides whether it is allowed. */
  onDelete?: (row: T) => Promise<AdminActionResult>;
  /** Persists a new record. Without it the add form closes without saving. */
  onAdd?: (data: FormData) => Promise<AdminActionResult>;
}) {
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<T | null>(null);
  const [editing, setEditing] = useState<T | null>(null);
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const [flash, showFlash, clearFlash] = useFlash();
  const [deleting, startDelete] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => searchIn(row).some((field) => field.toLowerCase().includes(q)));
  }, [rows, query, searchIn]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            {addLabel}
          </button>
        }
      />

      <StatusMessage flash={flash} />
      <AdminSection
        title={`All ${title.toLowerCase()}`}
        description={`${filtered.length} of ${rows.length} shown`}
        actions={
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? "Search"}
            aria-label={`Search ${title.toLowerCase()}`}
            className="w-56 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        }
      >
        {/* Wide table on a narrow screen: scroll it rather than wrap the cells. */}
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                {columns.map((column) => (
                  <th key={column.key} scope="col" className="py-2 pr-3 font-semibold">
                    {column.label}
                  </th>
                ))}
                <th scope="col" className="py-2 pl-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={getKey(row)} className="border-b border-line-soft last:border-b-0">
                  {columns.map((column) => (
                    <td key={column.key} className={`py-3 pr-3 ${column.className ?? "text-ink-soft"}`}>
                      {column.render(row)}
                    </td>
                  ))}
                  <td className="py-3 pl-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(row)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(row)}
                        className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand-soft"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="py-10 text-center text-sm text-ink-soft">
                    Nothing matches “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminModal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing ? searchIn(viewing)[0] : ""}
        footer={
          <>
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(viewing);
                setViewing(null);
              }}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Edit record
            </button>
          </>
        }
      >
        {viewing && renderView(viewing)}
      </AdminModal>

      <AdminModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="full"
        title={editing ? `Edit — ${searchIn(editing)[0]}` : ""}
        footer={
          <>
            {onDelete && editing && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  if (!window.confirm(`Delete “${searchIn(editing)[0]}”? This cannot be undone.`)) return;
                  clearFlash();
                  startDelete(async () => {
                    const result = await onDelete(editing);
                    if ("error" in result) {
                      showFlash("error", result.error);
                    } else {
                      showFlash("ok", `${searchIn(editing)[0]} deleted.`);
                      setEditing(null);
                      router.refresh();
                    }
                  });
                }}
                className="mr-auto rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-red-700 hover:text-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="resource-edit-form"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Save changes
            </button>
          </>
        }
      >
        {editing && (
          <TabbedForm
            id="resource-edit-form"
            tabs={editTabs}
            row={editing}
            onDone={(saved) => {
              if (saved) showFlash("ok", `${searchIn(editing)[0]} saved.`);
              setEditing(null);
            }}
            onSave={onSave ? (data) => onSave(editing, data) : undefined}
          />
        )}
      </AdminModal>

      <AdminModal
        open={adding}
        onClose={() => setAdding(false)}
        title={addLabel}
        description={addDescription}
        footer={
          <>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="resource-add-form"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Save
            </button>
          </>
        }
      >
        <AddForm
          renderAddForm={renderAddForm}
          onAdd={onAdd}
          onDone={(saved) => {
            if (saved) showFlash("ok", `Added to ${title.toLowerCase()}.`);
            setAdding(false);
          }}
        />
      </AdminModal>
    </div>
  );
}

function AddForm({
  renderAddForm,
  onAdd,
  onDone,
}: {
  renderAddForm: () => ReactNode;
  onAdd?: (data: FormData) => Promise<AdminActionResult>;
  /** `saved` is false when the form closed without a save handler. */
  onDone: (saved: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      id="resource-add-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!onAdd) {
          onDone(false);
          return;
        }
        setError(null);
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await onAdd(data);
          if ("error" in result) setError(result.error);
          else onDone(true);
        });
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {error && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {error}
        </p>
      )}
      {renderAddForm()}
      {pending && <p className="text-xs text-ink-soft sm:col-span-2">Saving…</p>}
    </form>
  );
}

function TabbedForm<T>({
  id,
  tabs,
  row,
  onDone,
  onSave,
}: {
  id: string;
  tabs: ResourceEditTab<T>[];
  row: T;
  /** `saved` is false when the form closed without a save handler. */
  onDone: (saved: boolean) => void;
  onSave?: (data: FormData) => Promise<AdminActionResult>;
}) {
  const [active, setActive] = useState(tabs[0].id);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault();
        if (!onSave) {
          onDone(false);
          return;
        }
        setError(null);
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await onSave(data);
          if ("error" in result) setError(result.error);
          else onDone(true);
        });
      }}
      className="flex h-full flex-col"
    >
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {pending && <p className="mb-3 text-xs text-ink-soft">Saving…</p>}
      <div
        role="tablist"
        aria-label="Record fields"
        className="-mx-5 flex gap-1 overflow-x-auto border-b border-line px-5"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              active === tab.id
                ? "border-brand text-brand"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Keyed for the same reason as the page-section tabs: one position,
          so React would otherwise reuse the previous tab's inputs. */}
      <div
        key={current.id}
        role="tabpanel"
        id={`panel-${current.id}`}
        aria-labelledby={`tab-${current.id}`}
        className="min-h-0 flex-1 overflow-y-auto py-5"
      >
        {current.render(row)}
      </div>
    </form>
  );
}

/** Layout helper so every module's field grid matches. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
