import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EnquiryForm } from "@/components/enquiry-form";
import { homeStreams, locations } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Get Free Counselling",
  description:
    "Tell us what you are looking for and an admission counsellor will call you back with a shortlist.",
  // A lead form has nothing to rank for and should not compete with the
  // content pages that feed it.
  robots: { index: false, follow: true },
};

/**
 * The enquiry form every CTA on the site points at.
 *
 * The page stays a server component for its metadata and its data: the stream
 * and city options come from the same source the rest of the site uses, so the
 * form cannot drift from the directory. Only the form itself is a client
 * component, because only the form has state.
 */
export default function EnquiryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Get counselling" }]} />

      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
        Get Free Counselling
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Tell us what you are looking for and an admission counsellor will call you
        back — usually within a working day — with a shortlist of colleges that fit
        your score, budget and preferred city.
      </p>

      <EnquiryForm
        streams={homeStreams.map((s) => ({ slug: s.slug, name: s.name }))}
        cities={locations.map((l) => ({ slug: l.slug, name: l.name }))}
      />
    </div>
  );
}
