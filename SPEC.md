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
| 2 | Pantry CRUD with practical quantities ("0.5 onion", "6 eggs", "450 g chicken") + optional expiry date |
| 3 | Single-meal suggestions ranked by pantry fit |
| 4 | **Multi-meal plan (N = 2–5 meals)** — the core differentiator |
| 5 | Plan shows projected leftovers before vs. after |
| 6 | Mark a meal cooked → pantry is deducted (idempotent) |
| 7 | One dietary filter (e.g. vegetarian) |
| 8 | CI (lint + tests) and auto-deploy on `main` |

### Stretch
- Reorder a generated plan so meals using the soonest-expiring items come first (§5 lists meals in pick order).

### Out (explicitly cut — list these in README)
- Precise unit conversion (cups ↔ grams ↔ "half an onion")
- Live external recipe API calls
- Cooking guide with timers
- Household size / skill / available-time personalization (only the dietary part is covered, by the filter)

---

## 2. Stack

- **Next.js (App Router) + TypeScript**
- **Postgres on Neon**, **Drizzle** or **Prisma** ORM
- **Auth.js** v5 with GitHub and Google sign-in and database sessions (Drizzle adapter)
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
  name          text                 -- lowercase: "onion", "egg", "chicken breast"; unique in the catalog, and within each user's own list
  unit          text                 -- canonical unit: "whole" | "pack" | "bunch" | "clove" | "count" | "g" | "ml"
  is_staple     boolean default false  -- salt, pepper, oil, water: ignored by planner
  owner_id      fk users, nullable   -- null: the shared catalog (CookFlow-Ingest); set: an ingredient that user added

