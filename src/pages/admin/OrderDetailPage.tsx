import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, FlaskConical, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Notice, PageHeader, Panel, StatusBadge, adminInput } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Price, Skeleton } from '@/components/ui/primitives';
import { usePageTitle } from '@/hooks/usePageTitle';
import { adminOrders } from '@/services/orders';
import { ORDERS_CHANGED_EVENT } from '@/services/events';
import { NEXT_STEP, TRANSITIONS, MAX_NOTE_LENGTH } from '@/features/orders/statusFlow';
import { formatDateTime } from '@/lib/date';
import { formatUzPhone } from '@/lib/phone';
import { formatUZS } from '@/lib/money';
import type { Order, OrderStatus } from '@/types/order';
import type { OrderMutationResult } from '@/services/orders/AdminOrderRepository';
import { sizeLabel, taxonomyName } from '@/i18n/content';
import { currencyLabel } from '@/lib/money';
import { COLORS } from '@/data/mock/taxonomy';
import { parseAmountCorrectionNote } from '@/features/orders/statusFlow';
import { t as tGlobal } from '@/i18n';

/** Colour name in the current language; falls back to the name stored with the order. */
function colorLabel(colorId: string, stored: string): string {
  const c = COLORS.find((x) => x.id === colorId);
  return c ? taxonomyName(c) : stored;
}

/** Internal notes: the automatic amount-correction note is stored language-neutral and shown translated. */
function noteText_(text: string): string {
  const m = parseAmountCorrectionNote(text);
  return m ? tGlobal('notes.amountCorrected', { from: m.from == null ? '—' : formatUZS(m.from), to: formatUZS(m.to) }) : text;
}


