"use client";

import { useState } from "react";
import { CollegeRecordEditor } from "@/components/admin/college-editor/college-record-editor";

/** Opens the college record, view only, for a college admin. */
export function MyCollege({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Open the college record
      </button>
      {open && <CollegeRecordEditor slug={slug} mode="readonly" onClose={() => setOpen(false)} />}
    </>
  );
}
