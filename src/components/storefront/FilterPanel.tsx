import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { Category, CategoryId, Color, Gender } from '@/types/catalog';
import type { ProductFilters } from '@/features/products/filters';
import { useTranslation } from 'react-i18next';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatUZS } from '@/lib/money';
import { sizeLabel, taxonomyName } from '@/i18n/content';
import { currencyLabel } from '@/lib/money';

export interface FilterOptions {
  categories: Category[];
  genders: Gender[];
  sizes: string[];
  colors: Color[];
}

export const PRICE_RANGES: { min: number | null; max: number | null }[] = [
  { min: null, max: 299_999 },
  { min: 300_000, max: 499_999 },
  { min: 500_000, max: 999_999 },
  { min: 1_000_000, max: null },
];

function priceLabel(r: { min: number | null; max: number | null }) {
  const n = (v: number) => formatUZS(v, false);
  if (r.min == null && r.max != null) return `${n(r.max + 1)} ${t('collection.priceMax').toLowerCase()}`;
  if (r.max == null && r.min != null) return `${n(r.min)} ${t('collection.priceMin').toLowerCase()}`;
  return `${n(r.min ?? 0)} – ${n((r.max ?? 0) + 1)}`;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line py-5 first:pt-0">
      <legend className="eyebrow mb-3 text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

const chip =
  'inline-flex min-h-9 items-center justify-center border px-3 text-xs tracking-wide transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper border-line hover:border-ink';

interface Props {
  filters: ProductFilters;
  options: FilterOptions;
  onChange: (next: ProductFilters) => void;
}

export function FilterPanel({ filters, options, onChange }: Props) {
  const { t } = useTranslation();
  const set = (patch: Partial<ProductFilters>) => onChange({ ...filters, ...patch });

  return (
    <div>
      {options.categories.length > 1 && (
        <Group title={t('collection.category')}>
          <ul className="space-y-1">
            {options.categories.map((c) => {
              const checked = filters.categoryIds.includes(c.id);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={checked}
                      onChange={() => set({ categoryIds: toggle<CategoryId>(filters.categoryIds, c.id) })}
                    />
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center border peer-focus-visible:outline-2 peer-focus-visible:outline-ink',
                        checked ? 'border-ink bg-ink text-paper' : 'border-stone',
                      )}
                    >
                      {checked && <Check size={12} strokeWidth={2} />}
                    </span>
                    <span className={checked ? 'text-ink' : 'text-ink-soft'}>{taxonomyName(c)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Group>
      )}

      {options.genders.length > 1 && (
        <Group title={t('collection.gender')}>
          <div className="flex flex-wrap gap-2">
            {options.genders.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={filters.genders.includes(g)}
                className={chip}
                onClick={() => set({ genders: toggle(filters.genders, g) })}
              >
                {t(`gender.${g}`)}
              </button>
            ))}
          </div>
        </Group>
      )}

      {options.sizes.length > 0 && (
        <Group title={t('collection.size')}>
          <div className="flex flex-wrap gap-2">
            {options.sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={filters.sizes.includes(s)}
                className={cn(chip, 'min-w-11')}
                onClick={() => set({ sizes: toggle(filters.sizes, s) })}
              >
                {sizeLabel(s)}
              </button>
            ))}
          </div>
        </Group>
      )}

      {options.colors.length > 0 && (
        <Group title={t('collection.color')}>
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            {options.colors.map((c) => {
              const active = filters.colorIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ colorIds: toggle(filters.colorIds, c.id) })}
                  className="flex items-center gap-2 text-xs text-ink-soft"
                >
                  <span
                    className={cn(
                      'h-6 w-6 rounded-full ring-1 ring-black/10 ring-offset-2 ring-offset-paper transition-shadow',
                      active && 'ring-2 ring-ink',
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className={active ? 'text-ink' : undefined}>{taxonomyName(c)}</span>
                </button>
              );
            })}
          </div>
        </Group>
      )}

      <Group title={t('collection.price')}>
        <div className="flex flex-col gap-2">
          {PRICE_RANGES.map((r) => {
            const active = filters.minPrice === r.min && filters.maxPrice === r.max;
            return (
              <button
                key={`${r.min}-${r.max}`}
                type="button"
                aria-pressed={active}
                className={cn(chip, 'justify-start tabular-nums')}
                onClick={() => set(active ? { minPrice: null, maxPrice: null } : { minPrice: r.min, maxPrice: r.max })}
              >
                {priceLabel(r)} {currencyLabel()}
              </button>
            );
          })}
        </div>
      </Group>
    </div>
  );
}
