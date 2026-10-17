import { redirect } from "next/navigation";

/**
 * Passwords are not reset by email yet. An old bookmark or link to this page goes to the login
 * screen. Until email is set up, a person who cannot sign in asks the team, who set a new
 * temporary password for them from the admin panel.
 */
export default function ForgotPasswordPage() {
  redirect("/login");
}
