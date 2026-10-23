"use client";

import { useState } from "react";

/** The hero's guide text: two lines by default; "Read More" opens the rest in a box that scrolls inside the card. */
export function HeroIntro({ paragraphs }: { paragraphs: string[] }) {
  const [open, setOpen] = useState(false);
  const long = paragraphs.length > 1 || (paragraphs[0]?.length ?? 0) > 150;

  return (
    <div className="mt-1.5 text-base leading-snug text-ink">
      <div className={open ? "max-h-28 space-y-1 overflow-y-auto pr-2" : "line-clamp-2"}>
        {(open ? paragraphs : paragraphs.slice(0, 1)).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="font-medium text-brand hover:underline">
          {open ? "Show less" : "Read More"}
        </button>
      )}
    </div>
  );
}
