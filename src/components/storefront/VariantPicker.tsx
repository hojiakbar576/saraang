import type { Color, Product } from '@/types/catalog';
import { isColorAvailable, isSizeAvailable } from '@/features/products/variants';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { sizeLabel, taxonomyName } from '@/i18n/content';

interface Props {
  product: Product;
  colors: Map<string, Color>;
  colorId: string | null;
  size: string | null;
  onColorChange: (id: string) => void;
  onSizeChange: (size: string) => void;
  showSizeError?: boolean;
}

/** Size and colour selectors. Unavailable options are visible but cannot be chosen. */
export function VariantPicker({ product, colors, colorId, size, onColorChange, onSizeChange, showSizeError }: Props) {
  const { t } = useTranslation();
  const selectedColor = colorId ? colors.get(colorId) : undefined;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 flex gap-2 text-[13px]">
          <span className="font-medium">{t('product.color')}:</span>
          <span className="text-muted">{selectedColor ? taxonomyName(selectedColor) : t('product.selectColor')}</span>
        </legend>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('product.color')}>
          {product.colorIds.map((id) => {
            const c = colors.get(id);
            if (!c) return null;
            const available = isColorAvailable(product, id);
            const selected = id === colorId;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={available ? taxonomyName(c) : `${taxonomyName(c)} — ${t('product.unavailable')}`}
                title={available ? taxonomyName(c) : `${taxonomyName(c)} — ${t('product.unavailable')}`}
                disabled={!available}
                onClick={() => onColorChange(id)}
                className={cn(
                  'relative h-9 w-9 rounded-full ring-offset-[3px] ring-offset-paper transition-shadow disabled:cursor-not-allowed',
                  selected ? 'ring-1 ring-ink' : 'ring-1 ring-black/10 hover:ring-ink/50',
                  !available && 'opacity-40',
                )}
                style={{ backgroundColor: c.hex }}
              >
                {!available && (
                  <span aria-hidden className="absolute top-1/2 left-1/2 h-px w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink" />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 flex gap-2 text-[13px]">
          <span className="font-medium">{t('product.size')}:</span>
          <span className={cn(showSizeError && !size ? 'text-danger' : 'text-muted')}>{size ?? t('product.selectSize')}</span>
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('product.size')}>
          {product.sizes.map((s) => {
            const available = isSizeAvailable(product, s, colorId);
            const selected = s === size;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={available ? sizeLabel(s) : `${sizeLabel(s)} — ${t('product.unavailable')}`}
                disabled={!available}
                onClick={() => onSizeChange(s)}
                className={cn(
                  'relative h-11 min-w-12 border px-4 text-[13px] transition-colors',
                  selected ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink',
                  !available && 'cursor-not-allowed border-line text-muted/60 line-through decoration-muted/60 hover:border-line',
                  showSizeError && !size && available && 'border-danger/50',
                )}
              >
                {sizeLabel(s)}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

export function QuantityStepper({ value, onChange, max = 10 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const { t } = useTranslation();
  const btn = 'flex h-11 w-11 items-center justify-center text-lg hover:bg-mist disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="inline-flex items-center border border-line" role="group" aria-label={t('product.quantity')}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={t('product.decrease')}>
        −
      </button>
      <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t('product.increase')}>
        +
      </button>
    </div>
  );
}
