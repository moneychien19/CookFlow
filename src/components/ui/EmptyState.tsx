import type { ReactNode } from "react";

/** DESIGN.md ex-empty-state-card: one sentence and the view's single blue action. */
export function EmptyState({ message, action }: { message: string; action: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-lg rounded-lg border border-hairline bg-surface p-xl text-center">
      <p className="text-body text-ink">{message}</p>
      {action}
    </div>
  );
}
