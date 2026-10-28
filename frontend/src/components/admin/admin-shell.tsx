"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminSidebar, type SidebarUser } from "@/components/admin/admin-sidebar";
import { adminNav, collegeAdminNav, findActiveItem } from "@/lib/admin-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { isCollegeAdmin } from "@/lib/roles";
import { BrandLogo } from "@/components/brand-logo";
import type { LogoConfig } from "@/lib/api";

/**
 * Admin chrome: a persistent sidebar from `lg` up, a drawer below it.
 *
 * Client-side because the sidebar tracks the route and the drawer holds state.
 * The page content itself is passed through as `children`, so individual admin
 * pages stay server components.
 */
export function AdminShell({ children, user, logo }: { children: ReactNode; user: SidebarUser; logo?: LogoConfig }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const active = findActiveItem(pathname, isCollegeAdmin(user.role) ? collegeAdminNav : adminNav);

  // The drawer overlays the page, so the body behind it should not scroll.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="relative isolate min-h-screen bg-gradient-to-br from-brand-soft/70 via-bg-alt to-gold-soft/60">
      {/* A soft wash of colour behind every admin screen, fixed so it stays put as the page scrolls. */}
      <span aria-hidden className="pointer-events-none fixed -left-24 top-10 -z-10 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <span aria-hidden className="pointer-events-none fixed -bottom-24 right-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-gold/20 blur-3xl" />
      {/* Top bar: the logo over the sidebar's column, then where you are, then the date, alerts and a way to the site. */}
      <header className="sticky top-0 z-30 flex h-[4.5rem] items-stretch border-b border-white/70 bg-white/85 shadow-[0_8px_30px_-24px_rgba(123,26,42,0.5)] backdrop-blur-md">
        <div className="relative flex items-center gap-3 overflow-hidden px-4 lg:w-64 lg:shrink-0 lg:justify-center lg:border-r lg:border-white/70 lg:px-5">
          {/* A faint grid behind the logo, fading out at the edges. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-soft/70 to-gold-soft/60"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(123,26,42,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(123,26,42,0.10) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
              maskImage: "radial-gradient(ellipse at center, black 35%, transparent 85%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 85%)",
            }}
          />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open admin menu"
            className="relative rounded-lg border border-line bg-white/80 p-2 text-ink-soft transition hover:border-brand hover:text-brand lg:hidden"
          >
            <MenuIcon />
          </button>
          <Link href="/admin" aria-label="TopCollegePath admin home" className="relative block shrink-0">
            <BrandLogo logo={logo} idPrefix="ctlogo-admin-bar" className="h-14 w-auto" />
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:px-6">
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs text-ink-faint">{active ? active.section.label : "Admin"}</p>
            <p className="truncate font-display text-lg font-bold leading-tight text-ink">{active ? active.item.label : "Admin panel"}</p>
          </div>
          <span className="hidden rounded-full border border-brand/20 bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-ink md:inline-block">
            {isCollegeAdmin(user.role) ? "College admin" : "Admin panel"}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center rounded-full border border-line bg-white/70 px-3 py-1.5 text-xs font-medium text-ink-soft xl:inline-flex">
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
            <NotificationBell viewAllHref="/admin/notifications" live />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              View site
              <ExternalLinkIcon />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar. Sticky under the 56px top bar. */}
        <aside className="sticky top-[4.5rem] hidden h-[calc(100vh-4.5rem)] w-64 shrink-0 overflow-hidden border-r border-white/70 bg-white/75 backdrop-blur-md lg:block">
          <AdminSidebar user={user} />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Admin sections"
              className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface shadow-xl"
            >
              <div className="flex h-14 items-center justify-between border-b border-line px-4">
                <span className="font-display text-sm font-bold text-ink">Sections</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close admin menu"
                  className="rounded-lg border border-line p-2 text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <AdminSidebar user={user} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          {/*
            Full width, minimal gutters — no max-width cap. A CMS is dense:
            listing tables, repeatable course/fee rows and side-by-side form
            fields all want the horizontal room, and centring the column at
            max-w-5xl left most of a desktop screen empty.
          */}
          <div className="px-4 py-5 sm:px-5 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M7 13 13 7M8 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}
