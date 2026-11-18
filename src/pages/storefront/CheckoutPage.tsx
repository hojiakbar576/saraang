import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { AlertCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Container, Price, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Checkbox, TextArea, TextField } from '@/components/ui/form';
import { useResolvedCart } from '@/features/cart/useResolvedCart';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatLocalPhoneInput } from '@/lib/phone';
import { validateCheckout, type CheckoutErrors, type CheckoutField } from '@/validation/checkout';
import { orders } from '@/services/orders';
import { saveLastReceipt } from '@/features/orders/lastReceipt';
import { productName, sizeLabel, taxonomyName } from '@/i18n/content';

interface FormState {
  fullName: string;
  phoneLocal: string;
  city: string;
  address: string;
  comment: string;
  privacyConsent: boolean;
}

const INITIAL: FormState = { fullName: '', phoneLocal: '', city: '', address: '', comment: '', privacyConsent: false };
const FIELD_ORDER: CheckoutField[] = ['fullName', 'phone', 'city', 'address', 'comment', 'privacyConsent'];

const toPayload = (f: FormState) => ({
  fullName: f.fullName,
  phone: `+998${f.phoneLocal.replace(/\D/g, '')}`,
  city: f.city,
  address: f.address,
  comment: f.comment,
  privacyConsent: f.privacyConsent,
});

