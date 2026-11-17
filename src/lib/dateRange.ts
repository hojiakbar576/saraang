/**
 * Date ranges in the viewer's local time zone (Tashkent for the admins).
 * `from` is inclusive, `to` is exclusive — both as Date objects.
 */
export type RangePreset = 'today' | '7d' | '30d' | 'month' | 'year' | 'all' | 'custom';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function rangeForPreset(preset: Exclude<RangePreset, 'custom'>, now = new Date()): DateRange {
  const tomorrow = addDays(startOfDay(now), 1);
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: tomorrow };
    case '7d':
      return { from: addDays(tomorrow, -7), to: tomorrow };
    case '30d':
      return { from: addDays(tomorrow, -30), to: tomorrow };
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: tomorrow };
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: tomorrow };
    case 'all':
      return { from: null, to: null };
  }
}

/** From "YYYY-MM-DD" input values (inclusive end day). Invalid or empty → open-ended. */
export function rangeFromInputs(fromValue: string, toValue: string): DateRange {
  const parse = (v: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const from = parse(fromValue);
  const toDay = parse(toValue);
  return { from, to: toDay ? addDays(toDay, 1) : null };
}

export function inRange(iso: string, range: DateRange): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  if (range.from && t < range.from.getTime()) return false;
  if (range.to && t >= range.to.getTime()) return false;
  return true;
}

/** Date → "YYYY-MM-DD" for <input type="date">. */
export function toInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
