"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { EVENTS, flushNow, track, type TrackProps } from "@/lib/analytics";

const DEPTHS = [25, 50, 75, 100];

/**
 * Turns what the visitor does into tracking events, with no code in the pages.
 *
 * - A page view on every route change, including client-side navigation.
 * - A `click_cta` for any element carrying `data-track="name"`. The link text
 *   and address are read from the element; extra `data-track-*` attributes are
 *   added as properties.
 * - An `outbound_click` for a link to another site.
 * - How far down the page the visitor got, and how long they stayed on it.
 *
 * Everything goes through `track`, which does nothing until the visitor has
 * accepted analytics, so mounting this is always safe.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const pageStart = useRef({ at: 0, path: "" });
  const reached = useRef(new Set<number>());

  // Page views, and how long the previous page held the visitor.
  useEffect(() => {
    const sendView = () => {
      pageStart.current = { at: Date.now(), path: pathname };
      reached.current = new Set();
      track(EVENTS.pageView, { title: document.title });
    };

    // Document title is set after the route renders.
    const id = window.setTimeout(sendView, 0);
    // Accepting on this very page should still count the page they are on.
    const onConsent = (event: Event) => {
      if ((event as CustomEvent<string>).detail === "granted") sendView();
    };
    window.addEventListener("tcp-consent", onConsent);

    return () => {
      window.clearTimeout(id);
      window.removeEventListener("tcp-consent", onConsent);
      const { at, path } = pageStart.current;
      if (at && path === pathname) {
        const seconds = Math.round((Date.now() - at) / 1000);
        if (seconds >= 1) track(EVENTS.timeOnPage, { seconds: Math.min(seconds, 3600) });
      }
    };
  }, [pathname]);

  // Clicks, scrolling, and sending what is left as the page closes.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const tagged = target.closest<HTMLElement>("[data-track]");
      if (tagged) {
        const props: TrackProps = {
          cta: tagged.dataset.track,
          label: (tagged.innerText || tagged.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 60),
          href: tagged.getAttribute("href")?.slice(0, 200),
        };
        for (const [key, value] of Object.entries(tagged.dataset)) {
          if (key.startsWith("track") && key !== "track") {
            props[key.charAt(5).toLowerCase() + key.slice(6)] = value;
          }
        }
        track(EVENTS.clickCta, props);
        return;
      }

      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (link && link.host && link.host !== window.location.host && /^https?:$/.test(link.protocol)) {
        track(EVENTS.outboundClick, { href: `${link.host}${link.pathname}`.slice(0, 200) });
      }
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const room = document.documentElement.scrollHeight - window.innerHeight;
        if (room <= 0) return;
        const percent = (window.scrollY / room) * 100;
        for (const depth of DEPTHS) {
          if (percent >= depth - 1 && !reached.current.has(depth)) {
            reached.current.add(depth);
            track(EVENTS.scrollDepth, { depth });
          }
        }
      });
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") flushNow();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushNow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushNow);
    };
  }, []);

  return null;
}