function AmountInput({ value, onChange, id, invalid }: { value: string; onChange: (v: string) => void; id: string; invalid?: boolean }) {
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        value={value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 12))}
        aria-invalid={invalid}
        className={cn(adminInput, 'w-full pr-12 tabular-nums', invalid && 'border-danger')}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">{currencyLabel()}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 px-5 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [amount, setAmount] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountDraft, setAmountDraft] = useState('');
  usePageTitle(order ? order.orderNumber : t('admin.orderDetail.back'));

  const load = useCallback(async () => setOrder(id ? await adminOrders.getOrder(id) : null), [id]);
  useEffect(() => {
    load();
    window.addEventListener(ORDERS_CHANGED_EVENT, load);
    return () => window.removeEventListener(ORDERS_CHANGED_EVENT, load);
  }, [load]);

  if (order === undefined) return <Skeleton className="h-96 w-full" />;
  if (order === null) {
    return (
      <>
        <PageHeader title={t('admin.orderDetail.notFound')} />
        <Link to="/admin/orders" className="text-sm underline">{t('admin.orderDetail.back')}</Link>
      </>
    );
  }

  const handle = (r: OrderMutationResult, success: string) => {
    if (r.ok) {
      setOrder(r.order);
      setMessage({ tone: 'success', text: success });
      return true;
    }
    setMessage({ tone: 'error', text: t(`admin.orderDetail.errors.${r.error}`) });
    return false;
  };

  const startChange = (s: OrderStatus) => {
    setTarget(s);
    setStatusNote('');
    setAmount(String(order.total));
    setMessage(null);
  };

  const confirmChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (target === 'delivered' && !/^\d+$/.test(amount)) {
      setMessage({ tone: 'error', text: t('admin.orderDetail.amountInvalid') });
      return;
    }
    if (target === 'cancelled' && !window.confirm(t('admin.orderDetail.cancelConfirm'))) return;
    setBusy(true);
    const r = await adminOrders.changeStatus(order.id, target, {
      note: statusNote,
      amountReceived: target === 'delivered' ? Number(amount) : undefined,
    });
    setBusy(false);
    if (handle(r, t('admin.orderDetail.changed', { label: t(`orderStatus.${target}`) }))) setTarget(null);
  };

  const saveAmount = async () => {
    if (!/^\d+$/.test(amountDraft)) {
      setMessage({ tone: 'error', text: t('admin.orderDetail.amountInvalid') });
      return;
    }
    if (handle(await adminOrders.correctAmountReceived(order.id, Number(amountDraft)), t('admin.orderDetail.amountSaved'))) setEditingAmount(false);
  };

  const addNote = async (e: FormEvent) => {
    e.preventDefault();
    if (handle(await adminOrders.addNote(order.id, noteText), t('admin.orderDetail.addNote'))) setNoteText('');
  };

  const options = TRANSITIONS[order.status];
  const next = NEXT_STEP[order.status];
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <Link to="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
        <ArrowLeft size={13} /> {t('admin.orderDetail.back')}
      </Link>
      <PageHeader
        title={order.orderNumber}
        subtitle={`${t('admin.orderDetail.created')}: ${formatDateTime(order.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            {order.isDemo && (
              <span className="inline-flex items-center gap-1 border border-dashed border-clay/60 px-2 py-0.5 text-[11px] text-clay">
                <FlaskConical size={12} /> {t('admin.orderDetail.demo')}
              </span>
            )}
            <StatusBadge status={order.status} />
          </div>
        }
      />

      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title={`${t('admin.orderDetail.items')} · ${itemCount}`}>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-4 px-5 py-4">
                  {it.imageUrl ? <img src={it.imageUrl} alt="" className="h-20 w-16 shrink-0 bg-mist object-cover" /> : <div className="h-20 w-16 shrink-0 bg-mist" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <Link to={`/admin/products/${it.productId}/edit`} className="font-medium hover:underline">{it.productName}</Link>
                    <p className="mt-0.5 text-xs text-muted">{t('product.size')}: {sizeLabel(it.size)} · {t('product.color')}: {colorLabel(it.colorId, it.colorName)}</p>
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      {it.quantity} × {formatUZS(it.unitPrice)}
                    </p>
                  </div>
                  <Price amount={it.lineTotal} className="text-sm font-medium whitespace-nowrap" />
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-line px-5 py-3.5">
              <p className="text-xs text-muted">{t('admin.orderDetail.itemsNote')}</p>
              <p className="text-sm">
                <span className="mr-2 text-muted">{t('admin.orderDetail.total')}:</span>
                <Price amount={order.total} className="text-base font-medium" />
              </p>
            </div>
          </Panel>

          <Panel title={t('admin.orderDetail.customer')}>
            <dl className="divide-y divide-line">
              <Row label={t('checkout.fullName')}>{order.customer.fullName}</Row>
              <Row label={t('checkout.phone')}>
                <a href={`tel:${order.customer.phone}`} className="inline-flex items-center gap-1.5 font-medium tabular-nums hover:underline">
                  <Phone size={13} /> {formatUzPhone(order.customer.phone)}
                </a>
              </Row>
              <Row label={t('admin.orderDetail.city')}>{order.customer.city ?? t('admin.orderDetail.none')}</Row>
              <Row label={t('admin.orderDetail.address')}>{order.customer.address ?? t('admin.orderDetail.none')}</Row>
              <Row label={t('admin.orderDetail.comment')}><span className="whitespace-pre-line">{order.customer.comment ?? t('admin.orderDetail.none')}</span></Row>
            </dl>
          </Panel>

          <Panel title={t('admin.orderDetail.history')}>
            <ol className="space-y-0 px-5 py-4">
              {[...order.statusHistory].reverse().map((h, i) => (
                <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', i === 0 ? 'bg-ink' : 'bg-stone')} />
                  <div className="min-w-0 text-sm">
                    <p className="flex flex-wrap items-center gap-1.5">
                      {h.from ? (
                        <>
                          <StatusBadge status={h.from} /> <ArrowRight size={12} className="text-muted" /> <StatusBadge status={h.to} />
                        </>
                      ) : (
                        <span>{t('admin.orderDetail.historyCreated')}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted tabular-nums">{formatDateTime(h.at)}</p>
                    {h.note && <p className="mt-1 text-xs whitespace-pre-line text-ink-soft">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="order-first space-y-6 xl:order-none">
          <Panel title={t('admin.orderDetail.changeStatus')}>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{t('admin.orderDetail.status')}</span>
                <StatusBadge status={order.status} />
              </div>

              {!target ? (
                <div className="space-y-2">
                  {next && (
                    <Button className="w-full justify-between" onClick={() => startChange(next)}>
                      <span className="text-left">
                        <span className="block text-[10px] tracking-[0.18em] uppercase opacity-60">{t('admin.orderDetail.next')}</span>
                        {t(`orderStatus.${next}`)}
                      </span>
                      <ArrowRight size={16} />
                    </Button>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {options
                      .filter((s) => s !== next)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => startChange(s)}
                          className={cn(
                            'inline-flex h-8 items-center border px-3 text-xs hover:border-ink',
                            s === 'cancelled' ? 'border-danger/30 text-danger hover:border-danger' : 'border-line',
                          )}
                        >
                          {t(`orderStatus.${s}`)}
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={confirmChange} className="space-y-4 border border-line bg-mist/50 p-4">
                  <p className="text-sm font-medium">{t('admin.orderDetail.confirmChange', { label: t(`orderStatus.${target}`) })}</p>
                  {order.status === 'delivered' && <p className="text-xs text-danger">{t('admin.orderDetail.revertDeliveredWarn')}</p>}
                  {target === 'delivered' && (
                    <div>
                      <label htmlFor="od-amount" className="mb-1.5 block text-[13px] font-medium">{t('admin.orderDetail.amountReceived')}</label>
                      <AmountInput id="od-amount" value={amount} onChange={setAmount} />
                      <p className="mt-1.5 text-xs text-muted">{t('admin.orderDetail.amountHint')}</p>
                    </div>
                  )}
                  <div>
                    <label htmlFor="od-note" className="mb-1.5 block text-[13px] font-medium">{t('admin.orderDetail.noteOptional')}</label>
                    <textarea id="od-note" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={MAX_NOTE_LENGTH} rows={2} placeholder={t('admin.orderDetail.notePlaceholder')} className={cn(adminInput, 'h-auto w-full resize-y py-2')} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTarget(null)}>{t('admin.orderDetail.cancel')}</Button>
                    <Button type="submit" size="sm" className="flex-1" disabled={busy}>{t('admin.orderDetail.confirmChange', { label: t(`orderStatus.${target}`) })}</Button>
                  </div>
                </form>
              )}
            </div>
          </Panel>

          {order.status === 'delivered' && (
            <Panel title={t('admin.orderDetail.delivered')}>
              <dl className="divide-y divide-line">
                <Row label={t('admin.orderDetail.deliveredAt')}>{order.deliveredAt ? formatDateTime(order.deliveredAt) : t('admin.orderDetail.none')}</Row>
                <Row label={t('admin.orderDetail.received')}>
                  {editingAmount ? (
                    <div className="space-y-2">
                      <AmountInput id="od-amount-edit" value={amountDraft} onChange={setAmountDraft} />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditingAmount(false)}>{t('admin.orderDetail.cancel')}</Button>
                        <Button size="sm" onClick={saveAmount}>{t('admin.orderDetail.saveAmount')}</Button>
                      </div>
                    </div>
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-3">
                      <span className="font-medium tabular-nums">{order.amountReceived != null ? formatUZS(order.amountReceived) : t('admin.orderDetail.none')}</span>
                      <button type="button" className="text-xs text-muted underline underline-offset-4 hover:text-ink" onClick={() => { setAmountDraft(String(order.amountReceived ?? order.total)); setEditingAmount(true); }}>
                        {t('admin.orderDetail.editAmount')}
                      </button>
                    </span>
                  )}
                </Row>
              </dl>
              <p className="border-t border-line px-5 py-3 text-xs text-muted">{t('admin.orderDetail.revenueNote')}</p>
            </Panel>
          )}

          <Panel title={t('admin.orderDetail.notes')}>
            <div className="p-5">
              <p className="mb-3 text-xs text-muted">{t('admin.orderDetail.notesHint')}</p>
              {order.internalNotes.length === 0 ? (
                <p className="mb-4 text-sm text-muted">{t('admin.orderDetail.noNotes')}</p>
              ) : (
                <ul className="mb-4 space-y-3">
                  {[...order.internalNotes].reverse().map((n) => (
                    <li key={n.id} className="border-l-2 border-stone pl-3 text-sm">
                      <p className="whitespace-pre-line">{noteText_(n.text)}</p>
                      <p className="mt-0.5 text-xs text-muted tabular-nums">{formatDateTime(n.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={addNote} className="space-y-2">
                <label htmlFor="od-internal" className="sr-only">{t('admin.orderDetail.addNote')}</label>
                <textarea id="od-internal" value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={MAX_NOTE_LENGTH} rows={3} placeholder={t('admin.orderDetail.notePlaceholderInternal')} className={cn(adminInput, 'h-auto w-full resize-y py-2')} />
                <Button type="submit" size="sm" variant="secondary" disabled={!noteText.trim()}>{t('admin.orderDetail.addNote')}</Button>
              </form>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
