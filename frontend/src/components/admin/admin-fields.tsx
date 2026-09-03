"use client";

import { ReactNode, useState } from "react";

/** Form primitives shared by the admin add and edit screens. */

export function TextField({
  label,
  name,
  placeholder,
  required,
  type = "text",
  value,
  defaultValue,
  onChange,
  hint,
  labelAction,
  className,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
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
        </label>
        {labelAction}
      </div>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        {...(controlled ? { value, onChange: (e) => onChange(e.target.value) } : { defaultValue })}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />
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
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
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
}: {
  label: string;
  name: string;
  placeholder?: string;
  rows?: number;
  defaultValue?: string;
  hint?: string;
  className?: string;
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
}: {
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
}) {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaultSlug));

  const generate = (from: string) => {
    const base = slugify(from);
    if (!base) return "";
    return slugPrefix ? `${slugPrefix}-${base}` : base;
  };

  const suggestion = generate(name);
  const canReset = suggestion.length > 0 && slug !== suggestion;

  return (
    <>
      <TextField
        label={nameLabel}
        name={nameFieldName}
        placeholder={namePlaceholder}
        required
        value={name}
        onChange={(value) => {
          setName(value);
          if (!slugEdited) setSlug(generate(value));
        }}
      />
      <TextField
        label={slugLabel}
        name={slugFieldName}
        placeholder={slugPlaceholder}
        required
        value={slug}
        onChange={(value) => {
          setSlug(value);
          setSlugEdited(true);
        }}
        hint={
          defaultSlug
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
                setSlug(suggestion);
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

/** Read-only label/value pair, for the View dialog. */
export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
