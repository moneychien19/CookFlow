import { readFileSync } from "node:fs";
import { join } from "node:path";

const SEED_DIR = join(process.cwd(), "seed");

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(join(SEED_DIR, file), "utf8"));
}

/** Raw, unvalidated contents of the seed files; pass to parseSeed. */
export function readSeedFiles() {
  return {
    ingredients: readJson("ingredients.json"),
    recipes: readJson("recipes.json"),
    samplePantry: readJson("sample-pantry.json"),
  };
}
