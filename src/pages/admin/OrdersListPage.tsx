import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ChevronRight, FlaskConical, Inbox, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { PageHeader, Panel, StatusBadge, adminInput } from '@/components/admin/AdminUI';
import { Price, Skeleton } from '@/components/ui/primitives';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { usePageTitle } from '@/hooks/usePageTitle';
import { filterOrders } from '@/features/orders/orderFilters';
import { rangeForPreset, rangeFromInputs, type RangePreset } from '@/lib/dateRange';
import { formatDateTime } from '@/lib/date';
import { formatUzPhone } from '@/lib/phone';
import { ORDER_STATUSES, type OrderStatus } from '@/types/order';

const PRESETS: RangePreset[] = ['all', 'today', '7d', '30d', 'month', 'custom'];

export function OrdersListPage() {
  const { t } = useTranslation();
  usePageTitle(t('admin.orders.title'));
  const navigate = useNavigate();
  const { orders, loading } = useAdminOrders();
  const [params, setParams] = useSearchParams();

  const query = params.get('q') ?? '';
  const statusParam = params.get('status');
  const statuses = useMemo(
    () => (statusParam?.split(',').filter((s) => (ORDER_STATUSES as readonly string[]).includes(s)) ?? []) as OrderStatus[],
    [statusParam],
  );
  const preset = (params.get('period') as RangePreset | null) ?? 'all';
  const fromInput = params.get('from') ?? '';
  const toInput = params.get('to') ?? '';

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const range = useMemo(
    () => (preset === 'custom' ? rangeFromInputs(fromInput, toInput) : rangeForPreset(PRESETS.includes(preset) ? (preset as Exclude<RangePreset, 'custom'>) : 'all')),
    [preset, fromInput, toInput],
  );

  // Status counts reflect search + period, so the chips show what each filter would give.
  const beforeStatus = useMemo(() => (orders ? filterOrders(orders, { query, statuses: [], range }) : []), [orders, query, range]);
  const filtered = useMemo(() => (orders ? filterOrders(orders, { query, statuses, range }) : undefined), [orders, query, statuses, range]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
    for (const o of beforeStatus) c[o.status] += 1;
    return c;
  }, [beforeStatus]);

  const toggleStatus = (s: OrderStatus) => {
    const next = statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s];
    update({ status: next.join(',') || null });
  };
  const hasFilters = !!query || statuses.length > 0 || preset !== 'all';
  const chip = (active: boolean) =>
    cn('inline-flex h-8 items-center gap-1.5 border px-3 text-xs whitespace-nowrap transition-colors', active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink');

  return (
    <>
      <PageHeader title={t('admin.orders.title')} subtitle={filtered && orders ? t('admin.orders.subtitle', { shown: filtered.length, total: orders.length }) : undefined} />

      {orders?.some((o) => o.isDemo) && (
        <p className="mb-4 flex items-center gap-2 text-xs text-ink-soft">
          <FlaskConical size={14} className="text-clay" /> {t('admin.orders.demoNote')}
        </p>
      )}

      <div className="mb-4 space-y-3">
        <label className="relative block">
          <span className="sr-only">{t('admin.orders.search')}</span>
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => update({ q: e.target.value || null })} placeholder={t('admin.orders.search')} className={cn(adminInput, 'w-full pl-9')} />
        </label>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('admin.table.status')}>
          <button type="button" className={chip(statuses.length === 0)} onClick={() => update({ status: null })}>
            {t('admin.orders.allStatuses')} <span className="opacity-60 tabular-nums">{beforeStatus.length}</span>
          </button>
          {ORDER_STATUSES.map((s) => (
            <button key={s} type="button" aria-pressed={statuses.includes(s)} className={chip(statuses.includes(s))} onClick={() => toggleStatus(s)}>
              {t(`orderStatus.${s}`)} <span className="opacity-60 tabular-nums">{counts[s]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('admin.orders.period')}>
          <span className="mr-1 text-xs text-muted">{t('admin.orders.period')}:</span>
          {PRESETS.map((p) => (
            <button key={p} type="button" aria-pressed={preset === p} className={chip(preset === p)} onClick={() => update({ period: p === 'all' ? null : p })}>
              {t(`admin.orders.presets.${p}`)}
            </button>
          ))}
          {preset === 'custom' && (
            <span className="flex items-center gap-1.5">
              <input type="date" aria-label={t('admin.orders.from')} value={fromInput} onChange={(e) => update({ from: e.target.value || null })} className={cn(adminInput, 'h-8 text-xs')} />
              <span className="text-xs text-muted">—</span>
              <input type="date" aria-label={t('admin.orders.to')} value={toInput} onChange={(e) => update({ to: e.target.value || null })} className={cn(adminInput, 'h-8 text-xs')} />
            </span>
          )}
          {hasFilters && (
            <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="ml-auto text-xs text-muted underline underline-offset-4 hover:text-ink">
              {t('admin.orders.clear')}
            </button>
          )}
        </div>
      </div>

      <Panel>
        {loading || !filtered ? (
          <div className="space-y-2 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Inbox size={28} strokeWidth={1.25} className="text-muted" />
            <p className="display mt-3 text-2xl">{t('admin.orders.emptyTitle')}</p>
            <p className="mt-2 text-sm text-muted">{orders?.length ? t('admin.orders.emptyFiltered') : t('admin.orders.emptyNone')}</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {filtered.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-mist/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium tabular-nums">{o.orderNumber}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-0.5 truncate text-sm">{o.customer.fullName}</p>
                      <p className="text-xs text-muted tabular-nums">{formatUzPhone(o.customer.phone)} · {formatDateTime(o.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <Price amount={o.total} className="text-sm" />
                      <p className="text-xs text-muted">{t('admin.orders.items', { count: o.items.reduce((n, i) => n + i.quantity, 0) })}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] tracking-[0.12em] text-muted uppercase">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 font-medium">{t('admin.table.number')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.table.customer')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.table.date')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.table.items')}</th>
                    <th className="px-3 py-3 text-right font-medium">{t('admin.table.total')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.table.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((o) => (
                    <tr
                      key={o.id}
                      className="cursor-pointer hover:bg-mist/50"
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                    >
                      <td className="px-5 py-3 font-medium tabular-nums">
                        <Link to={`/admin/orders/${o.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{o.orderNumber}</Link>
                      </td>
                      <td className="px-3 py-3">
                        {o.customer.fullName}
                        <p className="text-xs text-muted tabular-nums">{formatUzPhone(o.customer.phone)}</p>
                      </td>
                      <td className="px-3 py-3 text-muted tabular-nums">{formatDateTime(o.createdAt)}</td>
                      <td className="px-3 py-3 text-muted">{t('admin.orders.items', { count: o.items.reduce((n, i) => n + i.quantity, 0) })}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap"><Price amount={o.total} /></td>
                      <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
