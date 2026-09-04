import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompareProvider } from "@/components/compare-tray";

/**
 * Chrome for the public marketing site. /admin and /login sit outside it.
 *
 * The compare provider wraps the whole site rather than the listings alone:
 * the tray has to survive navigating from a listing to a college page and back,
 * which it cannot do if the provider unmounts with the route.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <CompareProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {/* Clears the fixed tray so it never sits over the footer's last row. */}
        <div aria-hidden="true" className="h-16" />
      </div>
    </CompareProvider>
  );
}
