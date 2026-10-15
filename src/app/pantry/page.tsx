import { FlashToast } from "@/components/FlashToast";
import { AddPantryItemForm } from "@/components/PantryItemForm";
import { PantryList } from "@/components/PantryList";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDb } from "@/lib/db/client";
import { listIngredientOptions, listPantry } from "@/lib/db/pantry";
import { todayIso } from "@/lib/dates";
import { DEMO_USER_ID } from "@/lib/demo";
import { requireUserId } from "@/lib/session";
import { loadSamplePantry } from "./actions";

/** A search param as a single string; anything else (absent, repeated) is undefined. */
const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function PantryPage({ searchParams }: PageProps<"/pantry">) {
  const userId = await requireUserId();
  const params = await searchParams;
  const db = getDb();
  const [items, options] = await Promise.all([listPantry(db, userId), listIngredientOptions(db, userId)]);
  const today = todayIso(new Date());
  // Only an id from this user's own list opens a row for editing.
  const editParam = Number(single(params.edit));
  const editId = items.some((item) => item.id === editParam) ? editParam : null;
  const saved = single(params.saved);

  return (
    <>
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-start tablet:justify-between">
        <div>
          <h1 className="font-serif text-heading-2">Pantry</h1>
          {userId === DEMO_USER_ID && (
            <p className="mt-xs text-body-sm text-stone">
              This is the shared demo pantry: anyone trying the demo sees the same items.
            </p>
          )}
        </div>
        {items.length > 0 && (
          // A confirmation step without client JS: the reset only appears once the cook opens it.
          <details className="flex flex-col gap-sm tablet:items-end">
            <summary className={`${buttonClass("outline")} cursor-pointer list-none`}>Load sample pantry</summary>
            <form action={loadSamplePantry} className="mt-sm flex flex-col gap-sm tablet:items-end">
              <p className="text-body-sm text-stone">This replaces everything in your pantry.</p>
              <Button type="submit" variant="secondary">
                Replace my pantry
              </Button>
            </form>
          </details>
        )}
      </div>

      <Card as="section" className="mt-xl">
        <h2 className="mb-md text-body-lg">Add an item</h2>
        <AddPantryItemForm key={saved} options={options} />
      </Card>

      <div className="mt-xl">
        {items.length === 0 ? (
          <EmptyState
            message="Your pantry is empty. Start with a sample fridge to see how planning works."
            action={
              <form action={loadSamplePantry}>
                <Button type="submit" variant="primary">
                  Load sample pantry
                </Button>
              </form>
            }
          />
        ) : (
          <PantryList items={items} today={today} editId={editId} />
        )}
      </div>

      {saved && <FlashToast key={saved} message="Pantry updated" param="saved" />}
    </>
  );
}
