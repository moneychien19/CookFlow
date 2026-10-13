import type { ReactNode } from "react";
import { cx } from "./cx";

/** Status colors from CLAUDE.md's color-role table, adjusted where needed for AA contrast. */
export type BadgeVariant = "opened" | "expiring" | "have" | "missing" | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  opened: "bg-gold-pale text-espresso",
  expiring: "bg-clay text-on-dark",
  have: "bg-sage-pale text-forest",
  missing: "border border-hairline bg-surface text-stone",
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
