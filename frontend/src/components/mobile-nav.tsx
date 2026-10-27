"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MenuGroup } from "@/components/colleges-menu";

/**
 * The nav links below the `lg` breakpoint, behind a hamburger.
 *
 * Split out of site-header.tsx so the header itself stays a server component —
 * this is the only part of it that needs state.
 *
 * The panel is positioned against the <header>, which is `sticky` and therefore
 * already a containing block, so `top-full` drops it directly under the bar
 * without the header needing a `relative` of its own.
 */
export function MobileNav({
  links,
  menus = [],
}: {
  links: { label: string; href: string }[];
  /** The links that open as an expandable list of groups instead of going straight to a page. */
  menus?: { href: string; groups: MenuGroup[] }[];
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="ml-1 flex shrink-0 items-center justify-center rounded-lg border border-line p-2 text-ink-soft transition hover:border-brand hover:text-brand lg:hidden"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div
        ref={panelRef}
        id="mobile-nav-panel"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-lg lg:hidden"
      >
        <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2 sm:px-6">
          {links.map((link) => {
            const menu = menus.find((m) => m.href === link.href)?.groups ?? [];
            return menu.length > 0 ? (
              <details key={link.href} className="border-b border-line-soft">
                <summary className="cursor-pointer py-3 text-sm font-medium text-ink-soft hover:text-brand">{link.label}</summary>
                <div className="pb-2 pl-3">
                  {menu.map((group) => (
                    <details key={group.label}>
                      <summary className="cursor-pointer py-2 text-sm text-ink-soft hover:text-brand">{group.label}</summary>
                      <ul className="max-h-60 overflow-y-auto pb-2 pl-3">
                        {group.items.map((item) => (
                          <li key={item.href}>
                            <Link href={item.href} onClick={() => setOpen(false)} className={`block py-1.5 text-sm hover:text-brand ${item.children ? "font-semibold text-ink" : "text-ink-soft"}`}>
                              {item.label}
                            </Link>
                            {item.children && (
                              <ul className="pb-1 pl-3">
                                {item.children.map((child) => (
                                  <li key={child.href}>
                                    <Link href={child.href} onClick={() => setOpen(false)} className="block py-1 text-sm text-ink-soft hover:text-brand">
                                      {child.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </details>
            ) : (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-line-soft py-3 text-sm font-medium text-ink-soft transition last:border-b-0 hover:text-brand"
            >
              {link.label}
            </Link>
            );
          })}
        </nav>
      </div>
    </>
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