pantry_items
  id            serial pk
  user_id       fk users
  ingredient_id fk ingredients
  quantity      numeric(8,2)         -- in ingredient.unit; 0.5 onion = 0.50, 300 g chicken = 300.00
  expires_on    date null
  opened        boolean default false  -- opened or partly used; see "Opened item" below
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
  quantity      numeric(8,2)         -- same canonical unit as ingredients.unit; planner only
  source_name   text                 -- ingredient name exactly as the source wrote it (§7a #9)
  source_measure text                -- measure exactly as the source wrote it, e.g. "1/2 cup chopped" (§7a #9)
  primary key (recipe_id, ingredient_id)

meal_plans
  id            serial pk
  user_id       fk users
  created_at    timestamptz
  leftovers_before int               -- count of hard-to-use leftovers, snapshot for the before/after display
  leftovers_after  int

meal_plan_items
  plan_id       fk meal_plans
  position      int                  -- 1..N
  recipe_id     fk recipes
  status        text                 -- "planned" | "cooked" | "skipped" (CHECK constraint; default "planned")
  cooked_at     timestamptz null
  primary key (plan_id, position)
```

### Quantity model (the key simplification)
Every ingredient has **one** canonical unit. Pantry and recipes both use it. No conversion at runtime.

The unit follows how people and recipes measure that food:
- Produce, herbs, eggs are counted: "half an onion" → `onion, 0.5 whole`; "six eggs" → `egg, 6 count`; "garlic" → `clove`.
- Meat, fish, cheese, and dry goods (rice, pasta) are weighed: "a 450 g pack of chicken" → `chicken breast, 450 g`. Recipes give these in weight too, so the import converts less.
- Milk and cream are measured: `milk, 1000 ml`.

The import converts a recipe's measure into the ingredient's unit once ("2 chicken breasts" → 400 g); the planner never converts.

**Opened item:** a pantry item that is
- flagged `opened` (the user ticks "opened" when adding it, or "mark cooked" left some of a `g`/`ml` item, §6), or
- counted in `whole`/`pack`/`bunch` with `0 < quantity < 1`, i.e. something already cut. Counted items don't use the flag: using 1 of 3 onions leaves 2 whole ones.

A weight alone can't tell a leftover from a smaller pack (300 g could be either), which is why weighed items need the flag.

**Hard-to-use leftover:** a non-staple opened item.

**Own ingredients:** when the catalog doesn't have something, the cook types a name and picks a unit. It's saved as an ingredient owned by them (`owner_id`), offered only to them, and deleted with their account. A typed name that's already in the catalog is sent back to the list, and retyping one of their own reuses it (in its first unit). No recipe uses an own ingredient, so the planner only counts it among leftovers.

**Adding an item that's already in the pantry** adds to its amount, keeps the earlier expiry date, and keeps it opened if either one was. The pantry has one row per ingredient, and the add form offers non-staple ingredients only (the planner ignores staples).

Recipe pages display `source_name` + `source_measure` (exact source text). The canonical `quantity` is used only by the planner and by "mark cooked".

---

## 4. Recipe data (imported offline, not live API)

Recipe data is built by a separate repo, CookFlow-Ingest, which writes `ingredients`, `recipes`, and `recipe_ingredients` straight into the database. CookFlow only reads those tables.

1. Pull recipes from TheMealDB (free).
2. Map each `strIngredientN` + `strMeasureN` to a canonical ingredient + quantity.
   - Rule-based first pass (`"1/2"` → 0.5, `"2 cloves"` → 2 clove, etc.)
   - Use Claude offline to normalize the messy rest, then **hand-review** the output.
   - Drop recipes that can't be mapped cleanly. 50 good recipes > 100 noisy ones.
3. Mark staples (`salt`, `pepper`, `olive oil`, `water`, `sugar`, ...) with `is_staple = true`.
   CookFlow-Ingest writes only catalog rows (`owner_id is null`) and upserts on `(name) where owner_id is null`, so it never touches ingredients users added.
4. Keep the original `strIngredientN` / `strMeasureN` text as `source_name` / `source_measure`, and keep every word of `strInstructions`. Never truncate or reword it, because it carries the food-safety steps (§7a #9, #10). It is stored as numbered steps (`1. …\n2. …`, one per line): splitting it into steps and dropping the source's own step labels (`step 1`, `1.`) is the only change allowed, and CookFlow-Ingest checks it word by word.
5. Load the reviewed result into the database. Running it again gives the same rows, so the app stays deterministic and reproducible.

Why not call the API live: rate limits, inconsistent formats, and latency. The planner needs every candidate recipe in memory anyway (§7a #3: plan in < 5s).

---

## 5. Multi-meal planner

### Input
- `P`: pantry, `ingredient_id → { qty, unit, opened, expires_on }`
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
  P' = deduct(P', best)        # simulate cooking it; a g/ml item with some left becomes opened
return plan, leftovers(P), leftovers(P'), shopping_list
```

### Scoring
For recipe `r` against current simulated pantry `P'` (staples ignored):

```
coverage(r)   = |ingredients of r available in P'| / |non-staple ingredients of r|
if coverage(r) < 0.6: skip

use(r)        = Σ_i  (min(need_i, have_i) / have_i) × w_i      # share of item i used up, 0..1
  w_i         = 1
              + α · [item i is opened (§3)]                     # prioritize opened items
              + β · urgency(expires_on_i)                     # 0..1, higher when expiring soon

newPartial(r) = count of items that would become opened after r, i.e. not opened before
                # a g/ml item that r uses only part of; a counted item that drops to 0 < remaining < 1
                # 0.75 → 0.25 isn't new
missing(r)    = count of ingredients of r not in P'

score(r)      = use(r) − γ · newPartial(r) − δ · missing(r)
```

Weights: `α = 2, β = 3, γ = 1, δ = 1.5`.

Tuned by hand against four example pantries (2026-10-13):
- `use` counts the **share** of each item used up, not the raw quantity. Units differ per ingredient, so raw quantities let 4 garlic cloves outscore a whole pack of chicken that expires tomorrow. With shares, using up any item counts 1 before weighting.
- `β` went from 1 to 3. At 1 or 2, food expiring today lost to recipes that opened fewer packs.

`urgency(d) = clamp(1 − days_until(d) / 7, 0, 1)`; no expiry → 0.

A recipe made only of staples has coverage 0 and is skipped. Scores within `1e-9` are a tie; the recipe earlier in the input order wins, so results are deterministic.

Kept deliberately:
- **Meals are listed in the order they were picked**, not by expiry. A meal picked second can use food that expires sooner than the first meal's (see Stretch).
- **A plan fills all N meals** as long as recipes pass the coverage threshold, even when a later meal scores below 0 (it mostly adds to the shopping list). The cook asked for N meals; they can skip one.

### Output
- Ordered meals
- **Projected hard-to-use leftovers: before → after**
- Shopping list = missing ingredients across the plan, including shortfalls (needs 2 onions, have 0.5 → buy 1.5), summed across meals; staples excluded

### Why greedy instead of an optimal solver (README material)
- Exact selection is a set-packing / ILP problem. With ~100 recipes and N ≤ 5 it's solvable, but greedy is explainable to users ("we used your half onion first") and fast enough to meet §7a #3 trivially: O(N · |R| · k).
- Greedy can miss a better combination. This is acceptable for now; the README notes it, and a test documents a known case.
- Weights are deterministic, so the planner is fully unit-testable.

### Tests (Vitest)
- Partial items are preferred over full ones, all else equal
- An opened `g`/`ml` item gets the α bonus and a sealed one doesn't; using part of a sealed one counts as one new opened item, and the item stays opened for later meals
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
2. For each non-staple recipe ingredient: `quantity = max(0, quantity − need)`; delete rows that reach 0. Set `opened = true` on `g`/`ml` rows that have some left (§3, "Opened item").
3. Set `status = 'cooked'`, `cooked_at = now()`.

Test: calling it twice deducts once.

---

## 7. Pages

| Route | Purpose |
|---|---|
| `/` | Landing + sign in; a short "why" in one paragraph |
| `/pantry` | List / add / edit / delete items (with an "opened" checkbox); opened and expiring items highlighted |
| `/suggest` | Single-meal suggestions ranked by score |
| `/plan/new` | Choose N + dietary filter → generate |
| `/plan/[id]` | Meals in order, leftovers before → after, shopping list, "mark cooked" |
| `/recipes/[id]` | Recipe detail: ingredients (have / missing, shown as source text) + full instructions |

User flow: view pantry (`/pantry`) → review recommendations (`/suggest`, `/plan/[id]`) → select and review a recipe (`/recipes/[id]`) → cook from the instructions → mark cooked, pantry updates. A timed cooking guide is out of scope.

Add a **demo account or "load sample pantry" button** so reviewers can try it without setting anything up. This matters more than any extra feature. It also covers §7a #4 (first-time use without help) and #8 (core features without giving PII).

**Shared demo account.** "Try the demo" on `/` sets an httpOnly `cookflow-demo` cookie and opens `/pantry` as one shared demo user (id `demo`, no email), which the same action creates if it doesn't exist yet. It's not an Auth.js provider: the server checks the cookie. Every page and Server Action gets the user from `requireUserId()`: the signed-in user, else the demo user if the cookie is set, else a redirect to `/`. A session always wins over the cookie, and signing in or out clears it. All demo visitors share one pantry and plan list; "Load sample pantry" resets it.

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
| 8 | Privacy | Low; core features must not require PII | Demo account / sample pantry works without signing in; OAuth stores only the provider account id, name, and email (no avatar, no provider tokens) |
| 9 | Accuracy | Show recipe ingredient names and quantities exactly as the source gives them | `source_name` / `source_measure` columns (§3) |
| 10 | Safety | Show source food-safety instructions without omission | Full `instructions` text stored and shown as numbered steps; never truncated or reworded (§4) |
| 11 | Interoperability | Process structured recipe data from the external source | TheMealDB → normalized recipe tables, loaded by CookFlow-Ingest (§4) |
