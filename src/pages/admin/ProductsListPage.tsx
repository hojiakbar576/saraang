import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Archive, ArchiveRestore, Copy, Download, ExternalLink, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Notice, PageHeader, Panel, ProductStatusBadge, adminInput, adminSelect } from '@/components/admin/AdminUI';
import { ButtonLink, Button } from '@/components/ui/Button';
import { Price, Skeleton } from '@/components/ui/primitives';
import { useAdminProducts } from '@/hooks/useAdminProducts';
import { usePageTitle } from '@/hooks/usePageTitle';
import { adminProducts } from '@/services/catalog';
import { localProductStore } from '@/services/catalog/mock/localProductStore';
import { supabaseEnabled } from '@/services/supabase/client';
import { CATEGORIES } from '@/data/mock/taxonomy';
import { productsToCsv } from '@/features/csv/productCsv';
import { downloadTextFile } from '@/features/csv/csv';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import type { Gender, Product, ProductStatus } from '@/types/catalog';
import { allProductNames, missingTranslations, productName, taxonomyName } from '@/i18n/content';

const categoryName = (id: string) => {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? taxonomyName(c) : id;
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[ʻʼ'‘’`]/g, '');
}

function RowActions({ p, onAction }: { p: Product; onAction: (kind: 'archive' | 'restore' | 'delete', p: Product) => void }) {
  const { t } = useTranslation();
  const btn = 'inline-flex h-8 w-8 items-center justify-center text-muted hover:bg-mist hover:text-ink';
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link to={`/admin/products/${p.id}/edit`} className={btn} title={t('admin.products.edit')} aria-label={`${t('admin.products.edit')}: ${productName(p)}`}>
        <Pencil size={15} strokeWidth={1.5} />
      </Link>
      <Link to={`/admin/products/new?from=${p.id}`} className={btn} title={t('admin.products.duplicate')} aria-label={`${t('admin.products.duplicate')}: ${productName(p)}`}>
        <Copy size={15} strokeWidth={1.5} />
      </Link>
      {p.status === 'active' && (
        <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className={btn} title={t('admin.products.view')} aria-label={`${t('admin.products.view')}: ${productName(p)}`}>
          <ExternalLink size={15} strokeWidth={1.5} />
        </a>
      )}
      {p.status === 'archived' ? (
        <button type="button" className={btn} title={t('admin.products.restore')} aria-label={`${t('admin.products.restore')}: ${productName(p)}`} onClick={() => onAction('restore', p)}>
          <ArchiveRestore size={15} strokeWidth={1.5} />
        </button>
      ) : (
        <button type="button" className={btn} title={t('admin.products.archive')} aria-label={`${t('admin.products.archive')}: ${productName(p)}`} onClick={() => onAction('archive', p)}>
          <Archive size={15} strokeWidth={1.5} />
        </button>
      )}
      <button type="button" className={`${btn} hover:text-danger`} title={t('admin.products.delete')} aria-label={`${t('admin.products.delete')}: ${productName(p)}`} onClick={() => onAction('delete', p)}>
        <Trash2 size={15} strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** UZ always present; RU/EN shown struck through when the translation is incomplete. */
function TranslationStatus({ p }: { p: Product }) {
  const { t } = useTranslation();
  const missing = missingTranslations(p);
  const label = missing.length
    ? t('admin.products.translationsMissing', { langs: missing.map((l) => t(`language.names.${l}`)).join(', ') })
    : t('admin.products.translationsComplete');
  return (
    <span className="inline-flex gap-1 text-[10px] font-medium tracking-[0.08em]" title={label} aria-label={label}>
      {(['uz', 'ru', 'en'] as const).map((l) => {
        const ok = l === 'uz' || !missing.includes(l);
        return (
          <span key={l} aria-hidden className={cn('border px-1 py-px uppercase', ok ? 'border-line text-ink-soft' : 'border-clay/40 text-clay line-through')}>
            {l}
          </span>
        );
      })}
    </span>
  );
}

export function ProductsListPage() {
  const { t } = useTranslation();
  usePageTitle(t('admin.products.title'));
  const { products, loading, reload } = useAdminProducts();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  const filtered = useMemo(() => {
    if (!products) return undefined;
    const q = normalize(query.trim());
    return products.filter(
      (p) =>
        (!q || normalize(`${allProductNames(p).join(' ')} ${p.slug}`).includes(q)) &&
        (!category || p.categoryId === category) &&
        (!gender || p.gender === gender) &&
        (!status || p.status === status),
    );
  }, [products, query, category, gender, status]);

  const onAction = async (kind: 'archive' | 'restore' | 'delete', p: Product) => {
    if (kind === 'delete') {
      if (!window.confirm(t('admin.products.deleteConfirm', { name: productName(p) }))) return;
      const r = await adminProducts.deleteProduct(p.id);
      setNotice(r.ok ? { tone: 'success', text: t('admin.products.deleted') } : { tone: 'error', text: r.reason === 'has_orders' ? t('admin.products.deleteBlocked') : t('admin.products.emptyTitle') });
    } else {
      await adminProducts.setStatus(p.id, kind === 'archive' ? 'archived' : 'inactive');
      setNotice({ tone: 'success', text: kind === 'archive' ? t('admin.products.archived') : t('admin.products.restored') });
    }
    reload();
  };

  const exportCsv = () => {
    if (!products) return;
    const { csv, skippedImages } = productsToCsv(products);
    downloadTextFile(`mahsulotlar-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    if (skippedImages) setNotice({ tone: 'info', text: t('admin.products.exportSkipped', { count: skippedImages }) });
  };

  const resetDemo = async () => {
    if (!window.confirm(t('admin.products.resetDemoConfirm'))) return;
    await localProductStore.reset();
    reload();
  };

  return (
    <>
      <PageHeader
        title={t('admin.products.title')}
        subtitle={products ? t('admin.products.subtitle', { count: products.length }) : undefined}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!products?.length}>
              <Download size={15} /> {t('admin.products.export')}
            </Button>
            <ButtonLink to="/admin/products/import" variant="secondary" size="sm">
              <Upload size={15} /> {t('admin.products.import')}
            </ButtonLink>
            <ButtonLink to="/admin/products/new" size="sm">
              <Plus size={15} /> {t('admin.products.add')}
            </ButtonLink>
          </>
        }
      />

      {notice && (
        <Notice tone={notice.tone} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">{t('admin.products.search')}</span>
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('admin.products.search')} className={`${adminInput} w-full pl-9`} />
        </label>
        <select aria-label={t('admin.products.columns.category')} value={category} onChange={(e) => setCategory(e.target.value)} className={adminSelect}>
          <option value="">{t('admin.products.allCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{taxonomyName(c)}</option>
          ))}
        </select>
        <select aria-label={t('collection.gender')} value={gender} onChange={(e) => setGender(e.target.value)} className={adminSelect}>
          <option value="">{t('admin.products.allGenders')}</option>
          {(['men', 'women', 'unisex'] as Gender[]).map((g) => (
            <option key={g} value={g}>{t(`gender.${g}`)}</option>
          ))}
        </select>
        <select aria-label={t('admin.products.columns.status')} value={status} onChange={(e) => setStatus(e.target.value)} className={adminSelect}>
          <option value="">{t('admin.products.allStatuses')}</option>
          {(['active', 'inactive', 'archived'] as ProductStatus[]).map((s) => (
            <option key={s} value={s}>{t(`admin.products.status.${s}`)}</option>
          ))}
        </select>
      </div>

      <Panel>
        {loading || !filtered ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="display text-2xl">{t('admin.products.emptyTitle')}</p>
            <p className="mt-2 text-sm text-muted">{t('admin.products.emptyText')}</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {filtered.map((p) => (
                <li key={p.id} className="flex gap-3 p-4">
                  <Thumb p={p} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${p.id}/edit`} className="block truncate text-sm font-medium">{productName(p)}</Link>
                    <p className="text-xs text-muted">{categoryName(p.categoryId)} · {t(`gender.${p.gender}`)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Price amount={p.price} className="text-sm" />
                      <ProductStatusBadge status={p.status} />
                      <TranslationStatus p={p} />
                    </div>
                    <div className="-ml-2 mt-1">
                      <RowActions p={p} onAction={onAction} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] tracking-[0.12em] text-muted uppercase">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 font-medium">{t('admin.products.columns.product')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.products.columns.category')}</th>
                    <th className="px-3 py-3 text-right font-medium">{t('admin.products.columns.price')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.products.columns.variants')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.products.columns.status')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.products.columns.updated')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.products.columns.languages')}</th>
                    <th className="px-3 py-3"><span className="sr-only">{t('common.actions')}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-mist/50">
                      <td className="min-w-64 px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <Thumb p={p} />
                          <div className="min-w-0">
                            <Link to={`/admin/products/${p.id}/edit`} className="font-medium hover:underline">{productName(p)}</Link>
                            <p className="text-xs text-muted">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">
                        {categoryName(p.categoryId)}
                        <p className="text-xs text-muted">{t(`gender.${p.gender}`)}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap"><Price amount={p.price} /></td>
                      <td className="px-3 py-2.5 text-xs text-muted tabular-nums">
                        {t('admin.products.variantsAvailable', { available: p.variants.filter((v) => v.available).length, total: p.variants.length })}
                      </td>
                      <td className="px-3 py-2.5"><ProductStatusBadge status={p.status} /></td>
                      <td className="px-3 py-2.5 text-xs text-muted tabular-nums">{formatDate(p.updatedAt)}</td>
                      <td className="px-3 py-2.5"><TranslationStatus p={p} /></td>
                      <td className="px-3 py-2.5"><RowActions p={p} onAction={onAction} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {import.meta.env.DEV && !supabaseEnabled && (
        <button type="button" onClick={resetDemo} className="mt-4 text-xs text-muted underline underline-offset-4 hover:text-ink">
          {t('admin.products.resetDemo')}
        </button>
      )}
    </>
  );
}

function Thumb({ p }: { p: Product }) {
  const img = [...p.images].sort((a, b) => a.position - b.position)[0];
  return img ? (
    <img src={img.url} alt="" className="h-14 w-11 shrink-0 bg-mist object-cover" />
  ) : (
    <div className="h-14 w-11 shrink-0 bg-mist" />
  );
}
