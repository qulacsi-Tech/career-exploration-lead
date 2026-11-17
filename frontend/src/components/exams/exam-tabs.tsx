"use client";

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

/**
 * One tab. Most are a panel on the page, kept in the address as #id. One with `path` is a panel with an address of its
 * own (the Community tab on /exams/<id>-<slug>/community). One with `href` and no content is a link to such a tab
 * from a page that does not carry its panel.
 */
export type ExamTab = { id: string; label: string; count?: number; content?: ReactNode; path?: string; href?: string };

/**
 * The exam page's tabs, in the same style as a college's rail: a sticky row with an underline that slides to the
 * tab picked. Every panel is in the page's HTML (search engines read them all); only the one picked is shown.
 * The tab is kept in the address (#pattern), so a link can open the page on it and Back returns to it.
 */
export function ExamTabs({
  tabs,
  examSlug,
  basePath,
  initial,
}: {
  tabs: ExamTab[];
  examSlug: string;
  /** The exam's own address: the first tab is shown at it, the others at it + #id. */
  basePath: string;
  /** The tab open when the page loads. Absent: the first. */
  initial?: string;
}) {
  const first = initial ?? tabs[0]?.id ?? "";
  const [active, setActive] = useState(first);
  const reduceMotion = useReducedMotion();
  const railRef = useRef<HTMLUListElement>(null);

  // Open on the tab named in the address, and follow the address when it changes (Back, a link to #faqs).
  useEffect(() => {
    const read = () => {
      const id = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === id && t.content !== undefined)) setActive(id);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [tabs]);

  // Show the picked panel. Done on the page itself rather than by re-rendering: the panels are server-rendered
  // content that never changes, so switching tabs touches only the rail (see Panels below).
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-exam-panel]").forEach((el) => {
      el.hidden = el.dataset.examPanel !== active;
    });
  }, [active]);

  // Keep the picked tab in view on a narrow screen. Horizontal only, so the page does not jump.
  useEffect(() => {
    const rail = railRef.current;
    const el = rail?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!rail || !el) return;
    rail.scrollTo({ left: el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });
  }, [active, reduceMotion]);

  const pick = (id: string) => {
    setActive(id);
    const tab = tabs.find((t) => t.id === id);
    history.replaceState(null, "", tab?.path ?? (id === tabs[0]?.id ? basePath : `${basePath}#${id}`));
    // Bring the top of the panel into view when the visitor was further down.
    const panel = document.getElementById("exam-tab-panels");
    if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <nav aria-label="Exam sections" className="sticky top-[4.6rem] z-20 mt-6 lg:top-[5.6rem]">
        <ul
          ref={railRef}
          role="tablist"
          className="flex overflow-x-auto rounded-2xl border border-line bg-surface/95 px-2 shadow-sm backdrop-blur [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === active;
            const badge = tab.count !== undefined && tab.count > 0 && (
              <span className={`rounded-full px-1.5 text-[11px] font-bold ${isActive ? "bg-brand text-white" : "bg-bg-alt text-ink-soft"}`}>{tab.count}</span>
            );
            // A tab whose panel lives at its own address: a plain link there.
            if (tab.href && tab.content === undefined) {
              return (
                <li key={tab.id} className="shrink-0" role="presentation">
                  <Link href={tab.href} className="relative flex items-center gap-1.5 whitespace-nowrap px-3 py-4 text-sm text-ink-soft transition-colors hover:text-ink">
                    {tab.label}
                    {badge}
                  </Link>
                </li>
              );
            }
            return (
              <li key={tab.id} className="shrink-0" role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={`exam-tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`exam-panel-${tab.id}`}
                  onClick={() => pick(tab.id)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-4 text-sm transition-colors ${isActive ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"}`}
                >
                  {tab.label}
                  {badge}
                  {isActive && (
                    <motion.span
                      layoutId={`exam-rail-underline-${examSlug}`}
                      className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-full bg-brand-ink"
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <Panels tabs={tabs} first={first} />
    </>
  );
}

/**
 * Every panel, rendered once. Memoised on the tabs (the same array for the life of the page), so picking a tab does
 * not re-render the server-rendered content inside; the effect in ExamTabs only flips which panel is hidden.
 */
const Panels = memo(function Panels({ tabs, first }: { tabs: ExamTab[]; first: string }) {
  return (
    <div id="exam-tab-panels" className="scroll-mt-40 pt-6">
      {tabs.filter((tab) => tab.content !== undefined).map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`exam-panel-${tab.id}`}
          data-exam-panel={tab.id}
          aria-labelledby={`exam-tab-${tab.id}`}
          hidden={tab.id !== first}
          className="space-y-6"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
});
