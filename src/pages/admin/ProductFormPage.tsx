import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, Check, Info } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { Notice, PageHeader, Panel, adminInput, adminSelect } from '@/components/admin/AdminUI';
import { ImageManager } from '@/components/admin/ImageManager';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/primitives';
import { usePageTitle } from '@/hooks/usePageTitle';
import { adminProducts } from '@/services/catalog';
import { CATEGORIES, COLORS, SIZE_ORDER } from '@/data/mock/taxonomy';
import {
  DEFAULT_PRODUCT_INPUT,
  duplicateInput,
  inputFromProduct,
  sortSizes,
  validateProductInput,
  variantKey,
  type ProductErrors,
  type ProductInput,
} from '@/features/products/admin/productInput';
import { slugify } from '@/features/products/admin/slug';
import { formatDateTime } from '@/lib/date';
import type { Gender, Product, ProductStatus } from '@/types/catalog';

const tf = t.admin.productForm;
const tp = t.admin.products;

type Mode = 'create' | 'edit' | 'duplicate';

function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium">{label}</label>
      {children}
      {error ? <p role="alert" className="mt-1.5 text-xs text-danger">{error}</p> : hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const chip = (active: boolean) =>
  cn(
    'inline-flex h-9 min-w-11 items-center justify-center border px-3 text-xs transition-colors',
    active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink',
  );

function PriceInput({ value, onChange, invalid, id }: { value: number; onChange: (v: number) => void; invalid?: boolean; id?: string }) {
  const display = value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
          onChange(digits ? Number(digits) : 0);
        }}
        placeholder="349 000"
        aria-invalid={invalid}
        className={cn(adminInput, 'w-full pr-14 tabular-nums', invalid && 'border-danger')}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">soʻm</span>
    </div>
  );
}

