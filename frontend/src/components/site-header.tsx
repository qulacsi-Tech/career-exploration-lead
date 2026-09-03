import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { MobileNav } from "@/components/mobile-nav";

const navLinks = [
  { label: "Courses", href: "/courses" },
  { label: "Top Ranked Colleges", href: "/colleges?sort=ranking" },
  { label: "More", href: "/articles" },
  { label: "Study Abroad", href: "/study-abroad" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Inline via SiteLogo rather than an <Image>: the badge reads --logo-*
            custom properties, so it recolours with the palette switcher instead
            of carrying a fixed plate colour. */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="TopCollegePath — home">
          {/* The lockup is 3.1:1, so height drives width: 64px tall is 200px
              wide, 72px is 224px. */}
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
            narrower breakpoints where the nav above is hidden. */}
        <Link
          href="/login"
          className="ml-auto flex shrink-0 flex-col items-center rounded-xl bg-brand px-3 py-2 text-center text-white transition hover:bg-brand-dark sm:px-4 lg:ml-0"
        >
          <span className="hidden text-[11px] font-bold leading-tight sm:block">
            Shaping your future!
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-white/90 sm:mt-0.5">
            Login / Register
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
              <ArrowIcon className="h-2.5 w-2.5" />
            </span>
          </span>
        </Link>

        {/* Below lg the links above are hidden, so they move in here. */}
        <MobileNav links={navLinks} />
      </div>
    </header>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
