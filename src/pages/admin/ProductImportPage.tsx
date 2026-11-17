import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, ImageIcon, TriangleAlert } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { Notice, PageHeader, Panel } from '@/components/admin/AdminUI';
import { Button, ButtonLink } from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/usePageTitle';
import { adminProducts } from '@/services/catalog';
import { imageStorage } from '@/services/storage';
import { CATEGORIES, COLORS } from '@/data/mock/taxonomy';
import { parseCsv, downloadTextFile } from '@/features/csv/csv';
import { csvTemplate, parseProductCsv, type CsvParseResult } from '@/features/csv/productCsv';
import { prepareImage } from '@/features/products/admin/images';
import type { ProductImage } from '@/types/catalog';
import type { ProductInput } from '@/features/products/admin/productInput';

const ti = t.admin.importPage;

function FilePicker({ accept, multiple, label, onFiles }: { accept: string; multiple?: boolean; label: string; onFiles: (files: File[]) => void }) {
  return (
    <label className="inline-flex h-10 cursor-pointer items-center border border-ink px-4 text-xs font-medium hover:bg-ink hover:text-paper focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
      {label}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
    </label>
  );
}

export function ProductImportPage() {
  usePageTitle(ti.title);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvName, setCsvName] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [slugs, setSlugs] = useState<string[] | null>(null);
  const [readError, setReadError] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcome, setOutcome] = useState<{ ok: true; count: number; skipped: number } | { ok: false } | null>(null);

  useEffect(() => {
    adminProducts.listSlugs().then(setSlugs);
  }, [outcome]);

  const result: CsvParseResult | null = useMemo(() => {
    if (csvText == null || !slugs) return null;
    return parseProductCsv(parseCsv(csvText), { categories: CATEGORIES, colors: COLORS, takenSlugs: slugs, imageFiles });
  }, [csvText, slugs, imageFiles]);

  const validRows = result?.rows.filter((r) => r.input) ?? [];
  const invalidRows = result?.rows.filter((r) => !r.input) ?? [];

  const onCsv = async (file: File | undefined) => {
    setOutcome(null);
    setReadError(false);
    if (!file) return;
    try {
      setCsvText(await file.text());
      setCsvName(file.name);
    } catch {
      setReadError(true);
      setCsvText(null);
    }
  };

  const runImport = async () => {
    if (!validRows.length) return;
    // Upload each distinct file once, then build the final product inputs.
    const files = [...new Set(validRows.flatMap((r) => r.imageRefs.filter((x) => x.kind === 'file').map((x) => (x as { file: File }).file)))];
    setProgress({ done: 0, total: files.length });
    try {
      const uploaded = new Map<File, { url: string; storagePath: string }>();
      for (const f of files) {
        uploaded.set(f, await imageStorage.upload(await prepareImage(f)));
        setProgress((p) => p && { ...p, done: p.done + 1 });
      }
      const inputs: ProductInput[] = validRows.map((r) => {
        const images: ProductImage[] = r.imageRefs.map((ref, i) => {
          const src = ref.kind === 'url' ? { url: ref.url, storagePath: null } : uploaded.get(ref.file)!;
          return { id: crypto.randomUUID(), url: src.url, storagePath: src.storagePath, alt: r.input!.name, position: i };
        });
        return { ...r.input!, images };
      });
      await adminProducts.importProducts(inputs);
      setOutcome({ ok: true, count: inputs.length, skipped: invalidRows.length });
      setCsvText(null);
      setCsvName('');
      setImageFiles([]);
    } catch {
      setOutcome({ ok: false });
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <Link to="/admin/products" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
        <ArrowLeft size={13} /> {t.admin.productForm.back}
      </Link>
      <PageHeader title={ti.title} subtitle={ti.intro} />

      {outcome?.ok && (
        <Notice tone="success">
          <p className="flex items-center gap-2"><CheckCircle2 size={16} /> {ti.done(outcome.count)}</p>
          {outcome.skipped > 0 && <p className="mt-1">{ti.skipped(outcome.skipped)}</p>}
          <ButtonLink to="/admin/products" variant="link" className="mt-2 text-sm">{t.admin.products.title}</ButtonLink>
        </Notice>
      )}
      {outcome && !outcome.ok && <Notice tone="error">{ti.failed}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title={ti.step2}>
            <div className="grid gap-5 p-5 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-[13px] font-medium"><FileSpreadsheet size={15} /> {ti.csvFile}</label>
                <FilePicker accept=".csv,text/csv" label={ti.chooseCsv} onFiles={(f) => onCsv(f[0])} />
                {csvName && <p className="mt-1.5 truncate text-xs text-muted">{csvName}</p>}
                {readError && <p role="alert" className="mt-1.5 text-xs text-danger">{ti.readError}</p>}
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-[13px] font-medium"><ImageIcon size={15} /> {ti.imageFiles}</label>
                <FilePicker accept="image/jpeg,image/png,image/webp" multiple label={ti.chooseImages} onFiles={setImageFiles} />
                <p className="mt-1.5 text-xs text-muted">{imageFiles.length ? ti.selectedImages(imageFiles.length) : ti.imageFilesHint}</p>
              </div>
            </div>
          </Panel>

          {result && (
            <Panel title={ti.step3}>
              <div className="p-5">
                {result.fileErrors.map((e) => (
                  <p key={e} role="alert" className="mb-2 flex items-start gap-2 text-sm text-danger"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {e}</p>
                ))}
                {result.fileWarnings.map((w) => (
                  <p key={w} className="mb-2 flex items-start gap-2 text-sm text-clay"><TriangleAlert size={16} className="mt-0.5 shrink-0" /> {w}</p>
                ))}
                {result.rows.length > 0 && (
                  <>
                    <p className="mb-1 text-sm font-medium">{ti.summary(validRows.length, invalidRows.length)}</p>
                    {invalidRows.length > 0 && <p className="mb-4 text-xs text-danger">{ti.invalidNote}</p>}
                    <div className="max-h-[520px] overflow-auto border border-line">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-mist text-[11px] tracking-[0.12em] text-muted uppercase">
                          <tr>
                            <th className="px-3 py-2 font-medium">{ti.row}</th>
                            <th className="px-3 py-2 font-medium">{t.admin.products.columns.product}</th>
                            <th className="px-3 py-2 font-medium">{ti.result}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {result.rows.map((r) => (
                            <tr key={r.rowNumber} className={cn(!r.input && 'bg-danger/5')}>
                              <td className="px-3 py-2 align-top text-muted tabular-nums">{r.rowNumber}</td>
                              <td className="px-3 py-2 align-top">
                                <p className="font-medium">{r.name || '—'}</p>
                                {r.input && <p className="text-xs text-muted">/{r.input.slug} · {r.input.price.toLocaleString('ru-RU')} soʻm · {r.imageRefs.length} rasm</p>}
                              </td>
                              <td className="px-3 py-2 align-top text-xs">
                                {r.input ? (
                                  <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 size={13} /> {ti.ready}</span>
                                ) : (
                                  <ul className="space-y-0.5 text-danger">{r.errors.map((e) => <li key={e}>• {e}</li>)}</ul>
                                )}
                                {r.warnings.map((w) => <p key={w} className="mt-0.5 text-clay">{w}</p>)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button onClick={runImport} disabled={!validRows.length || !!progress}>
                        {progress ? ti.importing(progress.done, progress.total) : ti.confirm(validRows.length)}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Panel>
          )}
        </div>

        <div className="order-first space-y-6 xl:order-none">
          <Panel title={ti.step1}>
            <div className="p-5">
              <Button variant="secondary" size="sm" onClick={() => downloadTextFile('mahsulotlar-shablon.csv', csvTemplate())}>
                <Download size={15} /> {ti.template}
              </Button>
            </div>
          </Panel>
          <Panel title={ti.columnsTitle}>
            <ul className="space-y-2 p-5 text-xs leading-relaxed text-ink-soft">
              {ti.columnsHelp.map((h) => <li key={h}>• {h}</li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
