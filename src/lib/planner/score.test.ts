import { describe, expect, it } from "vitest";
import { pantry, recipe } from "./fixtures";
import { score, simulatePantry, urgency } from "./score";

const TODAY = "2026-10-13";

function scoreOf(r: ReturnType<typeof recipe>, p: ReturnType<typeof pantry>) {
  return score(r, simulatePantry(p), TODAY);
}

function scored(result: ReturnType<typeof score>) {
  if (result.kind !== "scored") throw new Error("expected a scored recipe");
  return result;
}

describe("score", () => {
  it("prefers a partial onion over a full tomato, all else equal", () => {
    const fridge = pantry({ onion: 0.5, tomato: 1.5 });
    const usesOnion = scored(scoreOf(recipe("soup", { onion: 0.5 }), fridge));
    const usesTomato = scored(scoreOf(recipe("salad", { tomato: 0.5 }), fridge));
    expect(usesOnion.score).toBeGreaterThan(usesTomato.score);
  });

  it("prefers an item expiring tomorrow over a fresh one", () => {
    const fridge = pantry({ onion: { qty: 1, expiresOn: "2026-10-14" }, tomato: 1 });
    const usesExpiring = scored(scoreOf(recipe("soup", { onion: 1 }), fridge));
    const usesFresh = scored(scoreOf(recipe("salad", { tomato: 1 }), fridge));
    expect(usesExpiring.score).toBeGreaterThan(usesFresh.score);
  });

  it("uses at most 0.5 of a 0.5 onion even when the recipe needs 2", () => {
    const fridge = pantry({ onion: 0.5 });
    const needsTwo = scored(scoreOf(recipe("onion tart", { onion: 2 }), fridge));
    const needsHalf = scored(scoreOf(recipe("soup", { onion: 0.5 }), fridge));
    expect(needsTwo.use).toBeCloseTo(needsHalf.use);
  });

  it("skips a recipe covering under 60% of its non-staple ingredients", () => {
    const fridge = pantry({ onion: 1 });
    const result = scoreOf(recipe("stew", { onion: 1, tomato: 1, leek: 1 }), fridge);
    expect(result.kind).toBe("skipped");
  });

  it("does not skip a recipe covering exactly 60%", () => {
    const fridge = pantry({ onion: 1, tomato: 1, leek: 1 });
    const result = scoreOf(
      recipe("stew", { onion: 1, tomato: 1, leek: 1, carrot: 1, parsley: 1 }),
      fridge,
    );
    expect(result.kind).toBe("scored");
  });

  it("ignores staples when computing coverage", () => {
    const fridge = pantry({ onion: 1 });
    const result = scoreOf(recipe("soup", { onion: 1, salt: 1, pepper: 1 }), fridge);
    expect(result.kind).toBe("scored");
  });

  it("skips a recipe made only of staples", () => {
    const result = scoreOf(recipe("seasoning", { salt: 1 }), pantry({ salt: 1 }));
    expect(result.kind).toBe("skipped");
  });

  it("scores a recipe missing an ingredient below one with everything on hand", () => {
    const fridge = pantry({ onion: 1, tomato: 1, leek: 1 });
    const complete = scored(scoreOf(recipe("a", { onion: 1, tomato: 1, leek: 1 }), fridge));
    const missingOne = scored(
      scoreOf(recipe("b", { onion: 1, tomato: 1, leek: 1, carrot: 1 }), fridge),
    );
    expect(missingOne.missing).toBe(1);
    expect(missingOne.score).toBeLessThan(complete.score);
  });

  it("penalizes leaving a whole item half-used", () => {
    const fridge = pantry({ onion: 1, tomato: 1 });
    const result = scored(scoreOf(recipe("soup", { onion: 0.5, tomato: 1 }), fridge));
    expect(result.newPartial).toBe(1);
  });

  it("does not count an already-opened item as a new partial", () => {
    const fridge = pantry({ onion: 0.75 });
    const result = scored(scoreOf(recipe("soup", { onion: 0.5 }), fridge));
    expect(result.newPartial).toBe(0);
  });
});

describe("urgency", () => {
  it("is 0 with no expiry date", () => {
    expect(urgency(null, TODAY)).toBe(0);
  });

  it("is 1 for an item expiring today", () => {
    expect(urgency("2026-10-13", TODAY)).toBe(1);
  });

  it("stays at 1 for an item that already expired", () => {
    expect(urgency("2026-10-01", TODAY)).toBe(1);
  });

  it("falls linearly to 0 over a week", () => {
    expect(urgency("2026-10-16", TODAY)).toBeCloseTo(4 / 7);
    expect(urgency("2026-10-20", TODAY)).toBe(0);
    expect(urgency("2026-11-30", TODAY)).toBe(0);
  });
});
