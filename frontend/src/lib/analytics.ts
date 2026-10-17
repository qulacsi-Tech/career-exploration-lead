/**
 * The browser side of visitor tracking.
 *
 * Nothing is recorded until the visitor accepts analytics. Accepting creates an
 * anonymous visitor id (a first-party cookie) and starts queuing events;
 * declining deletes the id and queues nothing. Events go in batches to this
 * site's own /collect route, which adds the signed-in student's identity on the
 * server (the session cookie never reaches JavaScript) and forwards them to the
 * API. Sent on the page's way out with sendBeacon so a click that leaves the
 * page is not lost.
 *
 * Use `track("name", { ...props })` from any client code. For plain buttons and
 * links prefer the data-track attribute, which the AnalyticsProvider turns into
 * a `click_cta` event without any code in the component.
 */

import {
  ANALYTICS_COOKIE_MAX_AGE_SECONDS,
  CONSENT_COOKIE,
  VISITOR_COOKIE,
  type Consent,
} from "@/lib/analytics-cookies";

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

type QueuedEvent = { name: string; path: string; ts: number; props: TrackProps };

const SESSION_KEY = "tcp_session";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const FLUSH_AFTER_MS = 3000;
const FLUSH_AT = 10;
const MAX_QUEUE = 100;
const COLLECT_URL = "/collect";

/** Every event name the site sends, in one place so names cannot drift. */
export const EVENTS = {
  pageView: "page_view",
  clickCta: "click_cta",
  outboundClick: "outbound_click",
  scrollDepth: "scroll_depth",
  timeOnPage: "time_on_page",
  search: "search",
  compareAdd: "compare_add",
  compareRemove: "compare_remove",
  formStart: "form_start",
  formSubmit: "form_submit",
  formError: "form_error",
} as const;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function readCookie(name: string): string | null {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ANALYTICS_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const value = readCookie(CONSENT_COOKIE);
  return value === "granted" || value === "denied" ? value : null;
}

/** Records the visitor's choice. Accepting starts tracking; declining forgets the id and drops anything queued. */
export function setConsent(choice: Consent) {
  writeCookie(CONSENT_COOKIE, choice);
  if (choice === "denied") {
    queue = [];
    deleteCookie(VISITOR_COOKIE);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage blocked: nothing to clear */
    }
  }
  window.dispatchEvent(new CustomEvent("tcp-consent", { detail: choice }));
}

function visitorId(): string {
  let id = readCookie(VISITOR_COOKIE);
  if (!id) {
    id = crypto.randomUUID();
    writeCookie(VISITOR_COOKIE, id);
  }
  return id;
}

type Session = { id: string; last: number; landing: string; referrer: string; utm: Record<string, string> };

/** The current visit. A new one starts after 30 minutes of nothing, and remembers where it began. */
function session(): Session {
  const now = Date.now();
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Session;
      if (now - parsed.last < SESSION_IDLE_MS) {
        parsed.last = now;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch {
    /* storage blocked or corrupt: start a fresh visit below */
  }

  const params = new URLSearchParams(window.location.search);
  const fresh: Session = {
    id: crypto.randomUUID(),
    last: now,
    landing: window.location.pathname,
    referrer: document.referrer,
    utm: {
      utmSource: params.get("utm_source") ?? "",
      utmMedium: params.get("utm_medium") ?? "",
      utmCampaign: params.get("utm_campaign") ?? "",
    },
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
  } catch {
    /* the visit still works, it just cannot survive a reload */
  }
  return fresh;
}

function flush(useBeacon = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0 || getConsent() !== "granted") {
    queue = [];
    return;
  }

  const current = session();
  const body = JSON.stringify({
    visitorId: visitorId(),
    sessionId: current.id,
    context: { landing: current.landing, referrer: current.referrer, ...current.utm },
    events: queue.splice(0, 50),
  });

  if (useBeacon && navigator.sendBeacon?.(COLLECT_URL, new Blob([body], { type: "application/json" }))) return;
  fetch(COLLECT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

/** Records one event. Does nothing until the visitor has accepted analytics. */
export function track(name: string, props: TrackProps = {}) {
  if (typeof window === "undefined" || getConsent() !== "granted") return;
  // The admin panel is not the public site: never record what staff do in it.
  if (window.location.pathname.startsWith("/admin")) return;

  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push({ name, path: window.location.pathname + window.location.search, ts: Date.now(), props });

  if (queue.length >= FLUSH_AT) flush();
  else if (!timer) timer = setTimeout(() => flush(), FLUSH_AFTER_MS);
}

/** Sends whatever is queued right now. Called when the page is being hidden or closed. */
export function flushNow() {
  flush(true);
}
