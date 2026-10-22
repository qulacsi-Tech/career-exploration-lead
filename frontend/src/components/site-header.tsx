import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { MobileNav } from "@/components/mobile-nav";
import { HeaderAccount } from "@/components/header-account";

const navLinks = [
  { label: "Courses", href: "/courses" },
  { label: "Top Ranked Colleges", href: "/colleges?sort=ranking" },
  { label: "Compare", href: "/compare" },
  { label: "News", href: "/articles" },
  // { label: "Study Abroad", href: "/study-abroad" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Inline via SiteLogo rather than an <Image>: the badge reads --logo-*
            custom properties, so it recolours with the palette switcher instead
            of carrying a fixed plate colour. */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="TopCollegePath — home">
          {/* Tagline included, per the client's 5 Sep note. 3.66:1, so height
              drives width: 56px tall is 205px wide, 64px is 234px, 72px is
              263px — which the row has room for beside the nav. */}
          <SiteLogo className="h-14 w-auto sm:h-16 lg:h-[72px]" />
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm font-medium text-ink-soft lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* In flow so the header sizes to it; ml-auto pins it right on the
            narrower breakpoints where the nav above is hidden. Client component:
            reading the session here would make every public page dynamic. */}
        <HeaderAccount />

        {/* Below lg the links above are hidden, so they move in here. */}
        <MobileNav links={navLinks} />
      </div>
    </header>
  );
}
