"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ReviewSnippet, type ReviewSnippetItem } from "@/components/college/detail-ui";
import { useCollegeActions } from "@/components/college/college-actions";
import { recordReviewInterest } from "@/lib/college-engage-actions";

/** How many reviews anyone sees at first. The rest are for signed-in students. */
export const FREE_REVIEWS = 5;

/**
 * A college's reviews, newest first: the first five for everyone. Asking for the rest opens the sign-in or register
 * window for a visitor who is not signed in; once they are, the rest show and the interest is recorded as a lead.
 */
export function ReviewList({ reviews }: { reviews: ReviewSnippetItem[] }) {
  const actions = useCollegeActions();
  const [all, setAll] = useState(false);
  const shown = all ? reviews : reviews.slice(0, FREE_REVIEWS);
  const hidden = reviews.length - shown.length;

  const more = () => {
    const open = () => {
      setAll(true);
      if (actions) void recordReviewInterest(actions.slug, "reviews");
    };
    if (!actions) return open();
    void actions.ensureSignedIn("Sign in to read more reviews. It takes a minute.", open);
  };

  return (
    <div className="space-y-5">
      {shown.map((review, i) => (
        <ReviewSnippet key={`${review.id ?? review.author}-${i}`} review={review} />
      ))}
      {hidden > 0 && (
        <div className="text-center">
          <button
            type="button"
            onClick={more}
            className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft/50 px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-soft"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            {hidden} more {hidden === 1 ? "review" : "reviews"} available
          </button>
        </div>
      )}
    </div>
  );
}
