"use client";

import { confirmToast } from "@/components/ui/confirm-toast";
import { ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminActionResult } from "@/lib/admin-actions";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { AdminModal } from "@/components/admin/admin-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/** Humanizes raw API error strings into clear messages for editors. */
export function humanizeError(raw: string): string {
  const msg = raw.replace(/^body\s*(→|\.)\s*/, "");
  if (/^conductingBody:\s*Field required/i.test(msg)) return "Conducting body is required.";
  if (/^description:\s*Field required/i.test(msg)) return "Description is required.";
  if (/^name:\s*Field required/i.test(msg)) return "Name is required.";
  if (/^entries\.\d+\.rank:\s*Input should be greater than or equal to 1/i.test(msg)) return "Rank must be 1 or greater.";
  if (/^year:\s*Input should be greater than or equal to (\d+)/i.test(msg)) {
    const min = msg.match(/\d+/)?.[0] ?? "1990";
    return `Year must be ${min} or later.`;
  }
  if (/^year:\s*Input should be less than or equal to (\d+)/i.test(msg)) {
    const max = msg.match(/\d+/)?.[0] ?? "";
    return `Year cannot be in the future (max ${max}).`;
  }
  if (/^name:\s*String should have at least (\d+) characters?/i.test(msg)) {
    const count = msg.match(/\d+/)?.[0] ?? "2";
    return `Name must have at least ${count} characters.`;
  }
  if (/^name:\s*String should have at most (\d+) characters?/i.test(msg)) {
    const count = msg.match(/\d+/)?.[0] ?? "300";
    return `Name must have at most ${count} characters.`;
  }
  return msg;
}

/** A form's values as one string, so "has anything changed since it opened?" is a comparison. */
function snapshot(form: HTMLFormElement): string {
  return JSON.stringify(
    Array.from(new FormData(form).entries()).map(([key, value]) => [key, typeof value === "string" ? value : value.name])
  );
}

/**
 * Remembers a form's values shortly after it opens and answers whether they have changed since.
 * Compared by value, so hidden fields set by custom editors (images, page content) count too.
 */
function useDirtyCheck(formId: string, targetRef: { current: () => boolean }) {
  useEffect(() => {
    let initial: string | null = null;
    const timer = setTimeout(() => {
      const form = document.getElementById(formId);
      if (form instanceof HTMLFormElement) initial = snapshot(form);
    }, 80);
    targetRef.current = () => {
      const form = document.getElementById(formId);
      return initial !== null && form instanceof HTMLFormElement && snapshot(form) !== initial;
    };
    return () => {
      clearTimeout(timer);
      targetRef.current = () => false;
    };
  }, [formId, targetRef]);
}

