/**
 * Usual price: sale price + 10%. Rounds UP only when the result has a real
 * fractional cent; float noise (e.g. 1584.0000000000002) is ignored.
 */
export function usualPrice(salePrice: number): number {
  // Snap to cent precision first to eliminate float error.
  const raw = Math.round(salePrice * 1.10 * 100) / 100;
  return Number.isInteger(raw) ? raw : Math.ceil(raw);
}

export function formatPrice(value: number): string {
  const whole = Number.isInteger(value) ? value : Math.ceil(value);
  return `$${whole.toLocaleString("en-US")}`;
}
