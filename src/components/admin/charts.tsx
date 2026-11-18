import { useTranslation } from 'react-i18next';
import { t } from '@/i18n';
import { useState } from 'react';
import type { Bucket, Granularity, TopEntry } from '@/features/analytics/analytics';
import { niceMax } from '@/features/analytics/analytics';
import { cn } from '@/lib/cn';

const months = () => t('dates.monthsShort', { returnObjects: true }) as string[];

export function bucketLabel(b: Bucket, g: Granularity, long = false): string {
  const d = b.start;
  const MONTHS = months();
  if (g === 'month') return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return long ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function axisMax(max: number, integer: boolean): number {
  if (integer) return Math.max(4, Math.ceil(max / 4) * 4);
  return niceMax(max);
}

interface ColumnChartProps {
  buckets: Bucket[];
  granularity: Granularity;
  integer?: boolean;
  formatValue: (v: number) => string;
  formatTick: (v: number) => string;
  /** Accessible description of what is plotted. */
  label: string;
}

/**
 * Single-series column chart over time. Thin columns (≤24px) with a 4px rounded
 * data end on one baseline, hairline gridlines, and a per-column hover/focus
 * tooltip. Zero-value buckets draw nothing.
 */
export function ColumnChart({ buckets, granularity, integer = false, formatValue, formatTick, label }: ColumnChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = axisMax(Math.max(0, ...buckets.map((b) => b.value)), integer);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 7));

  return (
    <figure aria-label={label} className="select-none">
      <div className="flex">
        {/* Y axis */}
        <div className="relative mr-2 h-48 w-14 shrink-0 text-right text-[10px] text-muted tabular-nums" aria-hidden>
          {ticks.map((v) => (
            <span key={v} className="absolute right-0 leading-none" style={{ bottom: `${(v / max) * 100}%`, transform: 'translateY(50%)' }}>
              {formatTick(v)}
            </span>
          ))}
        </div>
        {/* Plot */}
        <div className="relative h-48 flex-1">
          {ticks.map((v) => (
            <div key={v} className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${(v / max) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5" role="list">
            {buckets.map((b, i) => {
              const h = (b.value / max) * 100;
              return (
                <div
                  key={b.key}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${bucketLabel(b, granularity, true)}: ${formatValue(b.value)}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive((a) => (a === i ? null : a))}
                  className="group relative flex h-full flex-1 items-end justify-center outline-none"
                >
                  {active === i && <div className="absolute inset-y-0 w-full bg-ink/[0.04]" aria-hidden />}
                  {b.value > 0 && (
                    <div
                      className={cn('relative w-[70%] max-w-6 rounded-t-[4px] transition-colors', active === i ? 'bg-ink' : 'bg-ink-soft')}
                      style={{ height: `max(${h}%, 2px)` }}
                    />
                  )}
                  {active === i && (
                    <div
                      role="tooltip"
                      className={cn(
                        'pointer-events-none absolute bottom-full z-10 mb-2 border border-line bg-paper px-2.5 py-1.5 text-left whitespace-nowrap shadow-sm',
                        i > buckets.length * 0.66 ? 'right-0' : i < buckets.length * 0.33 ? 'left-0' : 'left-1/2 -translate-x-1/2',
                      )}
                      style={{ bottom: `calc(${Math.max(h, 0)}% + 8px)` }}
                    >
                      <p className="text-[10px] text-muted">{bucketLabel(b, granularity, true)}</p>
                      <p className="text-xs font-medium tabular-nums">{formatValue(b.value)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* X axis */}
      <div className="mt-1.5 ml-16 flex gap-0.5 text-[10px] text-muted" aria-hidden>
        {buckets.map((b, i) => (
          <span key={b.key} className="flex-1 overflow-visible text-center whitespace-nowrap">
            {i % labelEvery === 0 ? bucketLabel(b, granularity) : ''}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Table view of a time series — the accessible / exact-values alternative to the chart. */
export function SeriesTable({ buckets, granularity, formatValue, valueLabel }: { buckets: Bucket[]; granularity: Granularity; formatValue: (v: number) => string; valueLabel: string }) {
  const { t } = useTranslation();
  const rows = buckets.filter((b) => b.value > 0);
  return (
    <div className="max-h-60 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-paper text-[11px] tracking-[0.12em] text-muted uppercase">
          <tr className="border-b border-line">
            <th className="py-2 text-left font-medium">{t('admin.table.date')}</th>
            <th className="py-2 text-right font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr><td colSpan={2} className="py-3 text-center text-muted">—</td></tr>
          ) : (
            rows.map((b) => (
              <tr key={b.key}>
                <td className="py-1.5">{bucketLabel(b, granularity, true)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatValue(b.value)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Ranked horizontal bars (top products / categories). Each row is labelled, so values are never color-only. */
export function RankedBars({ entries, formatValue, secondary }: { entries: TopEntry[]; formatValue: (e: TopEntry) => string; secondary?: (e: TopEntry) => string }) {
  const max = Math.max(1, ...entries.map((e) => e.units));
  return (
    <ol className="space-y-3.5">
      {entries.map((e, i) => (
        <li key={e.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 text-xs text-muted tabular-nums">{i + 1}</span>
              {e.name}
            </span>
            <span className="shrink-0 text-right">
              <span className="font-medium tabular-nums">{formatValue(e)}</span>
              {secondary && <span className="ml-2 text-xs text-muted tabular-nums">{secondary(e)}</span>}
            </span>
          </div>
          <div className="h-2 bg-mist" aria-hidden>
            <div className="h-2 rounded-r-[4px] bg-ink-soft" style={{ width: `${(e.units / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Tall segmented bar — one whole split into parts (order outcomes). Parts are
 * separated by a 2px surface gap; a part's share is printed inside only when it
 * is wide enough; the legend names every part with its count.
 */
export function SegmentedBar({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div>
      <div
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.value} (${pct(s.value)}%)`).join(', ')}`}
        className="flex h-7 gap-0.5"
      >
        {total === 0 ? (
          <div className="h-full w-full rounded-[4px] bg-mist" />
        ) : (
          visible.map((s) => (
            <div
              key={s.key}
              title={`${s.label}: ${s.value} (${pct(s.value)}%)`}
              className="flex h-full items-center overflow-hidden rounded-[4px] px-2 text-[11px] font-medium text-white"
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, minWidth: 4 }}
            >
              {s.value / total >= 0.12 ? `${pct(s.value)}%` : ''}
            </div>
          ))
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: s.color }} aria-hidden />
            <span className="text-ink-soft">{s.label}</span>
            <span className="font-medium tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