const DISCARD_PROMPT = { title: "Discard unsaved changes?", confirmLabel: "Discard", cancelLabel: "Keep editing", tone: "danger" } as const;

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
  addSize,
  editSize = "full",
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
  onBulkDelete,
  onArchive,
  isArchived,
  headerActions,
}: {
  title: string;
  description: string;
  addLabel: string;
  addDescription?: string;
  /** The width of the Add dialog. A form with lists to pick from wants more than the default. */
  addSize?: "md" | "lg" | "wide" | "seventy" | "eighty";
  /** The width of the Edit dialog. Defaults to nearly the whole screen. */
  editSize?: "lg" | "wide" | "seventy" | "eighty" | "full";
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
  /** Deletes several records at once. Adds a checkbox column and a "Delete selected" bar. */
  onBulkDelete?: (rows: T[]) => Promise<AdminActionResult>;
  /** Hides a record instead of deleting it (or brings it back). Adds an Archive / Restore button to the edit form. */
  onArchive?: (row: T, archived: boolean) => Promise<AdminActionResult>;
  /** Whether a row is archived now, so the button reads Restore. */
  isArchived?: (row: T) => boolean;
  /** Persists a new record. Without it the add form closes without saving. */
  onAdd?: (data: FormData) => Promise<AdminActionResult>;
  /** Extra buttons beside the Add button in the page header. */
  headerActions?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<T | null>(null);
  const [editing, setEditing] = useState<T | null>(null);
  const [adding, setAdding] = useState(false);
  // Each dialog's "has it changed?" check, set by the form inside it.
  const editDirty = useRef<() => boolean>(() => false);
  const addDirty = useRef<() => boolean>(() => false);
  const [archiving, startArchive] = useTransition();
  const [prevRows, setPrevRows] = useState<T[]>(rows);
  const [localRows, setLocalRows] = useState<T[]>(rows);

  if (rows !== prevRows) {
    setPrevRows(rows);
    setLocalRows(rows);
  }

  const router = useRouter();
  const [flash, showFlash, clearFlash] = useFlash();
  const [deleting, startDelete] = useTransition();
  /*
    After a save the list is refetched from the server. Until that lands, `localRows`
    is updated optimistically so an Edit opened immediately loads the fresh values
    and does not write back stale values over the change just saved.
  */
  const [refreshing, startRefresh] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, startBulkDelete] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localRows;
    // "btech" should find "B.Tech": compare again with punctuation and spaces dropped.
    const squash = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    const loose = squash(q);
    return localRows.filter((row) =>
      searchIn(row).some((field) => field.toLowerCase().includes(q) || (loose !== "" && squash(field).includes(loose)))
    );
  }, [localRows, query, searchIn]);

  const shownKeys = filtered.map(getKey);
  const allShownSelected = shownKeys.length > 0 && shownKeys.every((key) => selected.has(key));
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of shownKeys) {
        if (allShownSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  const deleteSelected = async () => {
    if (!onBulkDelete) return;
    const chosen = rows.filter((row) => selected.has(getKey(row)));
    if (chosen.length === 0) return;
    if (!(await confirmToast("This cannot be undone.", { title: `Delete ${chosen.length} selected ${title.toLowerCase()}?`, confirmLabel: "Delete", tone: "danger" }))) return;
    clearFlash();
    startBulkDelete(async () => {
      const result = await onBulkDelete(chosen);
      if ("error" in result) {
        showFlash("error", result.error);
      } else {
        showFlash("ok", `${chosen.length} deleted.`);
        setSelected(new Set());
        router.refresh();
      }
    });
  };

  /** Closes a dialog, asking first when something typed in it would be lost. */
  const closeEdit = async () => {
    if (editDirty.current() && !(await confirmToast("What you changed has not been saved.", DISCARD_PROMPT))) return;
    setEditing(null);
  };
  const closeAdd = async () => {
    if (addDirty.current() && !(await confirmToast("What you entered has not been saved.", DISCARD_PROMPT))) return;
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <>
            {headerActions}
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              {addLabel}
            </button>
          </>
        }
      />

      {/* Floating, so it appearing and fading never moves the table under the cursor. */}
      <StatusMessage flash={flash} floating />
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
        {onBulkDelete && selected.size > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-bg-alt px-3 py-2 text-sm">
            <span className="text-ink-soft">{selected.size} selected</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={deleteSelected}
                className="rounded-lg border border-red-700 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                {bulkDeleting ? "Deleting…" : "Delete selected"}
              </button>
            </div>
          </div>
        )}

        {/* Wide table on a narrow screen: scroll it rather than wrap the cells. */}
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                {onBulkDelete && (
                  <th scope="col" className="w-8 py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={allShownSelected}
                      onChange={toggleAll}
                      aria-label={`Select all shown ${title.toLowerCase()}`}
                    />
                  </th>
                )}
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
                  {onBulkDelete && (
                    <td className="py-3 pr-3">
                      <input
                        type="checkbox"
                        checked={selected.has(getKey(row))}
                        onChange={() => toggle(getKey(row))}
                        aria-label={`Select ${searchIn(row)[0]}`}
                      />
                    </td>
                  )}
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
                        disabled={refreshing}
                        className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand-soft disabled:opacity-50"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (onBulkDelete ? 2 : 1)} className="py-10 text-center text-sm text-ink-soft">
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
        onClose={closeEdit}
        size={editSize}
        title={editing ? `Edit — ${searchIn(editing)[0]}` : ""}
        footer={
          <>
            {onDelete && editing && (
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (!(await confirmToast("This cannot be undone.", { title: `Delete “${searchIn(editing)[0]}”?`, confirmLabel: "Delete", tone: "danger" }))) return;
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
            {onArchive && editing && (
              <button
                type="button"
                disabled={archiving}
                onClick={async () => {
                  const archive = !(isArchived?.(editing) ?? false);
                  const name = searchIn(editing)[0];
                  const ok = await confirmToast(
                    archive ? "It disappears from the public site. You can restore it here at any time." : "It goes back on the public site.",
                    { title: `${archive ? "Archive" : "Restore"} “${name}”?`, confirmLabel: archive ? "Archive" : "Restore", tone: archive ? "danger" : "default" }
                  );
                  if (!ok) return;
                  clearFlash();
                  startArchive(async () => {
                    const result = await onArchive(editing, archive);
                    if ("error" in result) {
                      showFlash("error", result.error);
                    } else {
                      showFlash("ok", `${name} ${archive ? "archived" : "restored"}.`);
                      setEditing(null);
                      router.refresh();
                    }
                  });
                }}
                className={`${onDelete ? "" : "mr-auto "}rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-red-700 hover:text-red-700 disabled:opacity-50`}
              >
                {archiving ? "Working…" : isArchived?.(editing) ? "Restore" : "Archive"}
              </button>
            )}
            <button
              type="button"
              onClick={closeEdit}
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
            onDone={(saved, data) => {
              if (saved) {
                // The name just saved, not the one the row had when the dialog opened.
                const savedName = String(data?.get("name") ?? "").trim() || searchIn(editing)[0];
                showFlash("ok", `${savedName} saved.`);
                if (data) {
                  setLocalRows((prev) =>
                    prev.map((r) => {
                      if (getKey(r) === getKey(editing)) {
                        const updated: Record<string, unknown> = { ...(r as Record<string, unknown>) };
                        for (const [key, val] of data.entries()) {
                          if (typeof val === "string") {
                            if (key.startsWith("child:")) continue; // belongs to other rows, not this one
                            // A checkbox group posts one entry per ticked box, and the row holds a list: keep it a list.
                            if (Array.isArray(updated[key])) {
                              updated[key] = data.getAll(key).map(String);
                            } else if (key === "entries") {
                              try {
                                updated[key] = JSON.parse(val);
                              } catch {
                                updated[key] = val;
                              }
                            } else {
                              updated[key] = val;
                            }
                          }
                        }
                        return updated as T;
                      }
                      return r;
                    })
                  );
                }
                startRefresh(() => router.refresh());
              }
              setEditing(null);
            }}
            onSave={onSave ? (data) => onSave(editing, data) : undefined}
            dirtyRef={editDirty}
          />
        )}
      </AdminModal>

      <AdminModal
        open={adding}
        onClose={closeAdd}
        size={addSize}
        title={addLabel}
        description={addDescription}
        footer={
          <>
            <button
              type="button"
              onClick={closeAdd}
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
          dirtyRef={addDirty}
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
  dirtyRef,
}: {
  dirtyRef: { current: () => boolean };
  renderAddForm: () => ReactNode;
  onAdd?: (data: FormData) => Promise<AdminActionResult>;
  /** `saved` is false when the form closed without a save handler. */
  onDone: (saved: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useDirtyCheck("resource-add-form", dirtyRef);

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
          if ("error" in result) setError(humanizeError(result.error));
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
  dirtyRef,
}: {
  dirtyRef: { current: () => boolean };
  id: string;
  tabs: ResourceEditTab<T>[];
  row: T;
  /** `saved` is false when the form closed without a save handler. */
  onDone: (saved: boolean, data?: FormData) => void;
  onSave?: (data: FormData) => Promise<AdminActionResult>;
}) {
  const [active, setActive] = useState(tabs[0].id);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useDirtyCheck(id, dirtyRef);

  return (
    <form
      id={id}
      // Checked by hand below: the browser cannot point at a required field on a tab that is not showing.
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!onSave) {
          onDone(false);
          return;
        }
        setError(null);
        const form = e.currentTarget;
        const invalid = Array.from(form.elements).find(
          (el): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
            (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) &&
            el.willValidate &&
            !el.checkValidity()
        );
        if (invalid) {
          const panel = invalid.closest('[role="tabpanel"]');
          const tabId = panel?.id.replace(/^panel-/, "");
          const tab = tabs.find((t) => t.id === tabId);
          if (tab) setActive(tab.id);
          const labelText = (invalid.id && form.querySelector(`label[for="${CSS.escape(invalid.id)}"]`)?.textContent) || "";
          const fieldName = labelText.replace(/\s*\*\s*$/, "").trim() || "A field";
          setError(`${fieldName}${tab ? ` (on the ${tab.label} tab)` : ""}: ${invalid.validationMessage}`);
          // Tell assistive technology which field failed, and clear the flag as soon as it is edited.
          invalid.setAttribute("aria-invalid", "true");
          invalid.addEventListener("input", () => invalid.removeAttribute("aria-invalid"), { once: true });
          // Wait for the tab to show before focusing, or the browser has nothing visible to point at.
          requestAnimationFrame(() => {
            invalid.focus();
            invalid.reportValidity();
          });
          return;
        }
        const data = new FormData(form);
        startTransition(async () => {
          const result = await onSave(data);
          if ("error" in result) setError(humanizeError(result.error));
          else onDone(true, data);
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

      {/* Keep all tabs mounted in the DOM with hidden toggle so multi-tab edits
          are not lost when FormData is collected on form submission. */}
      <div className="min-h-0 flex-1 overflow-y-auto py-5">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            className={active === tab.id ? "" : "hidden"}
          >
            {tab.render(row)}
          </div>
        ))}
      </div>
    </form>
  );
}

/** Layout helper so every module's field grid matches. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
