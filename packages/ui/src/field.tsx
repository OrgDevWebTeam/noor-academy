import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";

const CONTROL_CLASSES = cx(
  "min-h-control w-full rounded-control border border-control bg-surface px-3 text-body text-ink",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  "aria-[invalid=true]:border-danger",
);

type FieldTextProps = {
  /** Links the label, hint and error to the control. Must be unique on the page. */
  id: string;
  label: string;
  /** Help text under the control. */
  hint?: string;
  /** Validation message. Its presence marks the control invalid. */
  error?: string;
};

/** IDs of the hint and error, for `aria-describedby`, so screen readers read them with the control. */
function describedBy({ id, hint, error }: FieldTextProps): string | undefined {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
}: FieldTextProps & { required?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger">
            {" *"}
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & FieldTextProps;

/**
 * Labelled text input. Direction is "auto" by default, so Arabic and English typing both read
 * correctly; pass dir="ltr" for emails, phone numbers and codes.
 */
export function TextField({
  id,
  label,
  hint,
  error,
  required,
  dir = "auto",
  className,
  ...rest
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <input
        id={id}
        dir={dir}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        className={cx(CONTROL_CLASSES, className)}
        {...rest}
      />
    </FieldShell>
  );
}

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "children"> &
  FieldTextProps & { options: SelectOption[] };

/** Labelled native select: the browser handles the keyboard, touch and screen-reader behaviour. */
export function SelectField({
  id,
  label,
  hint,
  error,
  required,
  options,
  className,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        className={cx(CONTROL_CLASSES, className)}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
