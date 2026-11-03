"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordResetFlow } from "@/components/auth/password-reset-flow";

/** The /forgot-password page's content: the reset flow, and the way back to log in. */
export function ForgotPasswordView() {
  const router = useRouter();
  return (
    <div>
      <h1 className="text-center font-display text-2xl font-extrabold text-ink sm:text-3xl">Forgot your password?</h1>
      <p className="mt-1.5 text-center text-sm text-ink-soft">We will email you a code to choose a new one.</p>
      <div className="mt-5">
        <PasswordResetFlow onDone={() => router.push("/login")} />
      </div>
      <p className="mt-5 text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4 hover:text-brand">
          Log in
        </Link>
      </p>
    </div>
  );
}
