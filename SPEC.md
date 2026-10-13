# CookFlow — Build Spec

## 0. Product context

- **Problem:** home cooks plan one meal at a time, so opened ingredients (half an onion, the rest of a pack of chicken) pile up and get thrown out.
- **Core idea:** plan several meals together around what's already in the pantry, using opened and expiring items first, with little effort from the cook and a plan that adapts when things change.
- **Target user:** cooks who make 3–6 meals a week and can judge a recipe for themselves.

## 1. Scope

### In
| # | Feature |
|---|---|
| 1 | Sign in (GitHub / Google via Auth.js) |
| 2 | Pantry CRUD with practical quantities ("0.5 onion", "6 eggs", "1 pack chicken") + optional expiry date |
| 3 | Single-meal suggestions ranked by pantry fit |
| 4 | **Multi-meal plan (N = 2–5 meals)** — the core differentiator |
| 5 | Plan shows projected leftovers before vs. after |
| 6 | Mark a meal cooked → pantry is deducted (idempotent) |
| 7 | One dietary filter (e.g. vegetarian) |
| 8 | CI (lint + tests) and auto-deploy on `main` |

### Out (explicitly cut — list these in README)
- Precise unit conversion (cups ↔ grams ↔ "half an onion")
- Live external recipe API calls
- Cooking guide with timers
- Household size / skill / available-time personalization (only the dietary part is covered, by the filter)

---

## 2. Stack

- **Next.js (App Router) + TypeScript**
- **Postgres on Neon**, **Drizzle** or **Prisma** ORM
- **Auth.js** (GitHub provider is fastest; Google optional)
- **Vercel** for hosting (preview deploys per PR)
- **Vitest** for planner unit tests
- **GitHub Actions**: typecheck, lint, test on every push

---

## 3. Data model

User = household (no multi-user households).

```
users, accounts, sessions          -- managed by Auth.js adapter

ingredients
  id            serial pk
  name          text unique          -- canonical, lowercase: "onion", "egg", "chicken breast"
  unit          text                 -- canonical practical unit: "whole" | "pack" | "bunch" | "clove" | "count"
  is_staple     boolean default false  -- salt, pepper, oil, water: ignored by planner

pantry_items
  id            serial pk
  user_id       fk users
  ingredient_id fk ingredients
  quantity      numeric(6,2)         -- in ingredient.unit; 0.5 onion = 0.50
  expires_on    date null
  updated_at    timestamptz
  unique (user_id, ingredient_id)

recipes
  id            serial pk
  title         text
  source        text                 -- "themealdb"
  source_id     text
  image_url     text
  instructions  text
  servings      int
  tags          text[]               -- "vegetarian", "chicken", ...

recipe_ingredients
  recipe_id     fk recipes
  ingredient_id fk ingredients
  quantity      numeric(6,2)         -- same canonical unit as ingredients.unit; planner only
  source_name   text                 -- ingredient name exactly as the source wrote it (§7a #9)
  source_measure text                -- measure exactly as the source wrote it, e.g. "1/2 cup chopped" (§7a #9)
  primary key (recipe_id, ingredient_id)

meal_plans
  id            serial pk
  user_id       fk users
  created_at    timestamptz
  leftovers_before numeric           -- snapshot for the before/after display
  leftovers_after  numeric

meal_plan_items
  plan_id       fk meal_plans
  position      int                  -- 1..N
  recipe_id     fk recipes
  status        text                 -- "planned" | "cooked" | "skipped"
  cooked_at     timestamptz null
  primary key (plan_id, position)
```

### Quantity model (the key simplification)
Every ingredient has **one** canonical practical unit. Pantry and recipes both use it. No conversion at runtime.

- "half an onion" → `onion, 0.5 whole`
- "six eggs" → `egg, 6 count`
- "a box of chicken" → `chicken breast, 1 pack`

**Hard-to-use leftover:** a pantry item with `0 < quantity < 1` in a `whole`/`pack`/`bunch` unit — i.e. something already opened or cut.

Recipe pages display `source_name` + `source_measure` (exact source text). The canonical `quantity` is used only by the planner and by "mark cooked".

---

## 4. Recipe data (seed, not live API)

1. Script pulls ~80–100 recipes from TheMealDB (free).
2. Map each `strIngredientN` + `strMeasureN` to a canonical ingredient + quantity.
   - Rule-based first pass (`"1/2"` → 0.5, `"2 cloves"` → 2 clove, etc.)
   - Use Claude offline to normalize the messy rest, then **hand-review** the output.
   - Drop recipes that can't be mapped cleanly. 50 good recipes > 100 noisy ones.
