import { notFound } from "next/navigation";
import { RecipeIngredients } from "@/components/RecipeIngredients";
import { getDb } from "@/lib/db/client";
import { listPantry } from "@/lib/db/pantry";
import { getRecipe } from "@/lib/db/recipes";
import { instructionSteps } from "@/lib/recipe-display";
import { requireUserId } from "@/lib/session";

/** Where the recipe came from, for the credit line. */
const sourceUrl = (source: string, sourceId: string) =>
  source === "themealdb" ? `https://www.themealdb.com/meal/${encodeURIComponent(sourceId)}` : null;

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const userId = await requireUserId();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const db = getDb();
  const [recipe, pantryItems] = await Promise.all([getRecipe(db, Number(id)), listPantry(db, userId)]);
  if (!recipe) notFound();

  const pantry = new Map(pantryItems.map((item) => [item.ingredientId, item.quantity]));
  const steps = instructionSteps(recipe.instructions);
  const credit = sourceUrl(recipe.source, recipe.sourceId);

  return (
    <article>
      {recipe.tags.length > 0 && (
        <p className="text-eyebrow uppercase text-stone">{recipe.tags.join(" · ")}</p>
      )}
      <h1 className="mt-xs font-serif text-heading-2">{recipe.title}</h1>

      {/* No photo: TheMealDB's images may carry rights we haven't cleared. */}
      <div className="mt-xl grid gap-xl tablet:grid-cols-5 tablet:items-start">
        <section aria-labelledby="ingredients-heading" className="tablet:col-span-2">
          <h2 id="ingredients-heading" className="text-title">
            Ingredients
          </h2>
          <div className="mt-sm">
            <RecipeIngredients ingredients={recipe.ingredients} pantry={pantry} />
          </div>
        </section>

        <section aria-labelledby="steps-heading" className="tablet:col-span-3">
          <h2 id="steps-heading" className="text-title">
            Steps
          </h2>
          {/* Every word of the source's instructions, never truncated (SPEC §7a #10). */}
          {steps ? (
            <ol className="mt-md flex list-decimal flex-col gap-md pl-lg text-body">
              {steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="mt-md whitespace-pre-line text-body">{recipe.instructions}</p>
          )}
        </section>
      </div>

      {credit && (
        <p className="mt-2xl text-body-sm text-stone">
          Recipe from{" "}
          <a href={credit} className="text-stone underline">
            TheMealDB
          </a>
          .
        </p>
      )}
    </article>
  );
}
