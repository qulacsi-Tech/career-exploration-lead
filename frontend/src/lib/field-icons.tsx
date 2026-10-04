import {
  Atom,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  Camera,
  Code,
  Cpu,
  Dumbbell,
  FlaskConical,
  Globe,
  GraduationCap,
  Hammer,
  HeartPulse,
  Landmark,
  Leaf,
  Lightbulb,
  Microscope,
  Music,
  Newspaper,
  Palette,
  Pill,
  Plane,
  Scale,
  Stethoscope,
  TrendingUp,
  Users,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/*
  The icons an admin can give a field of study.

  The database stores only the key. The homepage and the admin picker both read
  this one table, so an icon added here shows up in both. An unknown key (a field
  saved with an icon that was later removed from this list) draws the book icon
  rather than breaking the disc.
*/

export const FIELD_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "briefcase", label: "Business", Icon: Briefcase },
  { key: "cpu", label: "Technology", Icon: Cpu },
  { key: "stethoscope", label: "Medicine", Icon: Stethoscope },
  { key: "palette", label: "Arts and design", Icon: Palette },
  { key: "bar-chart", label: "Commerce", Icon: BarChart3 },
  { key: "scale", label: "Law", Icon: Scale },
  { key: "graduation-cap", label: "Education", Icon: GraduationCap },
  { key: "book-open", label: "General studies", Icon: BookOpen },
  { key: "flask-conical", label: "Science", Icon: FlaskConical },
  { key: "atom", label: "Physics", Icon: Atom },
  { key: "microscope", label: "Life sciences", Icon: Microscope },
  { key: "pill", label: "Pharmacy", Icon: Pill },
  { key: "heart-pulse", label: "Paramedical", Icon: HeartPulse },
  { key: "code", label: "Computer science", Icon: Code },
  { key: "calculator", label: "Maths and accounts", Icon: Calculator },
  { key: "trending-up", label: "Finance", Icon: TrendingUp },
  { key: "landmark", label: "Public policy", Icon: Landmark },
  { key: "globe", label: "International", Icon: Globe },
  { key: "users", label: "Social sciences", Icon: Users },
  { key: "newspaper", label: "Media", Icon: Newspaper },
  { key: "camera", label: "Film and photography", Icon: Camera },
  { key: "music", label: "Performing arts", Icon: Music },
  { key: "building", label: "Architecture", Icon: Building2 },
  { key: "hammer", label: "Construction", Icon: Hammer },
  { key: "wrench", label: "Skilled trades", Icon: Wrench },
  { key: "plane", label: "Aviation", Icon: Plane },
  { key: "leaf", label: "Agriculture", Icon: Leaf },
  { key: "utensils", label: "Hospitality", Icon: Utensils },
  { key: "dumbbell", label: "Sports", Icon: Dumbbell },
  { key: "lightbulb", label: "Innovation", Icon: Lightbulb },
];

const BY_KEY = new Map(FIELD_ICONS.map((i) => [i.key, i.Icon]));

/** The drawing for an icon key. */
export function fieldIcon(key: string): LucideIcon {
  return BY_KEY.get(key) ?? BookOpen;
}

/**
 * An icon by key, drawn in place. A switch of literal elements rather than a lookup,
 * so no component is picked during render. Keep it in step with FIELD_ICONS above.
 */
export function FieldIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "briefcase":
      return <Briefcase className={className} />;
    case "cpu":
      return <Cpu className={className} />;
    case "stethoscope":
      return <Stethoscope className={className} />;
    case "palette":
      return <Palette className={className} />;
    case "bar-chart":
      return <BarChart3 className={className} />;
    case "scale":
      return <Scale className={className} />;
    case "graduation-cap":
      return <GraduationCap className={className} />;
    case "book-open":
      return <BookOpen className={className} />;
    case "flask-conical":
      return <FlaskConical className={className} />;
    case "atom":
      return <Atom className={className} />;
    case "microscope":
      return <Microscope className={className} />;
    case "pill":
      return <Pill className={className} />;
    case "heart-pulse":
      return <HeartPulse className={className} />;
    case "code":
      return <Code className={className} />;
    case "calculator":
      return <Calculator className={className} />;
    case "trending-up":
      return <TrendingUp className={className} />;
    case "landmark":
      return <Landmark className={className} />;
    case "globe":
      return <Globe className={className} />;
    case "users":
      return <Users className={className} />;
    case "newspaper":
      return <Newspaper className={className} />;
    case "camera":
      return <Camera className={className} />;
    case "music":
      return <Music className={className} />;
    case "building":
      return <Building2 className={className} />;
    case "hammer":
      return <Hammer className={className} />;
    case "wrench":
      return <Wrench className={className} />;
    case "plane":
      return <Plane className={className} />;
    case "leaf":
      return <Leaf className={className} />;
    case "utensils":
      return <Utensils className={className} />;
    case "dumbbell":
      return <Dumbbell className={className} />;
    case "lightbulb":
      return <Lightbulb className={className} />;
    default:
      return <BookOpen className={className} />;
  }
}
