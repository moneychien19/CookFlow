import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

/**
 * primary: the view's one decisive action (blue, at most once per view).
 * secondary: stone pill, the default. outline: stone outline on canvas.
 */
export type ButtonVariant = "primary" | "secondary" | "outline";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-stone text-on-stone",
  outline: "border border-stone bg-canvas text-stone",
};

/** Button styling, also for links that should look like buttons. */
export function buttonClass(variant: ButtonVariant = "secondary"): string {
  return cx(
    "inline-flex min-h-touch items-center justify-center gap-xs rounded-full px-lg text-button no-underline",
    "transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = "secondary", type = "button", className, ...props }: ButtonProps) {
  return <button type={type} className={cx(buttonClass(variant), className)} {...props} />;
}
