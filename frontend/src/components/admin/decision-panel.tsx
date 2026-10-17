"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveChangeRequest, rejectChangeRequest } from "@/lib/admin-actions";

/**
 * Approve or reject a change request.
 *
 * Approving writes the edit to the live college. If the college was saved after the college admin
 * began, the API refuses until the reviewer confirms they know it will overwrite that. Rejecting
 * needs a reason, which the college admin receives and can answer.
 */
export function DecisionPanel({ id, kind, stale }: { id: string; kind: "edit" | "delete"; stale: boolean }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(stale);
  const [pending, startTransition] = useTransition();

  const approve = () => {
    const warning =
      kind === "delete"
        ? "Approve and permanently remove this college and everything on it?"
        : needsConfirm
          ? "The college was changed after this edit was written. Approving will overwrite those changes. Continue?"
          : null;
    if (warning && !window.confirm(warning)) return;
    setError(null);
    startTransition(async () => {
      const result = await approveChangeRequest(id, needsConfirm);
      if ("error" in result) {
        if (result.stale) setNeedsConfirm(true);
        return setError(result.error);
      }
      router.refresh();
    });
  };

  const reject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectChangeRequest(id, note);
      if ("error" in result) return setError(result.error);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-base font-semibold text-ink">Your decision</h2>

      {needsConfirm && kind === "edit" && (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          The live college was saved after this edit was written. Check the comparison: approving overwrites whatever was saved since.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {rejecting ? (
        <div className="space-y-3">
          <label htmlFor="reject-note" className="block text-xs font-semibold text-ink">
            Why? The college admin will see this.
          </label>
          <textarea
            id="reject-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={pending || note.trim().length < 3}
              onClick={reject}
              className="rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              {pending ? "Rejecting…" : "Reject"}
            </button>
            <button type="button" onClick={() => setRejecting(false)} className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink-soft hover:border-brand">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={approve}
            className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Applying…" : kind === "delete" ? "Approve removal" : "Approve and publish"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRejecting(true)}
            className="rounded-full border border-line px-6 py-2 text-sm font-semibold text-ink hover:border-red-300 hover:text-red-700 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
