import type { Metadata } from "next";
import { RouteMessage, RouteAction } from "@/components/ui/route-message";

export const metadata: Metadata = {
  title: "Page not found — TopCollegePath",
  // A 404 that gets indexed competes with the real pages for the same terms.
  robots: { index: false, follow: true },
};

/**
 * The 404 for everything inside the site's chrome.
 *
 * Next resolves `notFound()` to the nearest boundary, so this catches the
 * deliberate cases — a college slug that does not exist, a comparison naming a
 * college that has been removed, an article that has been unpublished — and
 * renders them inside the header and footer, which the root 404 cannot do from
 * outside this route group.
 */
export default function SiteNotFound() {
  return (
    <RouteMessage
      code="404"
      title="We couldn't find that page"
      description="The link may be out of date, or the college, course or exam it pointed to is no longer listed. Everything else is still where you left it."
    >
      <RouteAction href="/">Back to homepage</RouteAction>
    </RouteMessage>
  );
}
