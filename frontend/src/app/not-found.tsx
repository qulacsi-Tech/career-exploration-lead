import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RouteMessage, RouteAction } from "@/components/ui/route-message";

export const metadata: Metadata = {
  title: "Page not found — TopCollegePath",
  robots: { index: false, follow: true },
};

/**
 * The 404 for URLs that match no route at all.
 *
 * This one renders in the *root* layout, outside the `(site)` group, so it does
 * not inherit the header and footer — it has to draw them itself. Without that
 * a mistyped URL drops the visitor onto a bare page with no way back into the
 * site, which is the opposite of what a 404 is for.
 *
 * The compare tray is deliberately left out: it is a task in progress, and a
 * page that was never part of the site is not where it belongs.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <RouteMessage
          code="404"
          title="We couldn't find that page"
          description="The address may be mistyped, or the page may have moved. Here are the parts of the site people reach for most."
        >
          <RouteAction href="/">Back to homepage</RouteAction>
        </RouteMessage>
      </main>
      <SiteFooter />
    </div>
  );
}
