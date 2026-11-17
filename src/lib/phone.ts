/**
 * Uzbekistan phone numbers: +998 followed by a 2-digit operator/area code and
 * 7 digits. Accepts common user input forms ("90 123 45 67", "+998 (90) 123-45-67",
 * "998901234567") and normalises to "+998901234567".
 */
export function normalizeUzPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 9) digits = `998${digits}`;
  if (digits.length !== 12 || !digits.startsWith('998')) return null;
  return `+${digits}`;
}

/** "+998901234567" → "+998 90 123 45 67". Returns input unchanged if it cannot be parsed. */
export function formatUzPhone(value: string): string {
  const n = normalizeUzPhone(value);
  if (!n) return value;
  const d = n.slice(4);
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

/**
 * Progressive formatting while typing the 9 local digits after the fixed +998 prefix.
 * "901234" → "90 123 4"
 */
export function formatLocalPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('998') && d.length > 9) d = d.slice(3);
  d = d.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(' ');
}
