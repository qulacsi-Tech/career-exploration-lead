import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { MobileNav } from "@/components/mobile-nav";
import { HeaderAccount } from "@/components/header-account";
import { CollegesMenu } from "@/components/colleges-menu";
import { getCollegesMenu } from "@/components/colleges-menu-data";
import { getCoursesMenu } from "@/components/courses-menu-data";
import { HEADER_HREF, loadSiteChrome, visibleHeaderItems } from "@/lib/site-chrome";

export async function SiteHeader() {
  // The logo, and the order and wording of the links, as set under Navigation > Header & Footer.
  const [collegesMenu, coursesMenu, chrome] = await Promise.all([getCollegesMenu(), getCoursesMenu(), loadSiteChrome()]);
  const navLinks = visibleHeaderItems(chrome);
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
          <BrandLogo logo={chrome.headerLogo} className="h-14 w-auto sm:h-16 lg:h-[72px]" />
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm font-medium text-ink-soft lg:flex">
          {navLinks.map((link) =>
            link.id === "colleges" ? (
              <CollegesMenu key={link.id} label={link.label} href={link.href} groups={collegesMenu} />
            ) : link.id === "courses" ? (
              <CollegesMenu key={link.id} label={link.label} href={link.href} groups={coursesMenu} />
            ) : (
              <Link key={link.id} href={link.href} className="hover:text-brand">
                {link.label}
              </Link>
            ),
          )}
        </nav>

        {/* In flow so the header sizes to it; ml-auto pins it right on the
            narrower breakpoints where the nav above is hidden. Client component:
            reading the session here would make every public page dynamic. */}
        <HeaderAccount />

        {/* Below lg the links above are hidden, so they move in here. */}
        <MobileNav
          links={navLinks.map((l) => ({ label: l.label, href: l.href }))}
          menus={[{ href: HEADER_HREF.colleges, groups: collegesMenu }, { href: HEADER_HREF.courses, groups: coursesMenu }]}
        />
      </div>
    </header>
  );
}
