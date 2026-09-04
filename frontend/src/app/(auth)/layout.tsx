import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";

/**
 * Auth pages get no marketing header or footer — nothing on the screen but the
 * task. The logo doubles as the way back to the public site.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-alt">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="TopCollegePath — home" className="mx-auto mb-6 block w-fit">
            <SiteLogo className="h-16 w-auto" />
          </Link>
          {children}
        </div>
      </div>

      <footer className="pb-8 text-center text-xs text-ink-faint">
        <Link href="/" className="hover:text-brand">
          Back to site
        </Link>
        <span className="px-2">·</span>
        <Link href="/privacy" className="hover:text-brand">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
