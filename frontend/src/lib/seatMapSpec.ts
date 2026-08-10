import type { SeatPricingOverride } from "@/types/seatMap";

export const validateSeatPricingOverrides = (
  overrides: SeatPricingOverride[],
  rows: number,
  cols: number
): string | null => {
  const coordinates = new Set<string>();

  for (const override of overrides) {
    if (
      !Number.isInteger(override.x) ||
      !Number.isInteger(override.y) ||
      override.x < 1 ||
      override.x > rows ||
      override.y < 1 ||
      override.y > cols
    ) {
      return `Seat override (${override.x},${override.y}) is outside the ${rows}×${cols} grid.`;
    }
    if (!override.tier.trim()) return "Every seat override needs a tier name.";
    if (!Number.isFinite(override.price) || override.price < 0) {
      return "Every seat override needs a non-negative price.";
    }

    const key = `${override.x},${override.y}`;
    if (coordinates.has(key)) return `Seat (${key}) is overridden more than once.`;
    coordinates.add(key);
  }

  return null;
};
