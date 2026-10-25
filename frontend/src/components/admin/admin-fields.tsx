"use client";

import { ReactNode, useState } from "react";

/** Form primitives shared by the admin add and edit screens. */

export function TextField({
  label,
  name,
  placeholder,
  required,
  disabled,
  type = "text",
  value,
  defaultValue,
  onChange,
  hint,
  labelAction,
  className,
  maxLength,
  min,
  max,
  step,
  error,
}: {
  label: string;
  name: string;
  /** Shown in red under the field, and marks it invalid. */
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  /** Matches the API's limit, so an over-long entry is stopped where it is typed. */
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  /** Controlled only when both value and onChange are given. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  hint?: string;
  labelAction?: ReactNode;
  className?: string;
}) {
  const controlled = value !== undefined && onChange !== undefined;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={name} className="block text-xs font-semibold text-ink">
          {label}
          {required && <span className="text-brand"> *</span>}
        </label>
        {labelAction}
      </div>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        disabled={disabled}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        {...(controlled ? { value, onChange: (e) => onChange(e.target.value) } : { defaultValue })}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none disabled:bg-bg-alt disabled:text-ink-muted disabled:cursor-not-allowed"
      />
      {error && <p id={`${name}-error`} role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  className,
  labelFor,
  placeholder,
  required,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  className?: string;
  /** Text shown for an option whose value is a key, such as a course slug. */
  labelFor?: (option: string) => string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const controlled = value !== undefined && onChange !== undefined;

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        aria-required={required || undefined}
        {...(controlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : { defaultValue: defaultValue ?? (placeholder ? "" : undefined) })}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
      >
        {placeholder && (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {labelFor ? labelFor(option) : option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  placeholder,
  rows = 3,
  defaultValue,
  hint,
  className,
  required,
  maxLength,
}: {
  label: string;
  name: string;
  placeholder?: string;
  rows?: number;
  defaultValue?: string;
  hint?: string;
  className?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

/**
 * Select with an escape hatch: pick from the list, or choose "Other" and type a
 * value.
 *
 * For fields drawn from an open vocabulary. schema.org has hundreds of types
 * and adds more over time, so a fixed list of three will eventually be wrong,
 * and an editor who needs `Course` or `LocalBusiness` should not have to wait
 * on a code change to set it.
 */
const OTHER_VALUE = "__other__";

export function SelectWithOtherField({
  label,
  name,
  options,
  defaultValue,
  otherLabel = "Other — enter a value",
  customLabel,
  customPlaceholder,
  hint,
  className,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  otherLabel?: string;
  customLabel?: string;
  customPlaceholder?: string;
  hint?: string;
  className?: string;
}) {
  /*
    A stored value outside the list means the record was saved with a custom
    entry, so the field opens in "other" mode with that value in the box —
    otherwise reopening the record would silently reset it to the first option.
  */
  const storedIsCustom = defaultValue !== undefined && !options.includes(defaultValue);
  const [selection, setSelection] = useState(storedIsCustom ? OTHER_VALUE : defaultValue ?? options[0]);
  const [custom, setCustom] = useState(storedIsCustom ? defaultValue : "");
  const isOther = selection === OTHER_VALUE;

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={selection}
        onChange={(e) => setSelection(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={OTHER_VALUE}>{otherLabel}</option>
      </select>

      {isOther && (
        <div className="mt-2">
          <label htmlFor={`${name}-custom`} className="sr-only">
            {customLabel ?? `${label} — custom value`}
          </label>
          <input
            id={`${name}-custom`}
            /* Separate name: the select still submits its own value, and the
               API decides which wins once persistence exists. */
            name={`${name}Custom`}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={customPlaceholder}
            required
            autoFocus
            className="w-full rounded-lg border border-brand/50 bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        </div>
      )}

      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

/**
 * URL-safe slug from a name. Strips accents before dropping non-alphanumerics,
 * so "Amrita Viśva" gives "amrita-visva" rather than losing the character.
 */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Paired name and slug fields: the slug fills in from the name, and stops
 * following it the moment it is edited by hand.
 *
 * On an existing record the slug starts "already set" and never auto-changes.
 * A slug is a live URL — rewriting it because someone corrected a typo in the
 * name would silently break every link and every indexed result pointing at it.
 * Regenerating is available, but has to be chosen.
 *
 * Renders two grid cells, so it drops straight into a FieldGrid.
 */
export function NameSlugFields({
  nameLabel = "Name",
  namePlaceholder,
  nameFieldName = "name",
  slugLabel = "URL slug",
  slugPlaceholder,
  slugFieldName = "slug",
  defaultName = "",
  defaultSlug = "",
  slugPrefix = "",
  slugSuffix = "",
  nameMaxLength,
  nameError,
}: {
  /** Shown beside the name field. */
  nameError?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  nameFieldName?: string;
  slugLabel?: string;
  slugPlaceholder?: string;
  slugFieldName?: string;
  defaultName?: string;
  /** Present means an existing record: the slug is left alone. */
  defaultSlug?: string;
  /** Prepended to the generated slug, e.g. the parent course. */
  slugPrefix?: string;
  /** Appended to the generated slug, e.g. the university, so one programme at two universities gets two slugs. */
  slugSuffix?: string;
  nameMaxLength?: number;
}) {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaultSlug));

  const generate = (from: string) => {
    const base = slugify(from);
    if (!base) return "";
    const tail = slugify(slugSuffix);
    const full = [slugPrefix, base, tail].filter(Boolean).join("-");
    return full.slice(0, 200).replace(/-+$/, "");
  };

  const suggestion = generate(name);
  // Until the slug is edited by hand it is derived, so it also follows a university picked after the name.
  const shownSlug = slugEdited ? slug : suggestion;
  const noLatin = name.trim().length > 0 && suggestion === "";
  const canReset = suggestion.length > 0 && shownSlug !== suggestion;

  return (
    <>
      <TextField
        label={nameLabel}
        name={nameFieldName}
        placeholder={namePlaceholder}
        required
        maxLength={nameMaxLength}
        value={name}
        onChange={setName}
        error={nameError}
      />
      <TextField
        label={slugLabel}
        name={slugFieldName}
        placeholder={slugPlaceholder}
        required
        value={shownSlug}
        onChange={(value) => {
          setSlug(value);
          setSlugEdited(true);
        }}
        maxLength={200}
        hint={
          noLatin && !slugEdited
            ? "A slug can only use English letters and numbers. Type one here, e.g. mba."
            : defaultSlug
            ? "Changing this breaks existing links unless a redirect is added."
            : slugEdited
              ? "Edited manually."
              : "Generated from the name."
        }
        labelAction={
          canReset ? (
            <button
              type="button"
              onClick={() => {
                setSlugEdited(false);
              }}
              className="text-[11px] font-medium text-brand hover:underline"
            >
              Use name
            </button>
          ) : undefined
        }
      />
    </>
  );
}

/**
 * Several names in one go: type one and press Enter, and it becomes a chip while the box clears for
 * the next. Each chip posts as `name` (read with `FormData.getAll`), and so does whatever is still
 * typed in the box, so a last name does not need an Enter before Save.
 */
export function NamesInput({
  label,
  name,
  placeholder,
  maxLength = 200,
  hint,
  className,
}: {
  label: string;
  name: string;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
  className?: string;
}) {
  const [names, setNames] = useState<string[]>([]);
  const [text, setText] = useState("");

  const commit = () => {
    const value = text.trim();
    if (value && !names.some((n) => n.toLowerCase() === value.toLowerCase())) setNames([...names, value]);
    setText("");
  };

  return (
    <div className={className}>
      <label htmlFor={`${name}-input`} className="block text-xs font-semibold text-ink">
        {label}
        <span className="text-brand"> *</span>
      </label>
      {names.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {names.map((n) => (
            <li key={n} className="flex items-center gap-1.5 rounded-full border border-brand bg-brand-soft py-1 pl-3 pr-1.5 text-sm text-brand">
              {n}
              <input type="hidden" name={name} value={n} />
              <button
                type="button"
                aria-label={`Remove ${n}`}
                onClick={() => setNames(names.filter((x) => x !== n))}
                className="flex h-5 w-5 items-center justify-center rounded-full text-base leading-none hover:bg-brand hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={`${name}-input`}
        name={name}
        value={text}
        maxLength={maxLength}
        placeholder={names.length > 0 ? "Type another and press Enter" : placeholder}
        autoComplete="off"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Enter adds the name instead of submitting the form; Backspace on an empty box takes the last one back.
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && text === "" && names.length > 0) {
            setNames(names.slice(0, -1));
          }
        }}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />
      <p className="mt-1 text-[11px] text-ink-faint">{hint ?? "Press Enter after each name to add more than one."}</p>
    </div>
  );
}

/**
 * The parents of a record, several at once: checkable chips that post one value per ticked box
 * under `name`. The caller reads them with `FormData.getAll(name)`.
 */
export function ParentPicker({
  label,
  name,
  options,
  defaultValues = [],
  emptyNote,
  className,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValues?: string[];
  /** Shown when there is nothing to pick yet. */
  emptyNote: string;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="block text-xs font-semibold text-ink">
        {label}
        <span className="text-brand"> *</span>
      </legend>
      {options.length === 0 ? (
        <p className="mt-1.5 text-sm text-ink-soft">{emptyNote}</p>
      ) : (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {options.map((option) => (
            <li key={option.value}>
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand">
                <input
                  type="checkbox"
                  name={name}
                  value={option.value}
                  defaultChecked={defaultValues.includes(option.value)}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                {option.label}
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

/** Read-only label/value pair, for the View dialog. */
export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
