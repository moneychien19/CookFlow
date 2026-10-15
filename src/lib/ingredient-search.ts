/** Lowercase with single spaces: how ingredient names are stored and compared. */
export function normalizeIngredientName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Ingredients matching a typed query, best first: names that start with it,
 * then names with a word that starts with it ("breast" → "chicken breast"),
 * then any other name containing it. Ties keep the input (alphabetical) order.
 */
export function searchIngredients<T extends { name: string }>(options: readonly T[], query: string, limit = 8): T[] {
  const q = normalizeIngredientName(query);
  if (q === "") return [];
  const rank = (name: string) =>
    name.startsWith(q) ? 0 : name.split(" ").some((word) => word.startsWith(q)) ? 1 : name.includes(q) ? 2 : 3;
  return options
    .map((option, index) => ({ option, index, rank: rank(option.name) }))
    .filter((match) => match.rank < 3)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((match) => match.option);
}