3. Mark staples (`salt`, `pepper`, `olive oil`, `water`, `sugar`, ...) with `is_staple = true`.
4. Keep the original `strIngredientN` / `strMeasureN` text as `source_name` / `source_measure`, and keep `strInstructions` whole. Never truncate or rewrite it, because it carries the food-safety steps (§7a #9, #10).
5. Commit the result as `seed/recipes.json` and load it with a seed script. This makes the app deterministic and reproducible.

Why not call the API live: rate limits, inconsistent formats, and latency. The planner needs every candidate recipe in memory anyway (§7a #3: plan in < 5s).

---

## 5. Multi-meal planner

### Input
- `P`: pantry, `ingredient_id → { qty, expires_on }`
- `N`: number of meals (2–5)
- `R`: candidate recipes after the dietary filter

### Algorithm: greedy with simulated depletion
```
plan = []
P' = copy(P)
repeat N times:
  best = argmax over r in R \ plan of score(r, P')
  if best is null: break
  plan.append(best)
  P' = deduct(P', best)        # simulate cooking it
return plan, leftovers(P), leftovers(P'), shopping_list
```

### Scoring
For recipe `r` against current simulated pantry `P'` (staples ignored):

```
coverage(r)   = |ingredients of r available in P'| / |non-staple ingredients of r|
if coverage(r) < 0.6: skip

use(r)        = Σ_i  min(need_i, have_i) × w_i
  w_i         = 1
              + α · [item i is partial (0 < have_i < 1)]     # prioritize opened items
              + β · urgency(expires_on_i)                     # 0..1, higher when expiring soon

newPartial(r) = count of items that would become partial (0 < remaining < 1) after r
missing(r)    = count of ingredients of r not in P'

score(r)      = use(r) − γ · newPartial(r) − δ · missing(r)
```

Starting weights: `α = 2, β = 1, γ = 1, δ = 1.5`. Tune by hand against 3–4 fixture pantries.

`urgency(d) = clamp(1 − days_until(d) / 7, 0, 1)`; no expiry → 0.

### Output
- Ordered meals
- **Projected hard-to-use leftovers: before → after**
- Shopping list = missing ingredients across the plan

### Why greedy instead of an optimal solver (README material)
- Exact selection is a set-packing / ILP problem. With ~100 recipes and N ≤ 5 it's solvable, but greedy is explainable to users ("we used your half onion first") and fast enough to meet §7a #3 trivially: O(N · |R| · k).
- Greedy can miss a better combination. This is acceptable for now; the README notes it, and a test documents a known case.
- Weights are deterministic, so the planner is fully unit-testable.

### Tests (Vitest)
- Partial items are preferred over full ones, all else equal
- An expiring item is preferred over a fresh one
- Simulated depletion: the same ingredient isn't double-counted across meals
- A recipe that needs 2 onions doesn't "use" an onion you have 0.5 of beyond 0.5
- Recipes below the coverage threshold are never picked
- A dietary filter excludes non-matching recipes
- A known greedy-suboptimal fixture (documented, not "fixed")
- Benchmark: N = 5 over 100 recipes finishes well under the §7a #3 budget (5 s)

---

## 6. Mark cooked

Single DB transaction:
1. `SELECT ... FOR UPDATE` the plan item; if `status = 'cooked'` → return (idempotent, no double deduction).
2. For each non-staple recipe ingredient: `quantity = max(0, quantity − need)`; delete rows that reach 0.
3. Set `status = 'cooked'`, `cooked_at = now()`.

Test: calling it twice deducts once.

---

## 7. Pages

| Route | Purpose |
|---|---|
| `/` | Landing + sign in; a short "why" in one paragraph |
| `/pantry` | List / add / edit / delete items; partial and expiring items highlighted |
| `/suggest` | Single-meal suggestions ranked by score |
| `/plan/new` | Choose N + dietary filter → generate |
| `/plan/[id]` | Meals in order, leftovers before → after, shopping list, "mark cooked" |
| `/recipes/[id]` | Recipe detail: ingredients (have / missing, shown as source text) + full instructions |

User flow: view pantry (`/pantry`) → review recommendations (`/suggest`, `/plan/[id]`) → select and review a recipe (`/recipes/[id]`) → cook from the instructions → mark cooked, pantry updates. A timed cooking guide is out of scope.

Add a **demo account or "load sample pantry" button** so reviewers can try it without setting anything up. This matters more than any extra feature. It also covers §7a #4 (first-time use without help) and #8 (core features without giving PII).

---

## 7a. Non-functional requirements

| # | Type | Requirement | How it's met |
|---|---|---|---|
| 1 | Latency | Pantry list < 2 s | Single indexed query by `user_id` |
| 2 | Latency | Single-meal suggestions < 3 s | Recipes loaded in memory; scoring is O(\|R\| · k) |
| 3 | Latency | Multi-meal plan < 5 s | Greedy O(N · \|R\| · k); add a planner benchmark test with 100 recipes |
| 4 | Usability | First-time user can add an ingredient and get a recommendation without help | Empty-state prompts on `/pantry` and the "load sample pantry" button; checked in the Wed classmate test |
| 5 | Availability | ≥ 99% / month | Vercel + Neon managed hosting; no self-run infra |
| 6 | Compatibility | Latest 2 versions of Chrome, Safari, Edge (desktop) | Manual check in all three before submitting |
| 7 | Security | Low level | Auth.js sessions; every query is scoped by `user_id` |
| 8 | Privacy | Low; core features must not require PII | Demo account / sample pantry works without signing in; OAuth stores only provider id, name, and email |
| 9 | Accuracy | Show recipe ingredient names and quantities exactly as the source gives them | `source_name` / `source_measure` columns (§3) |
| 10 | Safety | Show source food-safety instructions without omission | Full `instructions` text stored and shown; never truncated (§4) |
| 11 | Interoperability | Process structured recipe data from the external source | TheMealDB → normalized `seed/recipes.json` (§4) |
