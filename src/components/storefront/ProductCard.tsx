import { Link } from 'react-router';
import type { Product } from '@/types/catalog';
import { Badge, Price, Skeleton } from '@/components/ui/primitives';
import { hasAnyAvailableVariant } from '@/features/products/variants';
import { useTaxonomy } from '@/hooks/useCatalog';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { productName, taxonomyName } from '@/i18n/content';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { t } = useTranslation();
  const { data: tax } = useTaxonomy();
  const [primary, secondary] = [...product.images].sort((a, b) => a.position - b.position);
  const soldOut = !hasAnyAvailableVariant(product);

  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-mist">
        {primary && (
          <img
            src={primary.url}
            alt={productName(product)}
            loading={priority ? 'eager' : 'lazy'}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.03]',
              secondary && 'group-hover:opacity-0',
            )}
          />
        )}
        {secondary && (
          <img
            src={secondary.url}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-[var(--ease-soft)] group-hover:opacity-100"
          />
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {product.newArrival && <Badge>{t('product.newBadge')}</Badge>}
          {soldOut && <Badge className="text-muted">{t('product.soldOut')}</Badge>}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1 sm:mt-4">
        <h3 className="text-[13px] leading-snug font-medium sm:text-sm">{productName(product)}</h3>
        <Price amount={product.price} className="text-[13px] text-ink-soft sm:text-sm" />
        {tax && (
          <div className="mt-1 flex gap-1.5" aria-label={t('product.color')}>
            {product.colorIds.map((id) => {
              const c = tax.colorById.get(id);
              return c ? (
                <span
                  key={id}
                  title={taxonomyName(c)}
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: c.hex }}
                />
              ) : null;
            })}
          </div>
        )}
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/5]" />
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  );
}

export function ProductGrid({
  products,
  loading,
  skeletonCount = 8,
  className,
}: {
  products: Product[] | undefined;
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-y-12', className)}>
      {loading || !products
        ? Array.from({ length: skeletonCount }, (_, i) => <ProductCardSkeleton key={i} />)
        : products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
    </div>
  );
}
