/** The roles an account can hold, as the API names them. */
export type Role = "USER" | "ADMIN" | "SUPER_ADMIN" | "COLLEGE_ADMIN";

/** The platform team: Admin and Super Admin. They see the whole panel. */
export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Anyone who can open the admin panel, a college admin included (they see only their college). */
export function canUsePanel(role: string | null | undefined): boolean {
  return isPlatformAdmin(role) || role === "COLLEGE_ADMIN";
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}

export function isCollegeAdmin(role: string | null | undefined): boolean {
  return role === "COLLEGE_ADMIN";
}

/** How a role reads on screen. */
export const ROLE_LABEL: Record<Role, string> = {
  USER: "Student",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
  COLLEGE_ADMIN: "College admin",
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role as Role] ?? role;
}

/**
 * The admin pages a college admin may open. Everything else under /admin is for
 * the platform team. This only decides where to send them (see proxy.ts); the
 * API refuses what they may not do whatever the address bar says.
 */
export const COLLEGE_ADMIN_PATHS = ["/admin", "/admin/college", "/admin/leads", "/admin/notifications", "/admin/requests", "/admin/messages"] as const;

export function collegeAdminMayOpen(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/admin";
  return COLLEGE_ADMIN_PATHS.some((allowed) => path === allowed || (allowed !== "/admin" && path.startsWith(`${allowed}/`)));
}
