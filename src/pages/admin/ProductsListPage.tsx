import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Archive, ArchiveRestore, Copy, Download, ExternalLink, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { t } from '@/i18n';
import { Notice, PageHeader, Panel, ProductStatusBadge, adminInput, adminSelect } from '@/components/admin/AdminUI';
import { ButtonLink, Button } from '@/components/ui/Button';
import { Price, Skeleton } from '@/components/ui/primitives';
import { useAdminProducts } from '@/hooks/useAdminProducts';
import { usePageTitle } from '@/hooks/usePageTitle';
import { adminProducts } from '@/services/catalog';
import { localProductStore } from '@/services/catalog/mock/localProductStore';
import { CATEGORIES } from '@/data/mock/taxonomy';
import { productsToCsv } from '@/features/csv/productCsv';
import { downloadTextFile } from '@/features/csv/csv';
import { formatDate } from '@/lib/date';
import type { Gender, Product, ProductStatus } from '@/types/catalog';

const tp = t.admin.products;
const categoryName = new Map(CATEGORIES.map((c) => [c.id, c.name]));

function normalize(s: string) {
  return s.toLowerCase().replace(/[ʻʼ'‘’`]/g, '');
}

function RowActions({ p, onAction }: { p: Product; onAction: (kind: 'archive' | 'restore' | 'delete', p: Product) => void }) {
  const btn = 'inline-flex h-8 w-8 items-center justify-center text-muted hover:bg-mist hover:text-ink';
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link to={`/admin/products/${p.id}/edit`} className={btn} title={tp.edit} aria-label={`${tp.edit}: ${p.name}`}>
        <Pencil size={15} strokeWidth={1.5} />
      </Link>
      <Link to={`/admin/products/new?from=${p.id}`} className={btn} title={tp.duplicate} aria-label={`${tp.duplicate}: ${p.name}`}>
        <Copy size={15} strokeWidth={1.5} />
      </Link>
      {p.status === 'active' && (
        <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className={btn} title={tp.view} aria-label={`${tp.view}: ${p.name}`}>
          <ExternalLink size={15} strokeWidth={1.5} />
        </a>
      )}
      {p.status === 'archived' ? (
        <button type="button" className={btn} title={tp.restore} aria-label={`${tp.restore}: ${p.name}`} onClick={() => onAction('restore', p)}>
          <ArchiveRestore size={15} strokeWidth={1.5} />
        </button>
      ) : (
        <button type="button" className={btn} title={tp.archive} aria-label={`${tp.archive}: ${p.name}`} onClick={() => onAction('archive', p)}>
          <Archive size={15} strokeWidth={1.5} />
        </button>
      )}
      <button type="button" className={`${btn} hover:text-danger`} title={tp.delete} aria-label={`${tp.delete}: ${p.name}`} onClick={() => onAction('delete', p)}>
        <Trash2 size={15} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function ProductsListPage() {
  usePageTitle(tp.title);
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
        (!q || normalize(`${p.name} ${p.slug}`).includes(q)) &&
        (!category || p.categoryId === category) &&
        (!gender || p.gender === gender) &&
        (!status || p.status === status),
    );
  }, [products, query, category, gender, status]);

  const onAction = async (kind: 'archive' | 'restore' | 'delete', p: Product) => {
    if (kind === 'delete') {
      if (!window.confirm(tp.deleteConfirm(p.name))) return;
      const r = await adminProducts.deleteProduct(p.id);
      setNotice(r.ok ? { tone: 'success', text: tp.deleted } : { tone: 'error', text: r.reason === 'has_orders' ? tp.deleteBlocked : tp.emptyTitle });
    } else {
      await adminProducts.setStatus(p.id, kind === 'archive' ? 'archived' : 'inactive');
      setNotice({ tone: 'success', text: kind === 'archive' ? tp.archived : tp.restored });
    }
    reload();
  };

  const exportCsv = () => {
    if (!products) return;
    const { csv, skippedImages } = productsToCsv(products);
    downloadTextFile(`mahsulotlar-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    if (skippedImages) setNotice({ tone: 'info', text: tp.exportSkipped(skippedImages) });
  };

  const resetDemo = async () => {
    if (!window.confirm(tp.resetDemoConfirm)) return;
    await localProductStore.reset();
    reload();
  };

  return (
    <>
      <PageHeader
        title={tp.title}
        subtitle={products ? tp.subtitle(products.length) : undefined}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!products?.length}>
              <Download size={15} /> {tp.export}
            </Button>
            <ButtonLink to="/admin/products/import" variant="secondary" size="sm">
              <Upload size={15} /> {tp.import}
            </ButtonLink>
            <ButtonLink to="/admin/products/new" size="sm">
              <Plus size={15} /> {tp.add}
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
          <span className="sr-only">{tp.search}</span>
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tp.search} className={`${adminInput} w-full pl-9`} />
        </label>
        <select aria-label={tp.columns.category} value={category} onChange={(e) => setCategory(e.target.value)} className={adminSelect}>
          <option value="">{tp.allCategories}</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select aria-label={t.collection.gender} value={gender} onChange={(e) => setGender(e.target.value)} className={adminSelect}>
          <option value="">{tp.allGenders}</option>
          {(['men', 'women', 'unisex'] as Gender[]).map((g) => (
            <option key={g} value={g}>{t.gender[g]}</option>
          ))}
        </select>
        <select aria-label={tp.columns.status} value={status} onChange={(e) => setStatus(e.target.value)} className={adminSelect}>
          <option value="">{tp.allStatuses}</option>
          {(['active', 'inactive', 'archived'] as ProductStatus[]).map((s) => (
            <option key={s} value={s}>{tp.status[s]}</option>
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
            <p className="display text-2xl">{tp.emptyTitle}</p>
            <p className="mt-2 text-sm text-muted">{tp.emptyText}</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {filtered.map((p) => (
                <li key={p.id} className="flex gap-3 p-4">
                  <Thumb p={p} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${p.id}/edit`} className="block truncate text-sm font-medium">{p.name}</Link>
                    <p className="text-xs text-muted">{categoryName.get(p.categoryId)} · {t.gender[p.gender]}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Price amount={p.price} className="text-sm" />
                      <ProductStatusBadge status={p.status} />
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
                    <th className="px-5 py-3 font-medium">{tp.columns.product}</th>
                    <th className="px-3 py-3 font-medium">{tp.columns.category}</th>
                    <th className="px-3 py-3 text-right font-medium">{tp.columns.price}</th>
                    <th className="px-3 py-3 font-medium">{tp.columns.variants}</th>
                    <th className="px-3 py-3 font-medium">{tp.columns.status}</th>
                    <th className="px-3 py-3 font-medium">{tp.columns.updated}</th>
                    <th className="px-3 py-3"><span className="sr-only">Amallar</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-mist/50">
                      <td className="min-w-64 px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <Thumb p={p} />
                          <div className="min-w-0">
                            <Link to={`/admin/products/${p.id}/edit`} className="font-medium hover:underline">{p.name}</Link>
                            <p className="text-xs text-muted">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">
                        {categoryName.get(p.categoryId)}
                        <p className="text-xs text-muted">{t.gender[p.gender]}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap"><Price amount={p.price} /></td>
                      <td className="px-3 py-2.5 text-xs text-muted tabular-nums">
                        {tp.variantsAvailable(p.variants.filter((v) => v.available).length, p.variants.length)}
                      </td>
                      <td className="px-3 py-2.5"><ProductStatusBadge status={p.status} /></td>
                      <td className="px-3 py-2.5 text-xs text-muted tabular-nums">{formatDate(p.updatedAt)}</td>
                      <td className="px-3 py-2.5"><RowActions p={p} onAction={onAction} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {import.meta.env.DEV && (
        <button type="button" onClick={resetDemo} className="mt-4 text-xs text-muted underline underline-offset-4 hover:text-ink">
          {tp.resetDemo}
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
