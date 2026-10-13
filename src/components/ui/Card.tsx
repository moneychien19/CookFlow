import type { ReactNode } from "react";
import { cx } from "./cx";

type CardProps = {
  as?: "div" | "article" | "section" | "li";
  className?: string;
  children: ReactNode;
};

/** DESIGN.md feature-card: the default container for pantry items, meals, and recipes. */
export function Card({ as: Element = "div", className, children }: CardProps) {
  return (
    <Element className={cx("rounded-lg border border-hairline bg-surface p-lg text-ink", className)}>
      {children}
    </Element>
  );
}
