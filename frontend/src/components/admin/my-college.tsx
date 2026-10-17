"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CollegeRecordEditor } from "@/components/admin/college-editor/college-record-editor";
import { collegeRequestRemoval } from "@/lib/college-actions";

/**
 * What a college admin can do with their college: edit it (sent for approval), view it, or ask for it
 * to be removed. While one request is waiting for review, a second cannot be sent, so editing is
 * replaced by viewing until it is decided or withdrawn.
 */
export function MyCollege({ slug, hasPending }: { slug: string; hasPending: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"submit" | "readonly" | null>(null);
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {!hasPending && (
          <button
            type="button"
            onClick={() => setMode("submit")}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Edit your college
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode("readonly")}
          className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
        >
          View the record
        </button>
        {!hasPending && !removing && (
          <button
            type="button"
            onClick={() => setRemoving(true)}
            className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink-soft transition hover:border-red-300 hover:text-red-700"
          >
            Ask to remove the college
          </button>
        )}
      </div>

      {sent && (
        <p role="status" className="rounded-lg border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm text-brand-ink">
          {sent}
        </p>
      )}

      {removing && (
        <form
          className="max-w-xl space-y-3 rounded-2xl border border-red-200 bg-red-50/50 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await collegeRequestRemoval(reason);
              if ("error" in result) return setError(result.error);
              setRemoving(false);
              setReason("");
              setSent("Your request to remove the college has been sent. The college stays live until the team approves it.");
              router.refresh();
            });
          }}
        >
          <p className="text-sm font-semibold text-ink">Ask the team to remove your college</p>
          <p className="text-xs text-ink-soft">Nothing is removed yet. An admin reviews the request first and can ask you questions.</p>
          <label htmlFor="remove-reason" className="sr-only">
            Why you want it removed
          </label>
          <textarea
            id="remove-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Why do you want the college removed?"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending || reason.trim().length < 5}
              className="rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send request"}
            </button>
            <button type="button" onClick={() => setRemoving(false)} className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink-soft hover:border-brand">
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode && (
        <CollegeRecordEditor
          slug={slug}
          mode={mode}
          onClose={() => setMode(null)}
          onSaved={() => {
            setSent("Your changes are sent for approval. The live college stays as it is until the team approves them.");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