export function CheckoutPage() {
  const { t } = useTranslation();
  usePageTitle(t('checkout.title'));
  const navigate = useNavigate();
  const { state, dispatch, lines, loading, subtotal, unavailableKeys, availableItemCount } = useResolvedCart();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const completed = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!completed.current && state.lines.length === 0) return <Navigate to="/cart" replace />;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    if (attempted) {
      const v = validateCheckout(toPayload(next));
      setErrors(v.ok ? {} : v.errors);
    }
  };

  const focusFirstError = (errs: CheckoutErrors) => {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setAttempted(true);
    setSubmitError(null);

    const payload = toPayload(form);
    const v = validateCheckout(payload);
    if (!v.ok) {
      setErrors(v.errors);
      focusFirstError(v.errors);
      return;
    }
    setErrors({});
    if (unavailableKeys.length) return;

    setSubmitting(true);
    const result = await orders.submitOrder({ form: payload, lines: state.lines, idempotencyKey });
    if (result.ok) {
      completed.current = true;
      saveLastReceipt(result.receipt);
      navigate('/order/success', { replace: true, state: { receipt: result.receipt } });
      // Cart is cleared only after the order was created successfully.
      dispatch({ type: 'clear' });
      return;
    }
    setSubmitting(false);
    if (result.reason === 'validation') {
      setErrors(result.errors);
      focusFirstError(result.errors);
    } else if (result.reason === 'unavailable') {
      setSubmitError(t('checkout.unavailableBlock'));
    } else {
      setSubmitError(t('checkout.submitError'));
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Container className="pt-10 sm:pt-14">
      <h1 className="display mb-8 text-4xl sm:mb-10 sm:text-6xl">{t('checkout.title')}</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
        <form ref={formRef} onSubmit={onSubmit} noValidate className="order-2 space-y-10 lg:order-1">
          <div className="flex gap-3 border border-clay/30 bg-sand/50 p-4 text-sm">
            <Info size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-clay" />
            <div>
              <p className="font-medium">{t('checkout.noticeTitle')}</p>
              <p className="mt-1 leading-relaxed text-ink-soft">{t('checkout.noticeText')}</p>
            </div>
          </div>

          <section className="space-y-5">
            <h2 className="eyebrow text-ink">{t('checkout.contactTitle')}</h2>
            <TextField
              name="fullName"
              label={t('checkout.fullName')}
              placeholder={t('checkout.fullNamePlaceholder')}
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              error={errors.fullName}
              maxLength={80}
              required
            />
            <TextField
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              label={t('checkout.phone')}
              prefix="+998"
              placeholder="90 123 45 67"
              value={form.phoneLocal}
              onChange={(e) => update('phoneLocal', formatLocalPhoneInput(e.target.value))}
              hint={t('checkout.phoneHint')}
              error={errors.phone}
              required
            />
          </section>

          <section className="space-y-5">
            <h2 className="eyebrow text-ink">{t('checkout.deliveryTitle')}</h2>
            <TextField
              name="city"
              label={t('checkout.city')}
              optionalLabel={t('checkout.optional')}
              placeholder={t('checkout.cityPlaceholder')}
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              error={errors.city}
              maxLength={60}
            />
            <TextField
              name="address"
              label={t('checkout.address')}
              optionalLabel={t('checkout.optional')}
              placeholder={t('checkout.addressPlaceholder')}
              autoComplete="street-address"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              error={errors.address}
              maxLength={300}
            />
            <TextArea
              name="comment"
              label={t('checkout.comment')}
              optionalLabel={t('checkout.optional')}
              placeholder={t('checkout.commentPlaceholder')}
              value={form.comment}
              onChange={(e) => update('comment', e.target.value)}
              error={errors.comment}
              maxLength={500}
            />
          </section>

          <div className="space-y-5 border-t border-line pt-6">
            <Checkbox
              name="privacyConsent"
              checked={form.privacyConsent}
              onChange={(e) => update('privacyConsent', e.target.checked)}
              label={t('checkout.consent')}
              error={errors.privacyConsent}
            />

            {(submitError || (attempted && hasErrors)) && (
              <p role="alert" className="flex items-start gap-2 text-sm text-danger">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {submitError ?? t('checkout.fixErrors')}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting || loading || unavailableKeys.length > 0}>
              {submitting ? t('checkout.submitting') : t('checkout.submit')}
              {!submitting && <span className="opacity-70">·</span>}
              {!submitting && <Price amount={subtotal} />}
            </Button>
            <p className="text-center text-xs text-muted">{t('preorder.short')}</p>
          </div>
        </form>

        {/* Order summary */}
        <aside className="order-1 h-fit bg-mist p-5 sm:p-6 lg:sticky lg:top-28 lg:order-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="eyebrow text-ink">{t('checkout.summary')}</h2>
            <Link to="/cart" className="text-xs text-muted underline underline-offset-4 hover:text-ink">
              {t('checkout.editCart')}
            </Link>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              {unavailableKeys.length > 0 && (
                <p role="alert" className="mb-4 text-xs text-danger">{t('checkout.unavailableBlock')}</p>
              )}
              <ul className="space-y-4">
                {lines.map(({ key, line, product, color, available, lineTotal }) => {
                  const img = product && [...product.images].sort((a, b) => a.position - b.position)[0];
                  return (
                    <li key={key} className={`flex gap-3 ${available ? '' : 'opacity-50'}`}>
                      <div className="relative w-14 shrink-0">
                        {img ? <img src={img.url} alt="" className="aspect-[4/5] w-full bg-paper object-cover" /> : <div className="aspect-[4/5] bg-paper" />}
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] text-paper tabular-nums">
                          {line.quantity}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate font-medium">{product ? productName(product) : '—'}</p>
                        <p className="text-xs text-muted">
                          {sizeLabel(line.size)} · {color ? taxonomyName(color) : line.colorId}
                        </p>
                      </div>
                      <div className="text-sm">{available ? <Price amount={lineTotal} /> : <span className="text-xs text-danger">{t('product.unavailable')}</span>}</div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between text-muted">
                  <span>{t('checkout.items', { count: availableItemCount })}</span>
                  <Price amount={subtotal} />
                </div>
                <p className="text-xs text-muted">{t('preorder.deliveryCostNote')}</p>
                <div className="flex justify-between pt-2 text-base font-medium">
                  <span>{t('cart.total')}</span>
                  <Price amount={subtotal} />
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </Container>
  );
}
