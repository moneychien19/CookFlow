import type { ReactNode } from "react";

/** DESIGN.md ex-toast: a short confirmation like "Pantry updated", pinned to the bottom. */
export function Toast({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="fixed inset-x-md bottom-md mx-auto w-fit rounded-lg bg-surface px-md py-sm text-body-sm text-ink shadow-soft"
    >
      {children}
    </div>
  );
}
