import Link from "next/link";
import { DeleteItemButton } from "@/components/DeleteItemButton";
import { EditPantryItemForm } from "@/components/PantryItemForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { PantryRow } from "@/lib/db/pantry";
import { expiryText, formatQuantity } from "@/lib/pantry-display";
import { isOpened, type IsoDate } from "@/lib/planner";

const headerClass = "px-md py-md text-left text-eyebrow uppercase text-stone";
const cellClass = "px-md py-sm";
const linkClass = "inline-flex min-h-touch items-center px-xs text-ui text-stone underline";

/** "Edit" opens the row as a form (?edit=id); "Delete" asks in a dialog before it removes anything. */
function ItemActions({ item }: { item: PantryRow }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-xs">
      <Link href={`/pantry?edit=${item.id}`} className={linkClass} aria-label={`Edit ${item.name}`}>
        Edit
      </Link>
      <DeleteItemButton id={item.id} name={item.name} />
    </div>
  );
}

type PantryListProps = { items: PantryRow[]; today: IsoDate; editId: number | null };

/** The pantry as a table on tablet and up, and as cards on phones. */
export function PantryList({ items, today, editId }: PantryListProps) {
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
              <th scope="col" className={headerClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) =>
              item.id === editId ? (
                <tr key={item.id} className="border-b border-hairline last:border-b-0">
                  <td colSpan={5} className="p-md">
                    <EditPantryItemForm item={item} />
                  </td>
                </tr>
              ) : (
                <tr key={item.id} className="border-b border-hairline last:border-b-0">
                  <th scope="row" className={`${cellClass} text-left font-normal`}>{item.name}</th>
                  <td className={cellClass}>{formatQuantity(item.quantity, item.unit)}</td>
                  <td className={cellClass}>{item.expiresOn ? expiryText(item.expiresOn, today) : "—"}</td>
                  <td className={cellClass}>{isOpened(item) && <Badge variant="opened">Opened</Badge>}</td>
                  <td className="px-md py-xxs">
                    <ItemActions item={item} />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-sm tablet:hidden">
        {items.map((item) => (
          <Card key={item.id} as="li" className="flex flex-col gap-xs text-body-sm">
            {item.id === editId ? (
              <EditPantryItemForm item={item} />
            ) : (
              <>
                <span className="flex items-baseline justify-between gap-md">
                  <span>{item.name}</span>
                  <span className="text-stone">{formatQuantity(item.quantity, item.unit)}</span>
                </span>
                {(item.expiresOn || isOpened(item)) && (
                  <span className="flex flex-wrap items-center gap-xs text-stone">
                    {item.expiresOn && <span>Expires {expiryText(item.expiresOn, today)}</span>}
                    {isOpened(item) && <Badge variant="opened">Opened</Badge>}
                  </span>
                )}
                <ItemActions item={item} />
              </>
            )}
          </Card>
        ))}
      </ul>
    </>
  );
}
