# CookFlow — Agent Instructions

CookFlow plans several meals at once around what's already in the pantry, so opened and expiring ingredients get used up.

## Source-of-truth documents

| File | What it governs | Rule |
|---|---|---|
| [SPEC.md](SPEC.md) | Scope, data model, planner algorithm, pages, non-functional requirements | Build only what's listed under **In** (and **Stretch** when asked). Never build anything under **Out**. If a decision changes, update SPEC.md in the same change. |
| [DESIGN.md](DESIGN.md) | Visual language: colors, type, spacing, radius, elevation, component styling | All UI follows it, adapted as described in [Design guidelines](#design-guidelines). |
| [README.md](README.md) | Public description of the project | Keep it in sync when features, commands, or trade-offs change. |

### Writing rules for repo docs
- Don't use the word "MVP".
- Don't mention coursework, workbooks, or where the idea came from.
- Don't include business goals (pricing, market size, positioning, competitors' business). Describe the product idea and what the code does.

## Commands

```bash
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest run
npm run db:generate  # generate a migration after changing lib/db/schema.ts
npm run db:migrate   # apply migrations
npm run db:seed      # validate seed/*.json and upsert ingredients + recipes (idempotent)
```

Before calling a task done, run `npm run typecheck && npm run lint && npm test`; all three must pass (CI runs the same).

## Project layout

```
src/
  app/                 # Next.js App Router routes (see SPEC §7)
  components/ui/       # design-system primitives (Button, Card, Input, Badge, ...)
  components/          # feature components (PantryList, PlanView, ...)
  lib/planner/         # pure TS planner: no DB, no Next.js, no I/O
  lib/db/              # schema, client, queries
  lib/auth.ts          # Auth.js config
  styles/globals.css   # design tokens (see below)
seed/                  # recipes.json, ingredients.json, seed script
tests/ or *.test.ts    # Vitest, colocated next to the code is fine
```

## TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess`. No `any`; use `unknown` and narrow it. No `@ts-ignore`; if you really need one, use `@ts-expect-error` with a reason.
- Prefer `type` aliases and discriminated unions over enums. Status values are string-literal unions: `type MealStatus = "planned" | "cooked" | "skipped"`.
- Validate every external input (form data, route params, seed JSON, TheMealDB responses) with **zod** at the boundary. Infer types from schemas (`z.infer`) instead of writing them twice.
- Functions in `lib/` return plain data. Throw only for programmer errors; return a result (`{ ok: false, error }`) for expected failures like validation.
- Named exports only, except where Next.js requires a default export (`page.tsx`, `layout.tsx`, ...).
- Imports use the `@/` alias rooted at `src/`.

### Quantities: avoid float bugs
- Postgres `numeric` comes back from the driver as a **string**. Convert it once in the query layer, not in components.
- Inside the planner, work in **integer hundredths** (0.5 onion → 50, 300 g → 30000) or compare with an epsilon. Never use `===` on computed floats. `0 < qty < 1` partial checks must hold for values like `1 - 0.5 - 0.5`.
- "Opened" is defined once, in SPEC §3: the `opened` flag, or a counted `whole`/`pack`/`bunch` item with `0 < qty < 1`. Use one shared helper for it, not ad-hoc checks.
- Round to 2 decimals before writing back to the DB.

## Next.js (App Router)

- Components are **Server Components by default**. Add `"use client"` only to the smallest leaf that needs state, effects, or event handlers.
- Fetch data in Server Components by calling `lib/db` functions directly. Don't build API routes for your own pages.
- Do mutations (pantry CRUD, generate plan, mark cooked) as **Server Actions**. Each one must:
  1. call `auth()` and reject if there's no session (or use the demo user, see SPEC §7),
  2. validate input with zod,
  3. scope every query by the session's `user_id`. **Never trust a user id from the client.**
  4. call `revalidatePath` for affected routes.
