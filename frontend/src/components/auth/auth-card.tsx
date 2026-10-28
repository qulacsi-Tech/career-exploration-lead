import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";

/** The plain centred card the other auth pages (choose a new password) sit in. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
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
