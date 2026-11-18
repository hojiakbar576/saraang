import { currentLang, type Lang } from '@/i18n';

/**
 * Money is always handled as integer UZS (no fractional units, no floats).
 */
export type UZS = number;

export function assertValidAmount(amount: number): asserts amount is UZS {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error(`Invalid UZS amount: ${amount}`);
  }
}

const CURRENCY: Record<Lang, string> = { uz: 'soʻm', ru: 'сум', en: 'UZS' };

/** Currency label for the current language: "soʻm" / "сум" / "UZS". */
export function currencyLabel(lang: Lang = currentLang()): string {
  return CURRENCY[lang];
}

/**
 * uz: "349 000 soʻm", ru: "349 000 сум", en: "349,000 UZS".
 * Always whole so'm; groups use no-break spaces (uz/ru) or commas (en).
 */
export function formatUZS(amount: UZS, withCurrency = true, lang: Lang = currentLang()): string {
  const sign = amount < 0 ? '-' : '';
  const digits = Math.abs(Math.trunc(amount)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : '\u00A0');
  return withCurrency ? `${sign}${grouped}\u00A0${CURRENCY[lang]}` : `${sign}${grouped}`;
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
