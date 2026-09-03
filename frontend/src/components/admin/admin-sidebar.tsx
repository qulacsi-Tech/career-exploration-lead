"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav, findActiveItem, type AdminNavIcon } from "@/lib/admin-nav";

/*
  Stand-in for the signed-in user. There is no auth yet — the backend has no
  user model — so this is hard-coded rather than read from a session. When auth
  lands, pass the real user in as a prop; nothing else here needs to change.
*/
const currentUser = {
  name: "Asha Menon",
  role: "Administrator",
  initials: "AM",
};

/**
 * Sidebar nav: one collapsible group per section, sub-sections inside.
 *
 * Open state is derived from the route with an override map layered on top,
 * rather than held outright. Holding it outright is the obvious approach and it
 * is wrong here: the sidebar does not remount between admin pages, so a section
 * chosen at mount stays chosen and the section you just navigated into never
 * opens. Deriving it means the active section opens on every navigation, while
 * a section the user explicitly toggled keeps their choice.
 */
export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = findActiveItem(pathname);
  const activeSectionId = active?.section.id ?? "overview";
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isOpen = (id: string) => overrides[id] ?? id === activeSectionId;
  const toggle = (id: string) =>
    setOverrides((prev) => ({ ...prev, [id]: !(prev[id] ?? id === activeSectionId) }));

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Admin sections" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {adminNav.map((section) => {
        const open = isOpen(section.id);
        const hasActive = active?.section.id === section.id;

        return (
          <div key={section.id}>
            <button
              type="button"
              onClick={() => toggle(section.id)}
              aria-expanded={open}
              aria-controls={`admin-section-${section.id}`}
              className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition ${
                hasActive
                  ? "bg-brand-soft/60 text-brand-ink"
                  : "text-ink-soft hover:bg-bg-alt hover:text-ink"
              }`}
            >
              <SectionIcon
                name={section.icon}
                className={`h-[18px] w-[18px] shrink-0 transition ${
                  hasActive ? "text-brand" : "text-ink-faint group-hover:text-ink-soft"
                }`}
              />
              <span className="flex-1 truncate">{section.label}</span>
              <ChevronIcon
                className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-200 ${
                  open ? "rotate-90" : ""
                }`}
              />
            </button>

            {/*
              Animated with grid-rows 0fr -> 1fr, which transitions cleanly
              without measuring heights in JS. `inert` while collapsed keeps the
              hidden links out of the tab order and off screen readers — the
              rows stay in the DOM for the animation, so `hidden` is not an
              option and aria-hidden alone would leave them focusable.
            */}
            <div
              id={`admin-section-${section.id}`}
              inert={!open}
              className={`grid transition-all duration-200 ease-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <ul className="ml-[19px] overflow-hidden border-l border-line pl-2.5">
                {section.items.map((item) => {
                  const isActive = active?.item.href === item.href;
                  return (
                    <li key={item.href} className="relative">
                      {/* Rail marker: sits on the border-l above. */}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute -left-[11px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand"
                        />
                      )}
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={`my-0.5 flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition ${
                          isActive
                            ? "bg-brand-soft font-semibold text-brand-ink"
                            : "text-ink-soft hover:bg-bg-alt hover:text-ink"
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.phase === 2 && (
                          <span
                            title="Scheduled for phase 2"
                            className="shrink-0 rounded border border-line px-1 py-px text-[10px] font-medium text-ink-faint"
                          >
                            P2
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
      </nav>

      {/* Profile, pinned to the foot of the sidebar. */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
          >
            {currentUser.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{currentUser.name}</p>
            <p className="truncate text-xs text-ink-faint">{currentUser.role}</p>
          </div>
          {/*
            Returns to the login screen. It cannot tear down a session yet —
            there is none — so this is navigation only until auth exists.
          */}
          <Link
            href="/login"
            aria-label={`Log out, ${currentUser.name}`}
            title="Log out"
            className="shrink-0 rounded-md border border-line p-1.5 text-ink-faint transition hover:border-brand hover:text-brand"
          >
            <LogoutIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M12.5 6V4.5A1.5 1.5 0 0 0 11 3H5a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 5 17h6a1.5 1.5 0 0 0 1.5-1.5V14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10h9m0 0-2.5-2.5M17 10l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One stroked 20x20 glyph per section, matching the icons used site-wide. */
function SectionIcon({ name, className }: { name: AdminNavIcon; className?: string }) {
  const paths: Record<AdminNavIcon, React.ReactNode> = {
    overview: (
      <>
        <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
        <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
        <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
        <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
      </>
    ),
    content: (
      <>
        <path d="M10 2.5 2.5 6l7.5 3.5L17.5 6 10 2.5Z" strokeLinejoin="round" />
        <path d="M2.5 10 10 13.5 17.5 10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.5 14 10 17.5 17.5 14" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    sections: (
      <>
        <rect x="2.5" y="2.5" width="15" height="4.5" rx="1.5" />
        <rect x="2.5" y="9.5" width="15" height="8" rx="1.5" />
        <path d="M6 13h8" strokeLinecap="round" />
      </>
    ),
    leads: (
      <>
        <path d="M2.5 10.5h4l1.5 2.5h4l1.5-2.5h4" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M4.2 4.2h11.6l1.7 6.3v4a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-4l1.7-6.3Z"
          strokeLinejoin="round"
        />
      </>
    ),
    community: (
      <>
        <path d="M17 11.5a1.5 1.5 0 0 1-1.5 1.5H7l-3.5 3V5A1.5 1.5 0 0 1 5 3.5h10.5A1.5 1.5 0 0 1 17 5v6.5Z" strokeLinejoin="round" />
      </>
    ),
    seo: (
      <>
        <circle cx="9" cy="9" r="5.5" />
        <path d="M13.2 13.2 17.5 17.5" strokeLinecap="round" />
        <path d="M3.6 9h10.8M9 3.6c1.6 1.7 2.4 3.6 2.4 5.4S10.6 12.7 9 14.4c-1.6-1.7-2.4-3.6-2.4-5.4S7.4 5.3 9 3.6Z" />
      </>
    ),
    settings: (
      <>
        <circle cx="10" cy="10" r="2.6" />
        <path
          d="M15.9 12.2a1.3 1.3 0 0 0 .26 1.44l.05.05a1.6 1.6 0 1 1-2.26 2.26l-.05-.05a1.3 1.3 0 0 0-1.44-.26 1.3 1.3 0 0 0-.79 1.2v.13a1.6 1.6 0 1 1-3.2 0v-.07a1.3 1.3 0 0 0-.85-1.19 1.3 1.3 0 0 0-1.44.26l-.05.05a1.6 1.6 0 1 1-2.26-2.26l.05-.05a1.3 1.3 0 0 0 .26-1.44 1.3 1.3 0 0 0-1.2-.79H2.8a1.6 1.6 0 1 1 0-3.2h.07a1.3 1.3 0 0 0 1.19-.85 1.3 1.3 0 0 0-.26-1.44l-.05-.05a1.6 1.6 0 1 1 2.26-2.26l.05.05a1.3 1.3 0 0 0 1.44.26h.06a1.3 1.3 0 0 0 .79-1.2V2.8a1.6 1.6 0 1 1 3.2 0v.07a1.3 1.3 0 0 0 .79 1.2 1.3 1.3 0 0 0 1.44-.26l.05-.05a1.6 1.6 0 1 1 2.26 2.26l-.05.05a1.3 1.3 0 0 0-.26 1.44v.06a1.3 1.3 0 0 0 1.2.79h.13a1.6 1.6 0 1 1 0 3.2h-.07a1.3 1.3 0 0 0-1.19.79Z"
          strokeLinejoin="round"
        />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      {paths[name]}
    </svg>
  );
}
