import { apiFetchAuthPage, type AuthPageCopy, type AuthPages } from "@/lib/api";

/**
 * What the log in and sign up pages say when nothing has been saved, or the API cannot be reached.
 * The same words the pages had before they were editable (the API holds the same defaults for the admin).
 */
export const AUTH_DEFAULTS: AuthPages = {
  login: {
    heading: "Log in",
    subheading: "Save colleges, track applications and pick up where you left off.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    rememberLabel: "Keep me signed in",
    submitLabel: "Log in",
    dividerText: "or",
    switchText: "New here?",
    switchLink: "Create an account",
    image: "",
    imageAlt: "",
    panelTitle: "Your shortlist, in one place",
    panelText: "Compare colleges, track the exams you are preparing for and pick up exactly where you left off.",
    highlights: ["Shortlist and compare colleges", "Fees, placements and cut-offs side by side", "Exam dates and deadlines in one place"],
  },
  signup: {
    heading: "Create your account",
    subheading: "Shortlist colleges, save comparisons and pick up where you left off.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    rememberLabel: "",
    submitLabel: "Create account",
    dividerText: "or",
    switchText: "Already have an account?",
    switchLink: "Log in",
    image: "",
    imageAlt: "",
    panelTitle: "Start your college search",
    panelText: "Free to join. Save colleges, compare fees and placements side by side, and hear about exams and deadlines.",
    highlights: ["Free to join", "Save colleges you like", "Get exam alerts and counselling offers"],
  },
};

/** One page's copy: what the admin saved over the defaults. Never throws, so the page always renders. */
export async function getAuthCopy(page: "login" | "signup"): Promise<AuthPageCopy> {
  const saved = await apiFetchAuthPage().catch(() => null);
  return { ...AUTH_DEFAULTS[page], ...(saved?.[page] ?? {}) };
}
