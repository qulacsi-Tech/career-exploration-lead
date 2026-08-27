import Link from "next/link";

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
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <CapIcon className="h-7 w-7 text-brand" />
          <span className="font-display leading-[0.95] text-brand">
            <span className="block text-base font-bold">college</span>
            <span className="block text-base font-bold">time</span>
          </span>
        </Link>

        <form
          action="/search"
          className="hidden flex-1 items-center rounded-full border border-line bg-bg-alt px-4 py-2 text-sm md:flex"
        >
          <SearchIcon className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            type="search"
            name="q"
            placeholder="Search by Course, Location, Fees etc"
            className="w-full bg-transparent px-3 text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </form>

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
          className="ml-auto flex shrink-0 flex-col items-center rounded-xl bg-brand px-4 py-2 text-center text-white transition hover:bg-brand-dark lg:ml-0"
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
      </div>

      <form
        action="/search"
        className="flex items-center gap-2 border-t border-line px-4 py-2 md:hidden"
      >
        <SearchIcon className="h-4 w-4 shrink-0 text-ink-faint" />
        <input
          type="search"
          name="q"
          placeholder="Search colleges, courses, exams"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </form>
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M18 18l-4-4" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 4L2 9l10 5 8-4v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
