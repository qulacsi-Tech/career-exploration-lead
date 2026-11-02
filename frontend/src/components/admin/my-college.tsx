"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CollegeRecordEditor } from "@/components/admin/college-editor/college-record-editor";
import { collegeRequestRemoval } from "@/lib/college-actions";

/**
 * A college admin's own college, opened straight away: the record is the page, in its tabs, ready to edit.
 * Changes are sent for approval rather than saved. While one request is waiting for review, a second cannot be
 * sent, so the record is shown for reading until it is decided or withdrawn. Asking for the college to be
 * removed is a quiet link underneath.
 */
export function MyCollege({ slug, hasPending }: { slug: string; hasPending: boolean }) {
  const router = useRouter();
  // Cancel, and a sent request, start the form again from what is saved.
  const [version, setVersion] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      {sent && (
        <p role="status" className="rounded-lg border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm text-brand-ink">
          {sent}
        </p>
      )}

      <CollegeRecordEditor
        key={`${version}-${hasPending}`}
        slug={slug}
        mode={hasPending ? "readonly" : "submit"}
        inline
        onClose={() => setVersion((v) => v + 1)}
        onSaved={() => {
          setSent("Your changes are sent for approval. The live college stays as it is until the team approves them.");
          router.refresh();
        }}
      />

      {!hasPending && !removing && (
        <p className="text-right">
          <button type="button" onClick={() => setRemoving(true)} className="text-sm text-ink-faint underline-offset-2 transition hover:text-red-700 hover:underline">
            Ask to remove the college
          </button>
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
    </div>
  );
}
