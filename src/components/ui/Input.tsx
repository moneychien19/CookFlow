import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from "react";
import { cx } from "./cx";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx("text-ui text-stone", className)} {...props} />;
}

const fieldClass = "min-h-touch w-full rounded-md border bg-surface px-md text-body-sm text-ink";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

/** White field with a hairline border; the error border appears only when invalid. */
export function Input({ invalid = false, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cx(
        fieldClass,
        invalid ? "border-error" : "border-hairline",
        className,
      )}
      {...props}
    />
  );
}

/** Hint and error lines under a field, and the aria-describedby that points at them. */
function fieldDescription(id: string, hint?: string, error?: string) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const lines = (
    <>
      {hint && (
        <p id={hintId} className="text-ui text-stone">
          {hint}
        </p>
      )}
      {/* ink, not the error color: error text on white is below 4.5:1. */}
      {error && (
        <p id={errorId} className="text-ui text-ink">
          {error}
        </p>
      )}
    </>
  );
  return { describedBy, lines };
}

type TextFieldProps = Omit<InputProps, "invalid" | "name"> & {
  label: string;
  name: string;
  /** Help text under the field, e.g. which unit to use. */
  hint?: string;
  /** Validation message; marks the field invalid when present. */
  error?: string;
};

/** Label + input + hint + error message, wired for screen readers. */
export function TextField({ label, name, hint, error, id = name, ...props }: TextFieldProps) {
  const { describedBy, lines } = fieldDescription(id, hint, error);
  return (
    <div className="flex flex-col gap-xxs">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} invalid={Boolean(error)} aria-describedby={describedBy} {...props} />
      {lines}
    </div>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> & {
  label: string;
  name: string;
  error?: string;
};

/** Label + native select + error message; same chrome as Input. */
export function SelectField({ label, name, error, id = name, className, children, ...props }: SelectFieldProps) {
  const { describedBy, lines } = fieldDescription(id, undefined, error);
  return (
    <div className="flex flex-col gap-xxs">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(fieldClass, error ? "border-error" : "border-hairline", className)}
        {...props}
      >
        {children}
      </select>
      {lines}
    </div>
  );
}

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };

/** A checkbox inside its label, at least the touch height (min-h-touch) to tap. */
export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cx("inline-flex min-h-touch cursor-pointer items-center gap-xs text-body-sm text-ink", className)}>
      <input type="checkbox" className="size-md accent-stone" {...props} />
      {label}
    </label>
  );
}
