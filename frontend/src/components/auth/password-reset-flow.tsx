"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { requestPasswordReset, resetPasswordWithCode } from "@/lib/auth-actions";
import { PasswordInput } from "@/components/ui/password-input";
import { identifierProblem, passwordProblem } from "@/lib/field-rules";

const FIELD = "mt-1 w-full rounded-xl border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none";
const field = (error?: string) => `${FIELD} ${error ? "border-red-500 focus:border-red-500" : "border-line focus:border-brand"}`;

type Step = "ask" | "code" | "done";

/**
 * Forgot password, in two steps. First the email address or mobile number: a six-digit code is emailed to the
 * account. Then the code and a new password. The same flow is the /forgot-password page and the "Forgot password?"
 * view inside the sign-in dialog; `onDone` takes the person back to log in.
 */
export function PasswordResetFlow({ initialIdentifier = "", onDone, doneLabel = "Back to log in" }: { initialIdentifier?: string; onDone: () => void; doneLabel?: string }) {
  const [step, setStep] = useState<Step>("ask");
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testCode, setTestCode] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = identifierProblem(identifier);
    setErrors(problem ? { identifier: problem } : {});
    setFormError(null);
    if (problem) return;
    start(async () => {
      const result = await requestPasswordReset(identifier);
      if (!result.ok) return setFormError(result.error);
      setNotice(result.message);
      setTestCode(result.devCode ?? null);
      setStep("code");
    });
  };

  const change = (e: React.FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!/^\d{6}$/.test(code.trim())) found.code = "Enter the six-digit code from the email.";
    const pw = passwordProblem(password);
    if (pw) found.password = pw;
    if (confirm !== password) found.confirm = "Both passwords must match.";
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    start(async () => {
      const result = await resetPasswordWithCode(identifier, code.trim(), password);
      if (!result.ok) return setFormError(result.error);
      setStep("done");
    });
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></span>
        <p className="mt-3 font-display text-lg font-bold text-ink">Password changed</p>
        <p className="mt-1 text-sm text-ink-soft">You can log in with your new password now.</p>
        <button type="button" onClick={onDone} className="mt-5 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark">{doneLabel}</button>
      </div>
    );
  }

  const error = formError && (
    <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
    </p>
  );

  if (step === "ask") {
    return (
      <form onSubmit={ask} noValidate className="space-y-3">
        <p className="text-sm text-ink-soft">Enter your email address or mobile number. We will email a six-digit code to the account.</p>
        {error}
        <div>
          <label htmlFor="pr-identifier" className="block text-xs font-semibold text-ink">Email or mobile number</label>
          <input id="pr-identifier" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setErrors({}); }} autoComplete="username" placeholder="you@example.com or 9876543210" aria-invalid={!!errors.identifier} className={field(errors.identifier)} />
          {errors.identifier && <p className="mt-1 text-xs text-red-700">{errors.identifier}</p>}
        </div>
        <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-70">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Send the code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={change} noValidate className="space-y-3">
      {notice && <p className="rounded-lg bg-bg-alt px-3 py-2 text-xs text-ink-soft">{notice}</p>}
      {testCode && <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">Testing only: the code is <strong>{testCode}</strong>.</p>}
      {error}
      <div>
        <label htmlFor="pr-code" className="block text-xs font-semibold text-ink">Six-digit code</label>
        <input id="pr-code" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrors((x) => ({ ...x, code: "" })); }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" aria-invalid={!!errors.code} className={`${field(errors.code)} tracking-[0.4em]`} />
        {errors.code && <p className="mt-1 text-xs text-red-700">{errors.code}</p>}
      </div>
      <div>
        <label htmlFor="pr-password" className="block text-xs font-semibold text-ink">New password</label>
        <PasswordInput id="pr-password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: "" })); }} maxLength={64} autoComplete="new-password" placeholder="At least 8 characters" className={field(errors.password)} />
        {errors.password ? <p className="mt-1 text-xs text-red-700">{errors.password}</p> : <p className="mt-1 text-[11px] text-ink-faint">At least 8 characters, with a letter and a number.</p>}
      </div>
      <div>
        <label htmlFor="pr-confirm" className="block text-xs font-semibold text-ink">Confirm the new password</label>
        <PasswordInput id="pr-confirm" value={confirm} onChange={(e) => { setConfirm(e.target.value); setErrors((x) => ({ ...x, confirm: "" })); }} maxLength={64} autoComplete="new-password" placeholder="Re-enter the new password" className={field(errors.confirm)} />
        {errors.confirm && <p className="mt-1 text-xs text-red-700">{errors.confirm}</p>}
      </div>
      <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-70">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Change password
      </button>
      <p className="text-center text-xs text-ink-soft">
        Did not get it?{" "}
        <button type="button" onClick={() => { setStep("ask"); setErrors({}); setFormError(null); setCode(""); }} className="font-semibold text-brand hover:underline">Send a new code</button>
      </p>
    </form>
  );
}
