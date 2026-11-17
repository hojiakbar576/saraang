import { useRef, useState } from 'react';
import type { ProductImage } from '@/types/catalog';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/**
 * Mobile: horizontal swipe gallery with position dots.
 * Desktop: large main image with a vertical thumbnail rail.
 */
export function ImageGallery({ images }: { images: ProductImage[] }) {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  const goTo = (i: number) => {
    setActive(i);
    const el = scroller.current;
    if (el && el.offsetParent !== null) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  if (sorted.length === 0) return <div className="aspect-[4/5] bg-mist" />;

  return (
    <div>
      {/* Mobile / tablet */}
      <div className="relative -mx-4 sm:mx-0 lg:hidden">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sorted.map((img, i) => (
            <img
              key={img.id}
              src={img.url}
              alt={img.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="aspect-[4/5] w-full shrink-0 snap-center bg-mist object-cover"
            />
          ))}
        </div>
        {sorted.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t.product.imageOf(i + 1, sorted.length)}
                aria-current={i === active}
                className={cn('h-1.5 rounded-full transition-all', i === active ? 'w-5 bg-ink' : 'w-1.5 bg-ink/30')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[72px_1fr]">
        <div className="flex flex-col gap-3">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={t.product.imageOf(i + 1, sorted.length)}
              aria-current={i === active}
              className={cn(
                'aspect-[4/5] overflow-hidden bg-mist ring-offset-2 ring-offset-paper transition',
                i === active ? 'ring-1 ring-ink' : 'opacity-70 hover:opacity-100',
              )}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <div className="aspect-[4/5] overflow-hidden bg-mist">
          <img key={sorted[active]?.id} src={sorted[active]?.url} alt={sorted[active]?.alt} className="animate-fade-in h-full w-full object-cover" />
        </div>
      </div>
    </div>
  );
}
