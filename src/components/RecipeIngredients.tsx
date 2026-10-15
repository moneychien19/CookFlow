import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import type { RecipeDetail } from "@/lib/db/recipes";
import { type IngredientStatus, ingredientStatus } from "@/lib/recipe-display";

const BADGES: Record<IngredientStatus, { variant: BadgeVariant; text: string }> = {
  have: { variant: "have", text: "Have" },
  some: { variant: "have", text: "Have some" },
  missing: { variant: "missing", text: "Missing" },
  staple: { variant: "neutral", text: "Staple" },
};

type RecipeIngredientsProps = {
  ingredients: RecipeDetail["ingredients"];
  /** The cook's pantry: ingredient id → quantity in its canonical unit. */
  pantry: ReadonlyMap<number, number>;
};

/** The recipe's ingredients as the source wrote them, each marked against the cook's pantry. */
export function RecipeIngredients({ ingredients, pantry }: RecipeIngredientsProps) {
  const statuses = ingredients.map((ingredient) =>
    ingredientStatus({ need: ingredient.quantity, have: pantry.get(ingredient.ingredientId), isStaple: ingredient.isStaple }),
  );
  const needed = statuses.filter((s) => s !== "staple").length;
  const onHand = statuses.filter((s) => s === "have" || s === "some").length;
  const partly = statuses.filter((s) => s === "some").length;

  return (
    <div>
      <p className="text-body-sm text-stone">
        You have {onHand} of {needed} ingredients{partly > 0 ? ` (${partly} only partly)` : ""}.
      </p>
      <ul className="mt-md">
        {ingredients.map((ingredient, index) => {
          const badge = BADGES[statuses[index] ?? "missing"];
          return (
            <li
              key={ingredient.ingredientId}
              className="flex items-center justify-between gap-md border-b border-hairline py-sm text-body-sm last:border-b-0"
            >
              <span>
                <span className="text-ink">{ingredient.sourceName}</span>{" "}
                <span className="text-stone">{ingredient.sourceMeasure}</span>
              </span>
              <Badge variant={badge.variant}>{badge.text}</Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
