import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { PantryRow } from "@/lib/db/pantry";
import { formatQuantity, pantryBadges } from "@/lib/pantry-display";
import type { IsoDate } from "@/lib/planner";

const DATE_FORMAT = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const formatDate = (date: IsoDate) => DATE_FORMAT.format(new Date(`${date}T00:00:00Z`));

function Badges({ item, today }: { item: PantryRow; today: IsoDate }) {
  const badges = pantryBadges(item, today);
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-xxs">
      {badges.map((badge) => (
        <Badge key={badge.text} variant={badge.variant}>
          {badge.text}
        </Badge>
      ))}
    </span>
  );
}

const headerClass = "px-md py-sm text-left text-eyebrow uppercase text-stone";
const cellClass = "px-md py-sm";

/** The pantry as a table on tablet and up, and as cards on phones. */
export function PantryList({ items, today }: { items: PantryRow[]; today: IsoDate }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-hairline bg-surface tablet:block">
        <table className="w-full text-body-sm text-ink">
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className={headerClass}>Ingredient</th>
              <th scope="col" className={headerClass}>Amount</th>
              <th scope="col" className={headerClass}>Expires</th>
              <th scope="col" className={headerClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-hairline last:border-b-0">
                <th scope="row" className={`${cellClass} text-left font-normal`}>{item.name}</th>
                <td className={cellClass}>{formatQuantity(item.quantity, item.unit)}</td>
                <td className={cellClass}>{item.expiresOn ? formatDate(item.expiresOn) : "—"}</td>
                <td className={cellClass}>
                  <Badges item={item} today={today} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-sm tablet:hidden">
        {items.map((item) => (
          <Card key={item.id} as="li" className="flex flex-col gap-xs">
            <span className="flex items-baseline justify-between gap-md text-body-sm">
              <span>{item.name}</span>
              <span className="text-stone">{formatQuantity(item.quantity, item.unit)}</span>
            </span>
            <Badges item={item} today={today} />
          </Card>
        ))}
      </ul>
    </>
  );
}
