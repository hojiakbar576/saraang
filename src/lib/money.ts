/**
 * Money is always handled as integer UZS (no fractional units, no floats).
 */
export type UZS = number;

export function assertValidAmount(amount: number): asserts amount is UZS {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error(`Invalid UZS amount: ${amount}`);
  }
}

/** 349000 → "349 000 soʻm" (narrow no-break spaces between groups). */
export function formatUZS(amount: UZS, withCurrency = true): string {
  const sign = amount < 0 ? '-' : '';
  const digits = Math.abs(Math.trunc(amount)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return withCurrency ? `${sign}${grouped} soʻm` : `${sign}${grouped}`;
}

export function multiply(price: UZS, quantity: number): UZS {
  assertValidAmount(price);
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error(`Invalid quantity: ${quantity}`);
  const total = price * quantity;
  assertValidAmount(total);
  return total;
}

export function sum(amounts: UZS[]): UZS {
  return amounts.reduce<number>((acc, a) => {
    assertValidAmount(a);
    const next = acc + a;
    assertValidAmount(next);
    return next;
  }, 0);
}
