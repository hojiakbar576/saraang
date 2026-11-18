import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, Check, Info, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { currencyLabel } from '@/lib/money';
import { translateMsg, type Lang } from '@/i18n';
import { missingTranslations, sizeLabel, taxonomyName } from '@/i18n/content';
import type { ContentLang, Gender, Product, ProductStatus } from '@/types/catalog';

type Mode = 'create' | 'edit' | 'duplicate';

function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium">{label}</label>
      {children}
      {error ? <p role="alert" className="mt-1.5 text-xs text-danger">{translateMsg(error, t)}</p> : hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const TEXT_LANGS: Lang[] = ['uz', 'ru', 'en'];

/**
 * Name + description in three languages, as an accessible tab list
 * (arrow keys move between tabs). Uzbek is required; Russian/English are optional
 * and fall back to Uzbek in the shop when empty.
 */
function TranslationTabs({
  form,
  errors,
  active,
  onActive,
  onChange,
  autoFocus,
}: {
  form: ProductInput;
  errors: ProductErrors;
  active: Lang;
  onActive: (l: Lang) => void;
  onChange: (lang: Lang, field: 'name' | 'description', value: string) => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const missing = missingTranslations({ description: form.description, translations: form.translations });
  const category = CATEGORIES.find((c) => c.id === form.categoryId);

  const hasError = (l: Lang) =>
    l === 'uz' ? !!(errors.name || errors.description) : !!(errors[`translations.${l}.name`] || errors[`translations.${l}.description`]);
  const value = (l: Lang, field: 'name' | 'description') => (l === 'uz' ? form[field] : form.translations[l][field]);
  const error = (l: Lang, field: 'name' | 'description') => (l === 'uz' ? errors[field] : errors[`translations.${l}.${field}`]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = TEXT_LANGS.indexOf(active);
    let next: Lang | null = null;
    if (e.key === 'ArrowRight') next = TEXT_LANGS[(i + 1) % TEXT_LANGS.length];
    else if (e.key === 'ArrowLeft') next = TEXT_LANGS[(i - 1 + TEXT_LANGS.length) % TEXT_LANGS.length];
    else if (e.key === 'Home') next = TEXT_LANGS[0];
    else if (e.key === 'End') next = TEXT_LANGS[TEXT_LANGS.length - 1];
    if (next) {
      e.preventDefault();
      onActive(next);
      tabRefs.current[next]?.focus();
    }
  };

  const status = (l: Lang) => {
    if (l === 'uz') return { text: t('admin.productForm.langRequired'), tone: 'text-muted' };
    return missing.includes(l as ContentLang)
      ? { text: t('admin.productForm.langIncomplete'), tone: 'text-clay' }
      : { text: t('admin.productForm.langComplete'), tone: 'text-success' };
  };

  return (
    <div>
      <div role="tablist" aria-label={t('admin.productForm.texts')} className="flex border-b border-line" onKeyDown={onKeyDown}>
        {TEXT_LANGS.map((l) => {
          const s = status(l);
          const selected = l === active;
          return (
            <button
              key={l}
              ref={(el) => {
                tabRefs.current[l] = el;
              }}
              id={`pf-tab-${l}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`pf-panel-${l}`}
              aria-label={`${t(`language.${l}`)} — ${s.text}${hasError(l) ? ` — ${t('admin.productForm.fixErrors')}` : ''}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onActive(l)}
              className={cn(
                '-mb-px flex flex-col items-start border-b-2 px-4 py-2.5 text-left text-sm transition-colors',
                selected ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              <span className="flex items-center gap-1.5 font-medium">
                {t(`language.${l}`)}
                {hasError(l) && <AlertCircle size={13} className="text-danger" aria-hidden />}
              </span>
              <span className={cn('text-[11px]', s.tone)}>{s.text}</span>
            </button>
          );
        })}
      </div>
      {TEXT_LANGS.map((l) => (
        <div
          key={l}
          id={`pf-panel-${l}`}
          role="tabpanel"
          aria-labelledby={`pf-tab-${l}`}
          hidden={l !== active}
          className="grid gap-5 pt-5"
        >
          <Field label={t('admin.productForm.name')} error={error(l, 'name')} htmlFor={`pf-name-${l}`}>
            <input
              id={`pf-name-${l}`}
              lang={l === 'uz' ? 'uz-Latn' : l}
              value={value(l, 'name')}
              onChange={(e) => onChange(l, 'name', e.target.value)}
              placeholder={l === 'uz' ? undefined : form.name}
              className={cn(adminInput, 'w-full', error(l, 'name') && 'border-danger')}
              maxLength={120}
              autoFocus={autoFocus && l === 'uz'}
            />
          </Field>
          <Field label={t('admin.productForm.description')} error={error(l, 'description')} htmlFor={`pf-desc-${l}`}>
            <textarea
              id={`pf-desc-${l}`}
              lang={l === 'uz' ? 'uz-Latn' : l}
              value={value(l, 'description')}
              onChange={(e) => onChange(l, 'description', e.target.value)}
              rows={5}
              maxLength={4000}
              className={cn(adminInput, 'h-auto w-full resize-y py-2 leading-relaxed')}
            />
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-medium">{t('admin.productForm.categoryDisplay')}</p>
            <p className="text-sm" lang={l === 'uz' ? 'uz-Latn' : l}>{category ? taxonomyName(category, l) : '—'}</p>
            <p className="mt-1 text-xs text-muted">{t('admin.productForm.categoryDisplayHint')}</p>
          </div>
        </div>
      ))}
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
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">{currencyLabel()}</span>
    </div>
  );
}

export function ProductFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [params] = useSearchParams();
  const fromId = params.get('from');
  const mode: Mode = id ? 'edit' : fromId ? 'duplicate' : 'create';
  const navigate = useNavigate();
  usePageTitle(mode === 'edit' ? t('admin.productForm.editTitle') : mode === 'duplicate' ? t('admin.productForm.duplicateTitle') : t('admin.productForm.newTitle'));

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
  const [textLang, setTextLang] = useState<Lang>('uz');
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
      if (window.confirm(t('admin.productForm.unsaved'))) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, t]);
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
        <PageHeader title={t('admin.productForm.notFound')} />
        <Link to="/admin/products" className="text-sm underline">{t('admin.productForm.back')}</Link>
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

  const setText = (lang: Lang, field: 'name' | 'description', value: string) => {
    if (lang === 'uz') set(field === 'name' ? { name: value } : { description: value });
    else set({ translations: { ...form.translations, [lang]: { ...form.translations[lang], [field]: value } } });
  };

  /** Show the language tab that holds the first error. */
  const focusErrorTab = (errs: ProductErrors) => {
    if (errs.name || errs.description) return setTextLang('uz');
    const l = (['ru', 'en'] as const).find((x) => errs[`translations.${x}.name`] || errs[`translations.${x}.description`]);
    if (l) setTextLang(l);
  };

  const missing = missingTranslations({ description: form.description, translations: form.translations });
  const missingLabel = missing.map((l) => t(`language.names.${l}`)).join(', ');

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const toggleAvailability = (key: string) => set({ unavailable: toggle(form.unavailable, key) });

  const save = async (andNew: boolean) => {
    setAttempted(true);
    if (busyUploads) {
      setMessage({ tone: 'error', text: t('admin.productForm.waitUploads') });
      return;
    }
    const pre = validateProductInput(form);
    if (!pre.ok) {
      setErrors(pre.errors);
      focusErrorTab(pre.errors);
      setMessage({ tone: 'error', text: t('admin.productForm.fixErrors') });
      return;
    }
    setSaving(true);
    const r = mode === 'edit' && id ? await adminProducts.updateProduct(id, form) : await adminProducts.createProduct(form);
    setSaving(false);
    if (!r.ok) {
      setErrors(r.errors);
      focusErrorTab(r.errors);
      setMessage({ tone: 'error', text: t('admin.productForm.fixErrors') });
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
      setTextLang('uz');
      setMessage({
        tone: 'success',
        text: missing.length
          ? `${t('admin.productForm.savedWithMissing', { langs: missingLabel })} “${r.product.name}”`
          : `${t('admin.productForm.saved')} “${r.product.name}”`,
      });
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

  const title = mode === 'edit' ? t('admin.productForm.editTitle') : mode === 'duplicate' ? t('admin.productForm.duplicateTitle') : t('admin.productForm.newTitle');

  return (
    <form onSubmit={onSubmit} noValidate className="pb-24">
      <Link to="/admin/products" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
        <ArrowLeft size={13} /> {t('admin.productForm.back')}
      </Link>
      <PageHeader title={title} subtitle={existing ? `${t('admin.productForm.created')}: ${formatDateTime(existing.createdAt)} · ${t('admin.productForm.updated')}: ${formatDateTime(existing.updatedAt)}` : undefined} />

      {mode === 'duplicate' && (
        <Notice tone="info">
          <span className="flex gap-2"><Info size={16} className="mt-0.5 shrink-0" /> {t('admin.productForm.duplicateNote')}</span>
        </Notice>
      )}
      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title={t('admin.productForm.texts')}>
            <div className="p-5">
              <p className="mb-4 text-xs text-muted">{t('admin.productForm.textsHint')}</p>
              {missing.length > 0 && (
                <p role="status" className="mb-4 flex items-start gap-2 border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {t('admin.productForm.missingTranslations', { langs: missingLabel })}
                </p>
              )}
              <TranslationTabs form={form} errors={errors} active={textLang} onActive={setTextLang} onChange={setText} autoFocus={mode !== 'edit'} />
            </div>
          </Panel>

          <Panel title={t('admin.productForm.basics')}>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label={t('admin.productForm.price')} error={errors.price} htmlFor="pf-price">
                <PriceInput id="pf-price" value={form.price} onChange={(price) => set({ price })} invalid={!!errors.price} />
              </Field>
              <Field label={t('admin.productForm.slug')} error={errors.slug} hint={t('admin.productForm.slugHint', { slug: form.slug })} htmlFor="pf-slug">
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
                      {t('admin.productForm.slugAuto')}
                    </button>
                  )}
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title={t('admin.productForm.images')}>
            <div className="p-5">
              <ImageManager images={form.images} onChange={(images) => set({ images })} onBusyChange={setBusyUploads} altBase={form.name} error={errors.images} />
            </div>
          </Panel>

          <Panel title={t('admin.productForm.variants')}>
            <div className="space-y-6 p-5">
              <Field label={t('admin.productForm.sizes')} error={errors.sizes}>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((s) => (
                    <button key={s} type="button" aria-pressed={form.sizes.includes(s)} className={chip(form.sizes.includes(s))} onClick={() => set({ sizes: sortSizes(toggle(form.sizes, s)) })}>
                      {sizeLabel(s)}
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
                      placeholder={t('admin.productForm.customSize')}
                      aria-label={t('admin.productForm.customSize')}
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
                      {t('admin.productForm.addSize')}
                    </button>
                  </span>
                </div>
              </Field>

              <Field label={t('admin.productForm.colors')} error={errors.colorIds}>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => {
                    const on = form.colorIds.includes(c.id);
                    return (
                      <button key={c.id} type="button" aria-pressed={on} onClick={() => set({ colorIds: toggle(form.colorIds, c.id) })} className={cn(chip(on), 'gap-2')}>
                        <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex }} />
                        {taxonomyName(c)}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-medium">{t('admin.productForm.availability')}</p>
                  {form.unavailable.length > 0 && (
                    <button type="button" className="text-xs text-muted underline underline-offset-4 hover:text-ink" onClick={() => set({ unavailable: [] })}>
                      {t('admin.productForm.allAvailable')}
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
                            {form.sizes.map((s) => <th key={s} className="px-2 pb-2 font-medium">{sizeLabel(s)}</th>)}
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
                                    {c ? taxonomyName(c) : cid}
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
                                        aria-label={`${c ? taxonomyName(c) : cid} ${sizeLabel(s)}`}
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
                    <p className="mt-2 text-xs text-muted">{t('admin.productForm.availabilityHint')}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted">{t('admin.productForm.selectSizesColors')}</p>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t('admin.productForm.visibility')}>
            <div className="space-y-4 p-5">
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium">{t('admin.productForm.status')}</legend>
                <div className="space-y-1.5">
                  {(['active', 'inactive', 'archived'] as ProductStatus[]).map((s) => (
                    <label key={s} className={cn('flex cursor-pointer items-start gap-3 border px-3 py-2.5 text-sm', form.status === s ? 'border-ink' : 'border-line hover:border-stone')}>
                      <input type="radio" name="status" checked={form.status === s} onChange={() => set({ status: s })} className="mt-1 accent-[var(--color-ink)]" />
                      <span>
                        {t(`admin.products.status.${s}`)}
                        <span className="block text-xs text-muted">{t(`admin.products.statusHint.${s}`)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {(['featured', 'newArrival'] as const).map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" checked={form[k]} onChange={(e) => set({ [k]: e.target.checked })} className="h-4 w-4 accent-[var(--color-ink)]" />
                  {k === 'featured' ? t('admin.productForm.featured') : t('admin.productForm.newArrival')}
                </label>
              ))}
            </div>
          </Panel>

          <Panel title={t('admin.productForm.classification')}>
            <div className="space-y-4 p-5">
              <Field label={t('admin.productForm.category')} error={errors.categoryId} htmlFor="pf-cat">
                <select id="pf-cat" value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value as ProductInput['categoryId'] })} className={cn(adminSelect, 'w-full')}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{taxonomyName(c)}</option>)}
                </select>
              </Field>
              <Field label={t('admin.productForm.gender')} error={errors.gender}>
                <div className="grid grid-cols-3 gap-1">
                  {(['men', 'women', 'unisex'] as Gender[]).map((g) => (
                    <button key={g} type="button" aria-pressed={form.gender === g} className={chip(form.gender === g)} onClick={() => set({ gender: g })}>
                      {t(`gender.${g}`)}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title={t('admin.productForm.delivery')}>
            <div className="grid grid-cols-2 gap-3 p-5">
              <Field label={t('admin.productForm.minDays')} error={errors['deliveryEstimate.minDays']} htmlFor="pf-min">
                <input id="pf-min" type="number" min={1} max={120} value={form.deliveryEstimate.minDays} onChange={(e) => set({ deliveryEstimate: { ...form.deliveryEstimate, minDays: Number(e.target.value) } })} className={cn(adminInput, 'w-full')} />
              </Field>
              <Field label={t('admin.productForm.maxDays')} error={errors['deliveryEstimate.maxDays']} htmlFor="pf-max">
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
              <AlertCircle size={14} /> {t('admin.productForm.fixErrors')}
            </p>
          )}
          <Link to="/admin/products" className="px-3 text-sm text-muted hover:text-ink">{t('admin.productForm.cancel')}</Link>
          {mode !== 'edit' && (
            <Button variant="secondary" disabled={saving || busyUploads} onClick={() => save(true)} className="hidden sm:inline-flex">
              {t('admin.productForm.saveAndNew')}
            </Button>
          )}
          <Button type="submit" disabled={saving || busyUploads}>
            {saving ? t('admin.productForm.saving') : busyUploads ? t('admin.productForm.uploading') + '…' : t('admin.productForm.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
