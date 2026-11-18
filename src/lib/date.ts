import { currentLang, t, type Lang } from '@/i18n';

const pad = (n: number) => String(n).padStart(2, '0');

function parse(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Date in the viewer's local time zone.
 * uz / ru: "17.11.2026" · en: "17 Nov 2026".
 */
export function formatDate(iso: string, lang: Lang = currentLang()): string {
  const d = parse(iso);
  if (!d) return '—';
  if (lang === 'en') {
    const months = t('dates.monthsShort', { returnObjects: true, lng: 'en' }) as string[];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** Date and 24-hour time: "17.11.2026, 14:05" · en: "17 Nov 2026, 14:05". */
export function formatDateTime(iso: string, lang: Lang = currentLang()): string {
  const d = parse(iso);
  if (!d) return '—';
  return `${formatDate(iso, lang)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
