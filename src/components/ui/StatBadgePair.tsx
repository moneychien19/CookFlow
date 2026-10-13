type StatBadgePairProps = {
  label: string;
  before: number;
  after: number;
};

function Stat({ kind, value, color }: { kind: "before" | "after"; value: number; color: string }) {
  return (
    <div data-stat={kind} className="flex flex-col items-center gap-xs">
      <span
        className={`inline-flex size-stat items-center justify-center rounded-full border border-hairline bg-canvas text-title ${color}`}
      >
        {value}
      </span>
      <span className="text-ui text-stone">{kind === "before" ? "Before" : "After"}</span>
    </div>
  );
}

/** DESIGN.md stat-badge pair: "before" in gold → "after" in olive. */
export function StatBadgePair({ label, before, after }: StatBadgePairProps) {
  return (
    <figure className="flex flex-col gap-sm">
      <figcaption className="text-eyebrow uppercase text-ink">{label}</figcaption>
      <div className="flex items-start gap-md">
        <Stat kind="before" value={before} color="text-gold" />
        <span aria-hidden className="self-center pb-lg text-title text-stone">
          →
        </span>
        <Stat kind="after" value={after} color="text-olive" />
      </div>
    </figure>
  );
}