export function ProductFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const fromId = params.get('from');
  const mode: Mode = id ? 'edit' : fromId ? 'duplicate' : 'create';
  const navigate = useNavigate();
  usePageTitle(mode === 'edit' ? tf.editTitle : mode === 'duplicate' ? tf.duplicateTitle : tf.newTitle);

  const [form, setForm] = useState<ProductInput | null>(null);
  const [initial, setInitial] = useState<string>('');
  const [existing, setExisting] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [busyUploads, setBusyUploads] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [customSize, setCustomSize] = useState('');
  const skipBlock = useRef(false);
  /** Form prepared by "save & add another"; survives the URL change from ?from=… to /new. */
  const pendingNext = useRef<ProductInput | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      let next: ProductInput = { ...DEFAULT_PRODUCT_INPUT };
      if (pendingNext.current) {
        next = pendingNext.current;
        pendingNext.current = null;
      } else if (mode === 'edit' && id) {
        const p = await adminProducts.getProduct(id);
        if (!active) return;
        if (!p) return setNotFound(true);
        setExisting(p);
        next = inputFromProduct(p);
        setSlugTouched(true);
      } else if (mode === 'duplicate' && fromId) {
        const [p, slugs] = await Promise.all([adminProducts.getProduct(fromId), adminProducts.listSlugs()]);
        if (!active) return;
        if (!p) return setNotFound(true);
        next = duplicateInput(p, slugs);
      }
      setForm(next);
      setInitial(JSON.stringify(next));
    })();
    return () => {
      active = false;
    };
  }, [mode, id, fromId]);

  const dirty = !!form && JSON.stringify(form) !== initial;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !skipBlock.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(tf.unsaved)) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const sizeOptions = useMemo(() => sortSizes([...new Set([...SIZE_ORDER, ...(form?.sizes ?? [])])]), [form?.sizes]);

  if (notFound) {
    return (
      <>
        <PageHeader title={tf.notFound} />
        <Link to="/admin/products" className="text-sm underline">{tf.back}</Link>
      </>
    );
  }
  if (!form) return <Skeleton className="h-96 w-full" />;

  const set = (patch: Partial<ProductInput>) => {
    const next = { ...form, ...patch };
    if (patch.name !== undefined && !slugTouched) next.slug = slugify(patch.name);
    setForm(next);
    setMessage(null);
    if (attempted) {
      const v = validateProductInput(next);
      setErrors(v.ok ? {} : v.errors);
    }
  };

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const toggleAvailability = (key: string) => set({ unavailable: toggle(form.unavailable, key) });

  const save = async (andNew: boolean) => {
    setAttempted(true);
    if (busyUploads) {
      setMessage({ tone: 'error', text: tf.waitUploads });
      return;
    }
    const pre = validateProductInput(form);
    if (!pre.ok) {
      setErrors(pre.errors);
      setMessage({ tone: 'error', text: tf.fixErrors });
      return;
    }
    setSaving(true);
    const r = mode === 'edit' && id ? await adminProducts.updateProduct(id, form) : await adminProducts.createProduct(form);
    setSaving(false);
    if (!r.ok) {
      setErrors(r.errors);
      setMessage({ tone: 'error', text: tf.fixErrors });
      return;
    }
    skipBlock.current = true;
    if (andNew) {
      // Keep the classification so similar products can be added quickly.
      const next: ProductInput = {
        ...DEFAULT_PRODUCT_INPUT,
        categoryId: form.categoryId,
        gender: form.gender,
        sizes: form.sizes,
        colorIds: form.colorIds,
        deliveryEstimate: form.deliveryEstimate,
      };
      if (mode !== 'create') pendingNext.current = next;
      setForm(next);
      setInitial(JSON.stringify(next));
      setSlugTouched(false);
      setErrors({});
      setAttempted(false);
      setMessage({ tone: 'success', text: `${tf.saved} “${r.product.name}”` });
      skipBlock.current = false;
      navigate('/admin/products/new', { replace: true });
      window.scrollTo(0, 0);
    } else {
      navigate('/admin/products');
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(false);
  };

  const title = mode === 'edit' ? tf.editTitle : mode === 'duplicate' ? tf.duplicateTitle : tf.newTitle;

  return (
    <form onSubmit={onSubmit} noValidate className="pb-24">
      <Link to="/admin/products" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
        <ArrowLeft size={13} /> {tf.back}
      </Link>
      <PageHeader title={title} subtitle={existing ? `${tf.created}: ${formatDateTime(existing.createdAt)} · ${tf.updated}: ${formatDateTime(existing.updatedAt)}` : undefined} />

      {mode === 'duplicate' && (
        <Notice tone="info">
          <span className="flex gap-2"><Info size={16} className="mt-0.5 shrink-0" /> {tf.duplicateNote}</span>
        </Notice>
      )}
      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title={tf.basics}>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label={tf.name} error={errors.name} htmlFor="pf-name">
                  <input id="pf-name" value={form.name} onChange={(e) => set({ name: e.target.value })} className={cn(adminInput, 'w-full', errors.name && 'border-danger')} maxLength={120} autoFocus={mode !== 'edit'} />
                </Field>
              </div>
              <Field label={tf.price} error={errors.price} htmlFor="pf-price">
                <PriceInput id="pf-price" value={form.price} onChange={(price) => set({ price })} invalid={!!errors.price} />
              </Field>
              <Field label={tf.slug} error={errors.slug} hint={tf.slugHint(form.slug)} htmlFor="pf-slug">
                <div className="flex gap-2">
                  <input
                    id="pf-slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set({ slug: e.target.value.toLowerCase() });
                    }}
                    className={cn(adminInput, 'min-w-0 flex-1', errors.slug && 'border-danger')}
                    maxLength={80}
                  />
                  {slugTouched && (
                    <button type="button" className="shrink-0 border border-line px-2 text-[11px] text-muted hover:border-ink hover:text-ink" onClick={() => { setSlugTouched(false); set({ slug: slugify(form.name) }); }}>
                      {tf.slugAuto}
                    </button>
                  )}
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field label={tf.description} error={errors.description} htmlFor="pf-desc">
                  <textarea id="pf-desc" value={form.description} onChange={(e) => set({ description: e.target.value })} rows={5} maxLength={4000} className={cn(adminInput, 'h-auto w-full resize-y py-2 leading-relaxed')} />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title={tf.images}>
            <div className="p-5">
              <ImageManager images={form.images} onChange={(images) => set({ images })} onBusyChange={setBusyUploads} altBase={form.name} error={errors.images} />
            </div>
          </Panel>

          <Panel title={tf.variants}>
            <div className="space-y-6 p-5">
              <Field label={tf.sizes} error={errors.sizes}>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((s) => (
                    <button key={s} type="button" aria-pressed={form.sizes.includes(s)} className={chip(form.sizes.includes(s))} onClick={() => set({ sizes: sortSizes(toggle(form.sizes, s)) })}>
                      {s}
                    </button>
                  ))}
                  <span className="inline-flex">
                    <input
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = customSize.trim();
                          if (v && !form.sizes.includes(v)) set({ sizes: sortSizes([...form.sizes, v]) });
                          setCustomSize('');
                        }
                      }}
                      placeholder={tf.customSize}
                      aria-label={tf.customSize}
                      className={cn(adminInput, 'h-9 w-44 text-xs')}
                      maxLength={20}
                    />
                    <button
                      type="button"
                      className="h-9 border border-l-0 border-line px-3 text-xs hover:border-ink"
                      onClick={() => {
                        const v = customSize.trim();
                        if (v && !form.sizes.includes(v)) set({ sizes: sortSizes([...form.sizes, v]) });
                        setCustomSize('');
                      }}
                    >
                      {tf.addSize}
                    </button>
                  </span>
                </div>
              </Field>

              <Field label={tf.colors} error={errors.colorIds}>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => {
                    const on = form.colorIds.includes(c.id);
                    return (
                      <button key={c.id} type="button" aria-pressed={on} onClick={() => set({ colorIds: toggle(form.colorIds, c.id) })} className={cn(chip(on), 'gap-2')}>
                        <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-medium">{tf.availability}</p>
                  {form.unavailable.length > 0 && (
                    <button type="button" className="text-xs text-muted underline underline-offset-4 hover:text-ink" onClick={() => set({ unavailable: [] })}>
                      {tf.allAvailable}
                    </button>
                  )}
                </div>
                {form.sizes.length && form.colorIds.length ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="text-xs">
                        <thead>
                          <tr>
                            <th />
                            {form.sizes.map((s) => <th key={s} className="px-2 pb-2 font-medium">{s}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {form.colorIds.map((cid) => {
                            const c = COLORS.find((x) => x.id === cid);
                            return (
                              <tr key={cid}>
                                <th className="pr-4 text-left font-normal whitespace-nowrap">
                                  <span className="inline-flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c?.hex }} />
                                    {c?.name}
                                  </span>
                                </th>
                                {form.sizes.map((s) => {
                                  const key = variantKey(s, cid);
                                  const on = !form.unavailable.includes(key);
                                  return (
                                    <td key={s} className="px-1 py-1 text-center">
                                      <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={on}
                                        aria-label={`${c?.name} ${s}`}
                                        onClick={() => toggleAvailability(key)}
                                        className={cn('inline-flex h-8 w-10 items-center justify-center border', on ? 'border-ink bg-ink text-paper' : 'border-line bg-mist text-muted line-through')}
                                      >
                                        {on ? <Check size={13} /> : '—'}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-muted">{tf.availabilityHint}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted">{tf.selectSizesColors}</p>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={tf.visibility}>
            <div className="space-y-4 p-5">
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium">{tf.status}</legend>
                <div className="space-y-1.5">
                  {(['active', 'inactive', 'archived'] as ProductStatus[]).map((s) => (
                    <label key={s} className={cn('flex cursor-pointer items-start gap-3 border px-3 py-2.5 text-sm', form.status === s ? 'border-ink' : 'border-line hover:border-stone')}>
                      <input type="radio" name="status" checked={form.status === s} onChange={() => set({ status: s })} className="mt-1 accent-[var(--color-ink)]" />
                      <span>
                        {tp.status[s]}
                        <span className="block text-xs text-muted">{tp.statusHint[s]}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {(['featured', 'newArrival'] as const).map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" checked={form[k]} onChange={(e) => set({ [k]: e.target.checked })} className="h-4 w-4 accent-[var(--color-ink)]" />
                  {k === 'featured' ? tf.featured : tf.newArrival}
                </label>
              ))}
            </div>
          </Panel>

          <Panel title={tf.classification}>
            <div className="space-y-4 p-5">
              <Field label={tf.category} error={errors.categoryId} htmlFor="pf-cat">
                <select id="pf-cat" value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value as ProductInput['categoryId'] })} className={cn(adminSelect, 'w-full')}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label={tf.gender} error={errors.gender}>
                <div className="grid grid-cols-3 gap-1">
                  {(['men', 'women', 'unisex'] as Gender[]).map((g) => (
                    <button key={g} type="button" aria-pressed={form.gender === g} className={chip(form.gender === g)} onClick={() => set({ gender: g })}>
                      {t.gender[g]}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title={tf.delivery}>
            <div className="grid grid-cols-2 gap-3 p-5">
              <Field label={tf.minDays} error={errors['deliveryEstimate.minDays']} htmlFor="pf-min">
                <input id="pf-min" type="number" min={1} max={120} value={form.deliveryEstimate.minDays} onChange={(e) => set({ deliveryEstimate: { ...form.deliveryEstimate, minDays: Number(e.target.value) } })} className={cn(adminInput, 'w-full')} />
              </Field>
              <Field label={tf.maxDays} error={errors['deliveryEstimate.maxDays']} htmlFor="pf-max">
                <input id="pf-max" type="number" min={1} max={120} value={form.deliveryEstimate.maxDays} onChange={(e) => set({ deliveryEstimate: { ...form.deliveryEstimate, maxDays: Number(e.target.value) } })} className={cn(adminInput, 'w-full')} />
              </Field>
            </div>
          </Panel>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur lg:left-60">
        <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
          {attempted && Object.keys(errors).length > 0 && (
            <p className="mr-auto hidden items-center gap-1.5 text-xs text-danger sm:flex">
              <AlertCircle size={14} /> {tf.fixErrors}
            </p>
          )}
          <Link to="/admin/products" className="px-3 text-sm text-muted hover:text-ink">{tf.cancel}</Link>
          {mode !== 'edit' && (
            <Button variant="secondary" disabled={saving || busyUploads} onClick={() => save(true)} className="hidden sm:inline-flex">
              {tf.saveAndNew}
            </Button>
          )}
          <Button type="submit" disabled={saving || busyUploads}>
            {saving ? tf.saving : busyUploads ? tf.uploading + '…' : tf.save}
          </Button>
        </div>
      </div>
    </form>
  );
}
