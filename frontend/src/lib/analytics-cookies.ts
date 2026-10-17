/**
 * Cookie names shared by the browser tracker, the collector route and the lead
 * form action. Plain constants so client and server code can both import them.
 */

/** The visitor's anonymous id. Only ever set after the visitor accepts analytics. */
export const VISITOR_COOKIE = "tcp_vid";

/** "granted" or "denied". Absent until the visitor chooses. */
export const CONSENT_COOKIE = "tcp_consent";

export type Consent = "granted" | "denied";

/** One year, for both cookies. */
export const ANALYTICS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
