"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry-form";

/**
 * The enquiry dialog on a college page.
 *
 * It opens when the address carries `?enquire=1` (the Recommended programs cards link
 * here), and starts the message with the programme from `?program=`. Closing it takes
 * those two words off the address, so a refresh or the Back button does not bring it
 * back. The `#courses` part of the same address is what scrolls the page to the
 * Courses & Fees card behind it, when the college has one.
 */
export function CollegeEnquiryModal({
  collegeSlug,
  collegeName,
  stream,
  streams,
  cities,
}: {
  collegeSlug: string;
  collegeName: string;
  /** The college's own category, e.g. Management. Chosen in the form to begin with. */
  stream: string;
  streams: { slug: string; name: string }[];
  cities: { slug: string; name: string }[];
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const open = params.get("enquire") === "1";
  const program = (params.get("program") ?? "").slice(0, 200);

  const close = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("enquire");
    next.delete("program");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  if (!open) return null;

  const match = streams.find((s) => s.name.toLowerCase() === stream.toLowerCase() || s.slug === stream.toLowerCase());
  const message = program
    ? `I would like to know more about ${program} at ${collegeName}: fees, eligibility and admission dates.`
    : `I would like to know more about admission at ${collegeName}.`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-start sm:px-4 sm:pt-[5vh]">
      <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="college-enquiry-title"
        className="relative flex max-h-[min(86vh,46rem)] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:max-w-xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 id="college-enquiry-title" className="font-display text-xl font-semibold text-ink">
              {program ? `Ask about ${program}` : "Ask about admission"}
            </h2>
            <p className="mt-1 truncate text-sm text-ink-soft">{collegeName}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-brand hover:text-brand"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5">
          <EnquiryForm
            bare
            streams={streams}
            cities={cities}
            collegeSlug={collegeSlug}
            defaultStream={match?.slug ?? ""}
            defaultMessage={message}
            source="college-programme"
          />
        </div>
      </div>
    </div>
  );
}
