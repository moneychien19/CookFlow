"use client";

import { type KeyboardEvent, useId, useState } from "react";
import { Input, Label } from "@/components/ui/Input";
import { cx } from "@/components/ui/cx";
import type { IngredientOption } from "@/lib/db/pantry";
import { normalizeIngredientName, searchIngredients } from "@/lib/ingredient-search";

type Item = { kind: "option"; option: IngredientOption } | { kind: "new"; name: string };

type IngredientComboboxProps = {
  options: IngredientOption[];
  text: string;
  onTextChange: (text: string) => void;
  error?: string;
};

/**
 * Type to search the ingredient list (WAI-ARIA combobox with a listbox popup).
 * Picking a suggestion sets the text to its name; a name that isn't in the list
 * gets an "Add … as a new ingredient" entry. The parent reads the text.
 */
export function IngredientCombobox({ options, text, onTextChange, error }: IngredientComboboxProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = normalizeIngredientName(text);
  const exact = options.some((option) => option.name === query);
  const items: Item[] = [
    ...searchIngredients(options, text).map((option) => ({ kind: "option" as const, option })),
    ...(query && !exact ? [{ kind: "new" as const, name: query }] : []),
  ];
  const expanded = open && items.length > 0;
  const optionId = (index: number) => `${id}-option-${index}`;

  function choose(item: Item) {
    if (item.kind === "option") onTextChange(item.option.name);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!expanded) {
        setOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + items.length) % items.length);
    } else if (event.key === "Enter" && expanded) {
      const item = items[active];
      if (item) {
        // Choosing a suggestion, not submitting the form.
        event.preventDefault();
        choose(item);
      }
    } else if (event.key === "Escape" && expanded) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="flex flex-col gap-xxs">
      <Label htmlFor={inputId}>Ingredient</Label>
      <div className="relative">
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          placeholder="Start typing, e.g. onion"
          invalid={Boolean(error)}
          value={text}
          onChange={(event) => {
            onTextChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {expanded && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Ingredients"
            className="absolute inset-x-0 top-full z-10 mt-xxs rounded-md border border-hairline bg-surface py-xxs shadow-soft"
          >
            {items.map((item, index) => (
              <li
                key={item.kind === "option" ? item.option.id : "new"}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                // Keep focus in the input so the list doesn't close before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                className={cx(
                  "flex min-h-touch cursor-pointer items-center justify-between gap-md px-md text-body-sm text-ink",
                  index === active && "bg-canvas",
                )}
              >
                {item.kind === "option" ? (
                  <>
                    <span>{item.option.name}</span>
                    <span className="text-ui text-stone">
                      {item.option.custom ? `yours · ${item.option.unit}` : item.option.unit}
                    </span>
                  </>
                ) : (
                  `Add "${item.name}" as a new ingredient`
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* ink, not the error color: error text on white is below 4.5:1. */}
      {error && (
        <p id={errorId} className="text-ui text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
