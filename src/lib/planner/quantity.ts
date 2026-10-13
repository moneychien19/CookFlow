/** Quantities inside the planner are integer hundredths: 0.5 onion → 50. */
export const ONE = 100;

export function toHundredths(quantity: number): number {
  // `+ 0` turns -0 (from float noise just below zero) into 0.
  return Math.round(quantity * ONE) + 0;
}

export function fromHundredths(hundredths: number): number {
  return hundredths / ONE;
}

/** Opened or cut: more than nothing, less than one unit. */
export function isPartial(hundredths: number): boolean {
  return hundredths > 0 && hundredths < ONE;
}
