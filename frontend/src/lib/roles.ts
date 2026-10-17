/** The roles an account can hold, as the API names them. */
export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

/** Admins and super admins can use the admin panel. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}

/** How a role reads on screen. */
export const ROLE_LABEL: Record<Role, string> = {
  USER: "Student",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role as Role] ?? role;
}