- Use `loading.tsx` / `error.tsx` / `not-found.tsx` per route segment rather than ad-hoc spinners.
- Use `next/image` for recipe images (add TheMealDB's host to `images.remotePatterns`) and `next/font` for fonts.
- Keep secrets in env vars read on the server only. Never prefix a secret with `NEXT_PUBLIC_`. Never commit `.env*` except `.env.example`.

## Database

- Default ORM is **Drizzle** with Neon's serverless driver, unless SPEC.md says otherwise. Schema lives in `lib/db/schema.ts`; migrations are generated, committed, and never edited after they're applied.
- Do multi-step writes in a transaction. "Mark cooked" must follow SPEC §6 exactly: row lock, idempotent check, deduct, set status.
- Add an index for every `user_id` foreign key the pages filter on.

## Planner

- `lib/planner` is a pure function of `(pantry, recipes, n, options) → result`. It doesn't touch Date.now() (pass `today` in), randomness, or the DB, so tests are deterministic.
- Weights (`α, β, γ, δ`) and the coverage threshold are named constants in one file, matching SPEC §5.
- Every planner behavior in SPEC §5 "Tests" has a Vitest test. When you change scoring, add or update a test first.

## Testing

- Vitest. Test behavior, not implementation details. Each test name reads as a sentence: `"prefers a partial onion over a full one"`.
- Build fixtures with small factory helpers (`pantry({ onion: 0.5 })`, `recipe("soup", { onion: 1 })`), not large JSON blobs.
- DB-dependent logic (mark cooked idempotency) is tested against a real Postgres (Neon branch or local), not mocks. Name those files `*.db.test.ts`; they read only `TEST_DATABASE_URL` (shell or `.env.local`) and are skipped when it isn't set. Point it at a Neon dev branch, never production.

## Design guidelines

[DESIGN.md](DESIGN.md) is an analysis of a wellness brand's marketing website. Use it as **design language only**:

- **Never** use the brand's name, wordmark, logo, product imagery, or copy. CookFlow has its own name and text.
- Ignore marketing-only parts that don't apply to an app: hero-sized display type on app pages, `product-card`, `person-card`, `news-card`, the silver "product stage", `announcement-bar`, and the `ex-pricing-tier` / `ex-cart-drawer` / `ex-product-selector` examples.

### Tokens
- Copy the YAML front-matter tokens into CSS custom properties in `src/styles/globals.css` with Tailwind v4 `@theme`, using Tailwind's namespaces and DESIGN.md's names: `--color-canvas`, `--radius-lg`, `--spacing-md`, `--text-heading-2`, `--shadow-soft`, and so on. That yields utilities like `bg-canvas`, `rounded-lg`, `p-md`, `text-heading-2`. Tailwind's default theme is reset, so only these tokens exist. `tests/design-tokens.test.ts` fails if globals.css and DESIGN.md drift apart, and `tests/design-lint.test.ts` fails on raw hex, px, or arbitrary `[...]` values in `src/`.
- Type tokens carry size, line height, weight, and tracking. Add `font-serif` to elements using an Editorial New role (`display*`, `heading-1`, `heading-2`, `lead`).
- Components reference tokens only. **No raw hex values, px font sizes, or ad-hoc radii in components.** If a value is missing, add a token to globals.css and DESIGN.md, not a one-off.

### Fonts
Both brand faces are proprietary. Use the open substitutes DESIGN.md names, via `next/font/google`:
- Display / headings (Editorial New role): **Fraunces**, light weight (300).
- Everything else (AkkuratLL role): **Inter**.

### Adapting the type scale to an app
| App element | Token |
|---|---|
| Landing page headline (`/` only) | `display-2`; scale down to ~48px on mobile |
| Page title (`/pantry`, `/plan/[id]`, ...) | `heading-2` |
| Card / section title | `title` (sans), shrink to ~24px if `title` feels too large in dense layouts |
| Body | `body` (18px); `body-sm` (16px) in tables, lists, and forms |
| Labels, tabs, nav | `ui` |
| Section overlines ("THIS WEEK'S PLAN") | `eyebrow` |

The serif is for headings ≥ 24px only. Never set body text, labels, or numbers in a table in the serif.

### Color roles in CookFlow
- **Canvas `#f7f1e8` is the page background everywhere.** White (`surface`) is only for cards and inputs.
- **Action blue (`primary`) appears at most once per view**, on that view's decisive action: "Generate plan" on `/plan/new`, "Mark cooked" on the *next* uncooked meal on `/plan/[id]`, "Load sample pantry" on an empty pantry. Every other button is `button-secondary` (stone) or `button-outline-stone`.
- Never use blue for links, icons, or highlights. Links are `stone`, underlined.
- Earth tones are for **status and data**, never for buttons:
  | Meaning | Treatment |
  |---|---|
  | Partial / opened item | `gold-pale` badge with `espresso` text |
  | Expiring within 3 days | `clay` badge with white text |
  | Ingredient you have (recipe page) | `sage-pale` badge with `forest` text (olive text on sage-pale is below AA) |
  | Missing ingredient / shopping list | `hairline` border or divider; `stone` text for anything essential (`ash` only for non-essential captions) |
  | Leftovers before → after | "Before" in `gold`, "after" in `olive`; show it as a `stat-badge` pair |
- `error` is only for validation errors and destructive confirmation. Use it for the input border **only when the field is invalid**, not on focus. Error message text is `ink`: `error` on white or canvas is below AA for small text.

### Components
- Buttons: fully rounded pills (`rounded.full`), `typography.button`, at least 44px tall.
- Cards: `feature-card` (white, hairline border, `rounded.lg`, `spacing.lg` padding) is the default container for pantry items, meals, and recipes.
- Inputs: DESIGN.md's stone-filled `text-input` is a footer newsletter field. In app forms, use a white field with a `hairline` border, `rounded.md`, and a `stone` focus ring.
- Tables (pantry list on desktop): follow `ex-data-table-cell`, with `eyebrow` headers, `body-sm` cells and `hairline` row borders.
- Empty states: `ex-empty-state-card` with one sentence and the single blue action.
- Toasts (e.g. "Pantry updated"): `ex-toast`.
- Elevation: flat by default; soft, low-opacity shadows only for modals and toasts. No hard shadows, gradients, or glassmorphism.

### Layout and responsiveness
- 8px base spacing; generous vertical gaps between sections.
- Center content in a max-width container (~1120px). Card grids go 3-up → 2-up → 1-up at the DESIGN.md breakpoints.
- Must work at 375px width with no horizontal scroll. Desktop Chrome, Safari, and Edge are the supported browsers (SPEC §7a #6), but don't break mobile.
- Light theme only. DESIGN.md defines no dark palette; don't invent one.

### Accessibility
- Body text must meet WCAG AA (4.5:1). `ink` and `stone` on canvas pass. **`ash` and `mute` on canvas don't pass for body text**, so use them only for captions ≥ 13px that aren't essential, or switch to `stone`.
- Every interactive element is keyboard-reachable with a visible focus ring (`stone`, 2px offset).
- Status is never shown by color alone: badges always carry text ("Opened", "Expires in 2 days").
- Images have meaningful `alt`; form fields have `<label>`s.

## Working style

- Make small, focused changes; one concern per commit. Use conventional commit messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Don't add dependencies without a reason. Prefer the platform and the stack in SPEC §2.
- Don't leave TODOs without context. If something's deferred, note it in SPEC.md under Stretch or Out.
- When unsure whether something is in scope, check SPEC.md first, then ask.
