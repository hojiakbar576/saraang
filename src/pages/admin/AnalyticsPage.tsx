import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BarChart3, FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { PageHeader, Panel, StatTile, StatusBadge, adminInput } from '@/components/admin/AdminUI';
import { ColumnChart, RankedBars, SegmentedBar, SeriesTable } from '@/components/admin/charts';
import { Price, Skeleton } from '@/components/ui/primitives';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useAdminProducts } from '@/hooks/useAdminProducts';
import { usePageTitle } from '@/hooks/usePageTitle';
import { computeAnalytics, formatCompactUZS } from '@/features/analytics/analytics';
import { inRange, rangeForPreset, rangeFromInputs, type RangePreset } from '@/lib/dateRange';
import { formatUZS } from '@/lib/money';
import { formatDateTime } from '@/lib/date';
import { CATEGORIES } from '@/data/mock/taxonomy';
import type { CategoryId } from '@/types/catalog';
import { productName, taxonomyName } from '@/i18n/content';
import { isLang } from '@/i18n';

const PRESETS: RangePreset[] = ['today', '7d', '30d', 'month', 'year', 'all', 'custom'];

/** Validated outcome palette (dataviz validator: all checks pass on the paper surface). */
const OUTCOME_COLORS = { delivered: '#2f7d50', inProgress: '#3d6fb0', cancelled: '#c0392b' };


function ChartPanel({ title, children, table }: { title: string; children: ReactNode; table: ReactNode }) {
  const { t } = useTranslation();
  const [showTable, setShowTable] = useState(false);
  return (
    <Panel
      title={title}
      action={
        <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs text-muted underline underline-offset-4 hover:text-ink" aria-pressed={showTable}>
          {showTable ? t('admin.analytics.showChart') : t('admin.analytics.showTable')}
        </button>
      }
    >
      <div className="p-5">{showTable ? table : children}</div>
    </Panel>
  );
}

