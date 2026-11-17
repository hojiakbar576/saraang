import type { ReactNode } from 'react';
import type { OrderStatus } from '@/types/order';
import type { ProductStatus } from '@/types/catalog';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('border border-line bg-paper', className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[13px] font-medium tracking-wide">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint, emphasis }: { label: string; value: ReactNode; hint?: string; emphasis?: boolean }) {
  return (
    <div className={cn('flex flex-col justify-between border border-line p-5', emphasis ? 'bg-ink text-paper' : 'bg-paper')}>
      <p className={cn('text-[11px] tracking-[0.16em] uppercase', emphasis ? 'text-paper/60' : 'text-muted')}>{label}</p>
      <p className="mt-3 text-2xl font-medium tabular-nums sm:text-[28px]">{value}</p>
      {hint && <p className={cn('mt-1.5 text-xs', emphasis ? 'text-paper/50' : 'text-muted')}>{hint}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: 'bg-ink text-paper',
  contacted: 'bg-sand text-ink',
  confirmed: 'bg-[#e3e8de] text-[#3f5a3a]',
  ordered_from_china: 'bg-[#e6e3ee] text-[#4b4370]',
  in_transit: 'bg-[#e1e8ef] text-[#33506b]',
  delivered: 'bg-[#dcebdf] text-success',
  cancelled: 'bg-[#f1e1dd] text-danger',
};

const PRODUCT_STATUS_STYLE: Record<ProductStatus, string> = {
  active: 'bg-[#dcebdf] text-success',
  inactive: 'bg-sand text-ink-soft',
  archived: 'bg-mist text-muted',
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', PRODUCT_STATUS_STYLE[status])}>
      {t.admin.products.status[status]}
    </span>
  );
}

export function Notice({ tone = 'info', children, onClose }: { tone?: 'info' | 'success' | 'error'; children: ReactNode; onClose?: () => void }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-4 flex items-start justify-between gap-3 border px-4 py-3 text-sm',
        tone === 'success' && 'border-success/30 bg-success/5 text-success',
        tone === 'error' && 'border-danger/30 bg-danger/5 text-danger',
        tone === 'info' && 'border-line bg-paper text-ink-soft',
      )}
    >
      <div className="min-w-0">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="-mr-1 shrink-0 px-1 opacity-60 hover:opacity-100" aria-label="Yopish">
          ×
        </button>
      )}
    </div>
  );
}

export const adminSelect =
  'h-10 border border-line bg-paper px-3 text-sm focus:border-ink focus:outline-none hover:border-stone cursor-pointer';
export const adminInput =
  'h-10 border border-line bg-paper px-3 text-sm placeholder:text-muted/60 focus:border-ink focus:outline-none hover:border-stone';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', STATUS_STYLE[status])}>
      {t.orderStatus[status]}
    </span>
  );
}
