"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { findActiveItem } from "@/lib/admin-nav";

/**
 * Admin chrome: a persistent sidebar from `lg` up, a drawer below it.
 *
 * Client-side because the sidebar tracks the route and the drawer holds state.
 * The page content itself is passed through as `children`, so individual admin
 * pages stay server components.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const active = findActiveItem(pathname);

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
    <div className="min-h-screen bg-bg-alt">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          className="rounded-lg border border-line p-2 text-ink-soft transition hover:border-brand hover:text-brand lg:hidden"
        >
          <MenuIcon />
        </button>

        <Link href="/admin" className="font-display text-sm font-bold text-ink">
          TopCollegePath <span className="text-ink-faint">Admin</span>
        </Link>

        {/* Identity lives in the sidebar profile block, not up here as well. */}
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            View site
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar. Sticky under the 56px top bar. */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-hidden border-r border-line bg-surface lg:block">
          <AdminSidebar />
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
                <AdminSidebar onNavigate={() => setDrawerOpen(false)} />
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
            {/* Breadcrumb from the same nav model, so it cannot drift from it. */}
            {active && (
              <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-faint">
                <ol className="flex items-center gap-1.5">
                  <li>{active.section.label}</li>
                  <li aria-hidden="true">/</li>
                  <li className="font-medium text-ink-soft">{active.item.label}</li>
                </ol>
              </nav>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
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
