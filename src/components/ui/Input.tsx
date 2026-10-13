import type { InputHTMLAttributes, LabelHTMLAttributes } from "react";
import { cx } from "./cx";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx("text-ui text-stone", className)} {...props} />;
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

/** White field with a hairline border; the error border appears only when invalid. */
export function Input({ invalid = false, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cx(
        "min-h-touch w-full rounded-md border bg-surface px-md text-body-sm text-ink",
        invalid ? "border-error" : "border-hairline",
        className,
      )}
      {...props}
    />
  );
}

type TextFieldProps = Omit<InputProps, "invalid" | "name"> & {
  label: string;
  name: string;
  /** Validation message; marks the field invalid when present. */
  error?: string;
};

/** Label + input + error message, wired for screen readers. */
export function TextField({ label, name, error, id = name, ...props }: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-xxs">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {/* ink, not the error color: error text on white is below 4.5:1. */}
      {error && (
        <p id={errorId} className="text-ui text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
