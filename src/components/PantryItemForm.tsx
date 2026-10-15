"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addItem, editItem, type PantryFormState } from "@/app/pantry/actions";
import { Button } from "@/components/ui/Button";
import { Checkbox, SelectField, TextField } from "@/components/ui/Input";
import type { IngredientOption, PantryRow } from "@/lib/db/pantry";
import { amountHint } from "@/lib/pantry-display";
import { type Unit, WEIGHED_UNITS } from "@/lib/planner";

/** Amount, expiry, and (for g/ml items only, SPEC §3) the opened box. */
function ItemFields({
  idPrefix,
  unit,
  state,
  defaults,
}: {
  idPrefix: string;
  unit: Unit | undefined;
  state: PantryFormState;
  defaults: { quantity: string; expiresOn: string; opened: boolean };
}) {
  const values = state?.values;
  return (
    <>
      <TextField
        id={`${idPrefix}-quantity`}
        name="quantity"
        label="Amount"
        inputMode="decimal"
        autoComplete="off"
        hint={unit ? amountHint(unit) : undefined}
        error={state?.fieldErrors.quantity}
        defaultValue={values?.quantity ?? defaults.quantity}
      />
      <TextField
        id={`${idPrefix}-expiresOn`}
        name="expiresOn"
        label="Expires (optional)"
        type="date"
        error={state?.fieldErrors.expiresOn}
        defaultValue={values?.expiresOn ?? defaults.expiresOn}
      />
      {unit && WEIGHED_UNITS.has(unit) && (
        <Checkbox
          name="opened"
          label="Opened"
          defaultChecked={values ? values.opened === "on" : defaults.opened}
        />
      )}
    </>
  );
}

/**
 * Add an ingredient. Adding one that's already in the pantry adds to it.
 * After a failed submit the server returns what was typed, and `submittedAt`
 * remounts the fields so they show it again.
 */
export function AddPantryItemForm({ options }: { options: IngredientOption[] }) {
  const [state, formAction, pending] = useActionState(addItem, null);
  const [ingredientId, setIngredientId] = useState(state?.values.ingredientId ?? "");
  const unit = options.find((o) => String(o.id) === ingredientId)?.unit;

  return (
    <form
      key={state?.submittedAt}
      action={formAction}
      className="grid gap-md tablet:grid-cols-2 laptop:grid-cols-4 laptop:items-start"
    >
      <SelectField
        id="add-ingredientId"
        name="ingredientId"
        label="Ingredient"
        error={state?.fieldErrors.ingredientId}
        value={ingredientId}
        onChange={(event) => setIngredientId(event.target.value)}
      >
        <option value="">Choose an ingredient</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </SelectField>
      <ItemFields
        idPrefix="add"
        unit={unit}
        state={state}
        defaults={{ quantity: "", expiresOn: "", opened: false }}
      />
      <div className="tablet:col-span-2 laptop:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add to pantry"}
        </Button>
      </div>
    </form>
  );
}

/** Inline edit of one item's amount, expiry, and opened flag. Cancel goes back to the plain list. */
export function EditPantryItemForm({ item }: { item: PantryRow }) {
  const [state, formAction, pending] = useActionState(editItem, null);
  return (
    <form key={state?.submittedAt} action={formAction} className="flex flex-col gap-md">
      <p className="text-body-sm text-ink">Edit {item.name}</p>
      <input type="hidden" name="id" value={item.id} />
      <div className="grid gap-md tablet:grid-cols-3 tablet:items-start">
        <ItemFields
          idPrefix={`edit-${item.id}`}
          unit={item.unit}
          state={state}
          defaults={{ quantity: String(item.quantity), expiresOn: item.expiresOn ?? "", opened: item.opened }}
        />
      </div>
      {state?.fieldErrors.form && <p className="text-ui text-ink">{state.fieldErrors.form}</p>}
      <div className="flex flex-wrap items-center gap-sm">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Link href="/pantry" className="inline-flex min-h-touch items-center px-xs text-ui text-stone underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
