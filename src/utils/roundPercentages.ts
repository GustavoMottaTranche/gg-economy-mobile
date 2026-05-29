/**
 * Rounds percentages to integers while ensuring they sum to exactly 100.
 * Uses the largest-remainder method (Hamilton's method).
 *
 * @param values - Array of numeric values (e.g., monetary amounts)
 * @param total - The total sum to compute percentages against
 * @returns Array of integer percentages that sum to exactly 100 (or all zeros if total is 0)
 */
export function roundPercentages(values: number[], total: number): number[] {
  if (total === 0) return values.map(() => 0);

  const rawPercentages = values.map((v) => (v / total) * 100);
  const floored = rawPercentages.map(Math.floor);
  const remainders = rawPercentages.map((raw, i) => raw - (floored[i] ?? 0));

  const remaining = 100 - floored.reduce((sum, v) => sum + v, 0);

  // Distribute remaining points to entries with largest remainders
  const indices = remainders
    .map((r, i) => ({ remainder: r, index: i }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < remaining && i < indices.length; i++) {
    const idx = indices[i]!.index;
    floored[idx] = (floored[idx] ?? 0) + 1;
  }

  return floored;
}