export function AnalyticsPage() {
  const { t, i18n } = useTranslation();
  const lang = isLang(i18n.resolvedLanguage) ? i18n.resolvedLanguage : undefined;
  usePageTitle(t('admin.analytics.title'));
  const { orders, loading } = useAdminOrders();
  const { products } = useAdminProducts();
  const [params, setParams] = useSearchParams();
  const preset = (PRESETS.includes(params.get('period') as RangePreset) ? params.get('period') : '30d') as RangePreset;
  const fromInput = params.get('from') ?? '';
  const toInput = params.get('to') ?? '';

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const range = useMemo(
    () => (preset === 'custom' ? rangeFromInputs(fromInput, toInput) : rangeForPreset(preset)),
    [preset, fromInput, toInput],
  );

  const result = useMemo(() => {
    if (!orders) return null;
    const productCategory = new Map(products?.map((p) => [p.id, p.categoryId]));
    const productById = new Map(products?.map((p) => [p.id, p]));
    const r = computeAnalytics(orders, range, {
      categoryName: (id: CategoryId) => {
        const c = CATEGORIES.find((x) => x.id === id);
        return c ? taxonomyName(c, lang) : id;
      },
      categoryOfProduct: (id) => productCategory.get(id),
    });
    // Order lines keep the Uzbek name from order time; show the current name in the
    // admin's language when the product still exists.
    const current = (e: (typeof r.topProducts)[number]) => {
      const prod = productById.get(e.id);
      return prod ? { ...e, name: productName(prod, lang) } : e;
    };
    return { ...r, topProducts: r.topProducts.map(current) };
  }, [orders, products, range, lang]);

  const recent = useMemo(() => orders?.filter((o) => inRange(o.createdAt, range)).slice(0, 5) ?? [], [orders, range]);
  const hasDemo = orders?.some((o) => o.isDemo);
  const chip = (active: boolean) =>
    cn('inline-flex h-8 items-center border px-3 text-xs whitespace-nowrap transition-colors', active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink');

  if (loading || !result) return <Skeleton className="h-96 w-full" />;

  const noOrdersAtAll = orders!.length === 0;
  const periodEmpty = result.orders.total === 0 && result.revenue.deliveredOrders === 0;
  const best = result.topProducts[0];
  const topCat = result.topCategories[0];

  return (
    <>
      <PageHeader title={t('admin.analytics.title')} subtitle={t('admin.analytics.subtitle')} />

      {hasDemo && (
        <p role="note" className="mb-5 flex items-start gap-2 border border-dashed border-clay/60 bg-sand/40 px-4 py-3 text-xs leading-relaxed font-medium text-ink-soft">
          <FlaskConical size={14} className="mt-0.5 shrink-0 text-clay" /> {t('admin.analytics.demoNote')}
        </p>
      )}

      {/* Filters — one row above the charts */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('admin.analytics.period')}>
        <span className="mr-1 text-xs text-muted">{t('admin.analytics.period')}:</span>
        {PRESETS.map((p) => (
          <button key={p} type="button" aria-pressed={preset === p} className={chip(preset === p)} onClick={() => setParam({ period: p === '30d' ? null : p })}>
            {t(`admin.analytics.presets.${p}`)}
          </button>
        ))}
        {preset === 'custom' && (
          <span className="flex items-center gap-1.5">
            <input type="date" aria-label={t('admin.analytics.from')} value={fromInput} onChange={(e) => setParam({ from: e.target.value || null })} className={cn(adminInput, 'h-8 text-xs')} />
            <span className="text-xs text-muted">—</span>
            <input type="date" aria-label={t('admin.analytics.to')} value={toInput} onChange={(e) => setParam({ to: e.target.value || null })} className={cn(adminInput, 'h-8 text-xs')} />
          </span>
        )}
      </div>

      {noOrdersAtAll ? (
        <Panel>
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <BarChart3 size={30} strokeWidth={1.25} className="text-muted" />
            <p className="display mt-4 text-2xl">{t('admin.analytics.emptyTitle')}</p>
            <p className="mt-2 max-w-lg text-sm text-muted">{t('admin.analytics.emptyText')}</p>
          </div>
        </Panel>
      ) : (
        <>
          {periodEmpty && <p className="mb-4 border border-line bg-paper px-4 py-3 text-sm text-muted">{t('admin.analytics.emptyPeriod')}</p>}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="col-span-2 grid lg:col-span-1">
              <StatTile emphasis label={t('admin.analytics.revenue')} value={formatUZS(result.revenue.total)} hint={t('admin.analytics.revenueHint', { count: result.revenue.deliveredOrders })} />
            </div>
            <div className="col-span-2 grid sm:col-span-1">
              <StatTile label={t('admin.analytics.avgOrder')} value={result.revenue.average == null ? t('admin.analytics.none') : formatUZS(result.revenue.average)} />
            </div>
            <div className="col-span-2 grid sm:col-span-1">
              <StatTile label={t('admin.analytics.ordersPlaced')} value={result.orders.total} />
            </div>
            <div className="col-span-2 grid sm:col-span-1">
              <StatTile label={t('admin.analytics.bestProduct')} value={<span className="block text-lg leading-snug">{best?.name ?? t('admin.analytics.none')}</span>} hint={best ? t('admin.analytics.units', { count: best.units }) : undefined} />
            </div>
            <div className="col-span-2 grid sm:col-span-1 lg:col-span-2">
              <StatTile label={t('admin.analytics.topCategory')} value={<span className="block text-lg leading-snug">{topCat?.name ?? t('admin.analytics.none')}</span>} hint={topCat ? t('admin.analytics.units', { count: topCat.units }) : undefined} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <ChartPanel
              title={t('admin.analytics.revenueChart')}
              table={<SeriesTable buckets={result.revenue.series} granularity={result.granularity} formatValue={formatUZS} valueLabel={t('admin.analytics.valueRevenue')} />}
            >
              <ColumnChart
                label={t('admin.analytics.revenueChart')}
                buckets={result.revenue.series}
                granularity={result.granularity}
                formatValue={formatUZS}
                formatTick={formatCompactUZS}
              />
            </ChartPanel>
            <ChartPanel
              title={t('admin.analytics.ordersChart')}
              table={<SeriesTable buckets={result.orders.series} granularity={result.granularity} formatValue={(v) => String(v)} valueLabel={t('admin.analytics.valueOrders')} />}
            >
              <ColumnChart
                label={t('admin.analytics.ordersChart')}
                buckets={result.orders.series}
                granularity={result.granularity}
                integer
                formatValue={(v) => `${v} ta`}
                formatTick={(v) => String(v)}
              />
            </ChartPanel>
          </div>

          <div className="mt-6">
            <Panel title={t('admin.analytics.outcomes')}>
              <div className="p-5">
                <SegmentedBar
                  label={t('admin.analytics.outcomes')}
                  segments={[
                    { key: 'delivered', label: t('admin.analytics.outcomeDelivered'), value: result.outcomes.delivered, color: OUTCOME_COLORS.delivered },
                    { key: 'progress', label: t('admin.analytics.outcomeProgress'), value: result.outcomes.inProgress, color: OUTCOME_COLORS.inProgress },
                    { key: 'cancelled', label: t('admin.analytics.outcomeCancelled'), value: result.outcomes.cancelled, color: OUTCOME_COLORS.cancelled },
                  ]}
                />
              </div>
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel title={t('admin.analytics.topProducts')}>
              <div className="p-5">
                {result.topProducts.length ? (
                  <RankedBars entries={result.topProducts} formatValue={(e) => t('admin.analytics.units', { count: e.units })} secondary={(e) => formatUZS(e.orderValue)} />
                ) : (
                  <p className="text-sm text-muted">{t('admin.analytics.none')}</p>
                )}
                <p className="mt-4 text-xs text-muted">{t('admin.analytics.topNote')}</p>
              </div>
            </Panel>
            <Panel title={t('admin.analytics.topCategories')}>
              <div className="p-5">
                {result.topCategories.length ? (
                  <RankedBars entries={result.topCategories} formatValue={(e) => t('admin.analytics.units', { count: e.units })} secondary={(e) => formatUZS(e.orderValue)} />
                ) : (
                  <p className="text-sm text-muted">{t('admin.analytics.none')}</p>
                )}
              </div>
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
            <Panel title={t('admin.analytics.recent')}>
              {recent.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted">{t('admin.analytics.none')}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {recent.map((o) => (
                    <li key={o.id}>
                      <Link to={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-mist/50">
                        <span className="min-w-0">
                          <span className="font-medium tabular-nums">{o.orderNumber}</span>
                          <span className="ml-2 text-muted">{o.customer.fullName}</span>
                          <span className="block text-xs text-muted tabular-nums">{formatDateTime(o.createdAt)}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <Price amount={o.total} />
                          <StatusBadge status={o.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t('admin.analytics.definitions')}>
              <ul className="space-y-2 p-5 text-xs leading-relaxed text-ink-soft">
                {t('admin.analytics.definitionsList', { returnObjects: true }).map((d) => <li key={d}>• {d}</li>)}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
