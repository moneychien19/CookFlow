"use client";

import Link from "next/link";
import { type Ref, useActionState, useEffect, useId, useRef, useState } from "react";
import { addItem, editItem, type PantryFormState } from "@/app/pantry/actions";
import { Button } from "@/components/ui/Button";
import { Checkbox, SelectField, TextField } from "@/components/ui/Input";
import type { IngredientOption, PantryRow } from "@/lib/db/pantry";
import { IngredientCombobox } from "@/components/IngredientCombobox";
import { useShowSaved } from "@/components/useShowSaved";
import { normalizeIngredientName } from "@/lib/ingredient-search";
import { amountHint, UNIT_CHOICES } from "@/lib/pantry-display";
import { type Unit, WEIGHED_UNITS } from "@/lib/planner";

type FailedState = Extract<PantryFormState, { ok: false }> | null;

/** The state to show in the form: only a failed submit has errors and typed values. */
const failedOnly = (state: PantryFormState): FailedState => (state?.ok === false ? state : null);

/** Amount, expiry, and (for g/ml items only, SPEC §3) the opened box. */
function ItemFields({
  idPrefix,
  unit,
  state,
  defaults,
  quantityRef,
}: {
  quantityRef?: Ref<HTMLInputElement>;
  idPrefix: string;
  unit: Unit | undefined;
  state: FailedState;
  defaults: { quantity: string; expiresOn: string; opened: boolean };
}) {
  const values = state?.values;
  return (
    <>
      <TextField
        id={`${idPrefix}-quantity`}
        ref={quantityRef}
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
 * Add an ingredient: search the list, or type a new name and pick its unit.
 * Adding one that's already in the pantry adds to it. After a failed submit the
 * server returns what was typed, and `submittedAt` remounts the fields to show it.
 */
export function AddPantryItemForm({ options }: { options: IngredientOption[] }) {
  const [result, formAction, pending] = useActionState(addItem, null);
  useShowSaved(result);
  const state = failedOnly(result);
  const [text, setText] = useState(() => {
    const picked = options.find((o) => String(o.id) === state?.values.ingredientId);
    return picked?.name ?? state?.values.newName ?? "";
  });
  const [newUnit, setNewUnit] = useState(state?.values.newUnit ?? "");

  const name = normalizeIngredientName(text);
  const match = options.find((option) => option.name === name);
  const isNew = !match && name !== "";
  const unit = match?.unit ?? UNIT_CHOICES.find((choice) => choice.unit === newUnit)?.unit;

  return (
    <form
      key={state?.submittedAt}
      action={formAction}
      className="grid gap-md tablet:grid-cols-2 laptop:grid-cols-4 laptop:items-start"
    >
      <IngredientCombobox
        options={options}
        text={text}
        onTextChange={setText}
        error={state?.fieldErrors.ingredientId ?? state?.fieldErrors.newName}
      />
      <input type="hidden" name="ingredientId" value={match ? String(match.id) : ""} />
      <input type="hidden" name="newName" value={isNew ? text : ""} />
      {isNew && (
        <SelectField
          id="add-newUnit"
          name="newUnit"
          label={`Measure "${name}" in`}
          error={state?.fieldErrors.newUnit}
          value={newUnit}
          onChange={(event) => setNewUnit(event.target.value)}
        >
          <option value="">Choose a unit</option>
          {UNIT_CHOICES.map((choice) => (
            <option key={choice.unit} value={choice.unit}>
              {choice.label}
            </option>
          ))}
        </SelectField>
      )}
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
  const [result, formAction, pending] = useActionState(editItem, null);
  useShowSaved(result);
  const state = failedOnly(result);
  const quantityRef = useRef<HTMLInputElement>(null);
  // useId, not the item id: the row renders twice (table and phone card), and ids must stay unique.
  const idPrefix = useId();
  // Focus the amount when the row opens: keyboard users land in the form, and it scrolls into view if needed.
  useEffect(() => quantityRef.current?.focus(), []);
  return (
    <form key={state?.submittedAt} action={formAction} className="flex flex-col gap-md">
      <p className="text-body-sm text-ink">Edit {item.name}</p>
      <input type="hidden" name="id" value={item.id} />
      <div className="grid gap-md tablet:grid-cols-3 tablet:items-start">
        <ItemFields
          idPrefix={idPrefix}
          unit={item.unit}
          state={state}
          quantityRef={quantityRef}
          defaults={{ quantity: String(item.quantity), expiresOn: item.expiresOn ?? "", opened: item.opened }}
        />
      </div>
      {state?.fieldErrors.form && <p className="text-ui text-ink">{state.fieldErrors.form}</p>}
      <div className="flex flex-wrap items-center gap-sm">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Link href="/pantry" scroll={false} className="inline-flex min-h-touch items-center px-xs text-ui text-stone underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
