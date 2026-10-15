"use client";

import { useActionState, useId, useRef } from "react";
import { deleteItem } from "@/app/pantry/actions";
import { useShowSaved } from "@/components/useShowSaved";
import { Button } from "@/components/ui/Button";

const linkClass = "inline-flex min-h-touch items-center px-xs text-ui text-stone underline";

/**
 * "Delete" opens a centered modal (native <dialog>: focus stays inside, Esc
 * closes it, focus returns to the button) that asks before removing the item.
 */
export function DeleteItemButton({ id, name }: { id: number; name: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [result, formAction, pending] = useActionState(deleteItem, null);
  useShowSaved(result);

  return (
    <>
      <button
        type="button"
        className={`${linkClass} cursor-pointer`}
        aria-label={`Delete ${name}`}
        onClick={() => dialogRef.current?.showModal()}
      >
        Delete
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto rounded-lg bg-surface p-lg text-ink shadow-overlay backdrop:bg-ink/40"
      >
        <h2 id={titleId} className="text-body-lg">
          Remove {name} from your pantry?
        </h2>
        <p className="mt-xs text-body-sm text-stone">You can add it again any time.</p>
        {result?.ok === false && <p className="mt-xs text-ui text-ink">{result.fieldErrors.form}</p>}
        <form action={formAction} className="mt-lg flex flex-wrap justify-end gap-sm">
          <input type="hidden" name="id" value={id} />
          <Button variant="outline" onClick={() => dialogRef.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Deleting…" : "Yes, delete"}
          </Button>
        </form>
      </dialog>
    </>
  );
}
