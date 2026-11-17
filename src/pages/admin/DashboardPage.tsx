import { useMemo } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowRight, FlaskConical, Inbox } from 'lucide-react';
import { t } from '@/i18n';
import { ORDER_STATUSES } from '@/types/order';
import { PageHeader, Panel, StatTile, StatusBadge } from '@/components/admin/AdminUI';
import { Price, Skeleton } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/Button';
import { computeOverview } from '@/features/analytics/overview';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatUZS } from '@/lib/money';
import { formatDateTime } from '@/lib/date';
import { formatUzPhone } from '@/lib/phone';

export function DashboardPage() {
  usePageTitle(t.admin.dashboard.title);
  const { orders, loading } = useAdminOrders();
  const overview = useMemo(() => (orders ? computeOverview(orders) : null), [orders]);
  const recent = orders?.slice(0, 6) ?? [];
  const hasDemo = orders?.some((o) => o.isDemo);
  const d = t.admin.dashboard;

  return (
    <>
      <PageHeader title={d.title} subtitle={d.greeting} />

      {hasDemo && (
        <p className="mb-6 flex items-start gap-2 border border-dashed border-clay/50 bg-paper px-4 py-3 text-xs leading-relaxed text-ink-soft">
          <FlaskConical size={14} className="mt-0.5 shrink-0 text-clay" />
          {d.demoNote}
        </p>
      )}

      {loading || !overview ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : overview.totalOrders === 0 ? (
        <Panel>
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Inbox size={30} strokeWidth={1.25} className="text-muted" />
            <p className="display mt-4 text-2xl">{d.emptyTitle}</p>
            <p className="mt-2 max-w-md text-sm text-muted">{d.emptyText}</p>
            <ButtonLink to="/" target="_blank" variant="secondary" className="mt-6">
              {d.openStore}
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="col-span-2 grid lg:col-span-1">
              <StatTile emphasis label={d.revenue} value={formatUZS(overview.deliveredRevenue)} hint={d.revenueHint} />
            </div>
            <div className="col-span-2 grid sm:col-span-1">
              <StatTile
                label={d.avgOrder}
                value={overview.averageDeliveredOrderValue == null ? '—' : formatUZS(overview.averageDeliveredOrderValue)}
              />
            </div>
            <div className="col-span-2 grid sm:col-span-1">
              <StatTile label={d.totalOrders} value={overview.totalOrders} />
            </div>
            <StatTile label={d.delivered} value={overview.deliveredOrders} />
            <StatTile label={d.pending} value={overview.pendingOrders} hint={d.pendingHint} />
            <div className="col-span-2 grid lg:col-span-1">
              <StatTile label={d.cancelled} value={overview.cancelledOrders} />
            </div>
          </div>

          {overview.deliveredWithoutAmount > 0 && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-danger">
              <AlertTriangle size={14} /> {d.missingAmount(overview.deliveredWithoutAmount)}
            </p>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
            <Panel
              title={d.recent}
              action={
                <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
                  {d.allOrders} <ArrowRight size={13} />
                </Link>
              }
            >
              {/* Mobile: cards */}
              <ul className="divide-y divide-line md:hidden">
                {recent.map((o) => (
                  <li key={o.id} className="flex items-start justify-between gap-3 px-5 py-4 text-sm">
                    <div className="min-w-0">
                      <Link to={`/admin/orders/${o.id}`} className="font-medium tabular-nums hover:underline">{o.orderNumber}</Link>
                      <p className="truncate text-muted">{o.customer.fullName}</p>
                      <p className="text-xs text-muted">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Price amount={o.total} className="text-sm" />
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
              {/* Desktop: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="text-[11px] tracking-[0.12em] text-muted uppercase">
                    <tr className="border-b border-line">
                      <th className="px-5 py-3 font-medium">{t.admin.table.number}</th>
                      <th className="px-5 py-3 font-medium">{t.admin.table.customer}</th>
                      <th className="px-5 py-3 font-medium">{t.admin.table.date}</th>
                      <th className="px-5 py-3 text-right font-medium">{t.admin.table.total}</th>
                      <th className="px-5 py-3 font-medium">{t.admin.table.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recent.map((o) => (
                      <tr key={o.id} className="hover:bg-mist/60">
                        <td className="px-5 py-3 font-medium tabular-nums">
                          <Link to={`/admin/orders/${o.id}`} className="hover:underline">{o.orderNumber}</Link>
                        </td>
                        <td className="px-5 py-3">
                          <p>{o.customer.fullName}</p>
                          <p className="text-xs text-muted tabular-nums">{formatUzPhone(o.customer.phone)}</p>
                        </td>
                        <td className="px-5 py-3 text-muted tabular-nums">{formatDateTime(o.createdAt)}</td>
                        <td className="px-5 py-3 text-right">
                          <Price amount={o.total} />
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title={d.byStatus}>
              <ul className="divide-y divide-line">
                {ORDER_STATUSES.map((s) => (
                  <li key={s} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <StatusBadge status={s} />
                    <span className="tabular-nums">{overview.byStatus[s]}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
