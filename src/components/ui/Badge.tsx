import type { ReactNode } from "react";
import { cx } from "./cx";

/** Status colors from CLAUDE.md's color-role table, adjusted where needed for AA contrast. */
export type BadgeVariant = "opened" | "partial" | "have" | "missing" | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  opened: "bg-gold-pale/50 text-espresso",
  // Gold means "part of it", as for opened items.
  partial: "bg-gold-pale/50 text-espresso",
  have: "bg-sage-pale/60 text-forest",
  // Solid grey: "not there", without looking like a warning or an empty field.
  missing: "bg-surface-grey text-stone",
  neutral: "border border-silver bg-canvas text-stone",
};

/** Always pass visible text ("Opened", "Expires in 2 days"); color is never the only signal. */
export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-sm px-xs py-xxs text-ui", VARIANTS[variant])}>
      {children}
    </span>
  );
}
