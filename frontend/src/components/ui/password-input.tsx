"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password field with a button that shows or hides what is typed.
 *
 * Takes the same props as an `<input>` (including `className`, which styles the field itself), minus
 * `type`. Used for every password in the site so they all behave and look alike.
 */
export function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        // Not in the tab order's way of typing, but reachable: it is a real button.
        className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-faint transition hover:text-brand"
      >
        {shown ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
