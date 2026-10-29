import { Award, Building2, BookOpen, GraduationCap, ShieldCheck, Sparkles, Star, Target, Trophy, Users, type LucideIcon } from "lucide-react";

/**
 * The icons an editor can put on a written section's banner (Admissions, Infrastructure, Scholarships). One list
 * for the editor's picker, the public page and the editor's preview, so they can never offer one the page cannot draw.
 */
export const TAB_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  grad: { label: "Graduation cap", Icon: GraduationCap },
  award: { label: "Award", Icon: Award },
  building: { label: "Building", Icon: Building2 },
  book: { label: "Book", Icon: BookOpen },
  star: { label: "Star", Icon: Star },
  trophy: { label: "Trophy", Icon: Trophy },
  users: { label: "People", Icon: Users },
  target: { label: "Target", Icon: Target },
  sparkles: { label: "Sparkles", Icon: Sparkles },
  shield: { label: "Shield", Icon: ShieldCheck },
};

/** The icon a written section has before an editor chooses one. */
export const DEFAULT_TAB_ICON: Record<string, string> = {
  "admission-process": "grad",
  "hostel-facilities": "building",
  scholarships: "award",
};
