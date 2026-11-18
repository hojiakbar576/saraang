import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Check, Info, PackageX, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Container, EmptyState, Price, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ImageGallery } from '@/components/storefront/ImageGallery';
import { QuantityStepper, VariantPicker } from '@/components/storefront/VariantPicker';
import { ProductGrid } from '@/components/storefront/ProductCard';
import { useActiveProducts, useProductBySlug, useTaxonomy } from '@/hooks/useCatalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { hasAnyAvailableVariant, initialSelection, isVariantAvailable } from '@/features/products/variants';
import { useCart } from '@/features/cart/CartContext';
import { MAX_LINE_QUANTITY } from '@/features/cart/cart';
import type { Product } from '@/types/catalog';
import { productDescription, productName, taxonomyName } from '@/i18n/content';

function relatedTo(product: Product, all: Product[]): Product[] {
  const others = all.filter((p) => p.id !== product.id && (p.gender === product.gender || p.gender === 'unisex' || product.gender === 'unisex'));
  const sameCategory = others.filter((p) => p.categoryId === product.categoryId);
  const rest = others.filter((p) => p.categoryId !== product.categoryId);
  return [...sameCategory, ...rest].slice(0, 4);
}

function ProductSkeleton() {
  return (
    <Container className="grid gap-8 pt-6 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:pt-10">
      <Skeleton className="aspect-[4/5]" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-8 h-24 w-full" />
      </div>
    </Container>
  );
}

export function ProductPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { data: product, loading } = useProductBySlug(slug);
  const { data: all } = useActiveProducts();
  const { data: tax } = useTaxonomy();
  const { dispatch } = useCart();
  usePageTitle(product ? productName(product) : undefined);

  const [colorId, setColorId] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [attempted, setAttempted] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!product) return;
    const init = initialSelection(product);
    setColorId(init.colorId);
    setSize(init.size);
    setQuantity(1);
    setAttempted(false);
    setAdded(false);
  }, [product]);

  const related = useMemo(() => (product && all ? relatedTo(product, all) : undefined), [product, all]);

  if (loading) return <ProductSkeleton />;

  if (!product) {
    return (
      <Container className="pt-16">
        <EmptyState
          icon={<PackageX size={28} strokeWidth={1.25} />}
          title={t('product.notFoundTitle')}
          text={t('product.notFoundText')}
          action={<ButtonLink to="/">{t('common.backToShop')}</ButtonLink>}
        />
      </Container>
    );
  }

  const category = tax?.categoryById.get(product.categoryId);
  const soldOut = !hasAnyAvailableVariant(product);
  const canAdd = !!colorId && !!size && isVariantAvailable(product, size, colorId);
  const collectionPath = product.gender === 'women' ? '/women' : '/men';

  const changeColor = (id: string) => {
    setColorId(id);
    setAdded(false);
    if (size && !isVariantAvailable(product, size, id)) setSize(null);
  };

  const addToCart = () => {
    setAttempted(true);
    if (!canAdd || !colorId || !size) return;
    dispatch({ type: 'add', line: { productId: product.id, size, colorId, quantity } });
    setAdded(true);
  };

  return (
    <>
      <Container className="pt-4 lg:pt-8">
        <nav aria-label="Breadcrumb" className="mb-4 hidden text-xs text-muted sm:block lg:mb-6">
          <Link to="/" className="hover:text-ink">{t('nav.home')}</Link>
          <span className="mx-2">/</span>
          <Link to={collectionPath} className="hover:text-ink">{t(`gender.${product.gender === 'women' ? 'women' : 'men'}`)}</Link>
          {category && (
            <>
              <span className="mx-2">/</span>
              <Link to={`${collectionPath}?cat=${category.id}`} className="hover:text-ink">{taxonomyName(category)}</Link>
            </>
          )}
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <ImageGallery images={product.images} name={productName(product)} />

          <div className="lg:sticky lg:top-28 lg:self-start">
            {category && <p className="eyebrow mb-3">{taxonomyName(category)}</p>}
            <h1 className="display text-4xl leading-tight sm:text-5xl">{productName(product)}</h1>
            <Price amount={product.price} className="mt-3 block text-lg" />

            <div className="mt-8">
              {tax && (
                <VariantPicker
                  product={product}
                  colors={tax.colorById}
                  colorId={colorId}
                  size={size}
                  onColorChange={changeColor}
                  onSizeChange={(s) => {
                    setSize(s);
                    setAdded(false);
                  }}
                  showSizeError={attempted}
                />
              )}
            </div>

            {soldOut ? (
              <p className="mt-8 border border-line bg-mist px-4 py-3 text-sm text-muted">{t('product.soldOut')}</p>
            ) : (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_LINE_QUANTITY} />
                <Button size="lg" className="w-full sm:w-auto sm:flex-1" onClick={addToCart}>
                  {t('product.addToCart')}
                </Button>
              </div>
            )}

            {added && (
              <div role="status" className="animate-fade-in mt-3 flex items-center justify-between gap-3 border border-success/30 bg-success/5 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-success">
                  <Check size={16} /> {t('product.added')}
                </span>
                <Link to="/cart" className="text-ink underline underline-offset-4">{t('product.viewCart')}</Link>
              </div>
            )}

            <div className="mt-8 space-y-4 border-t border-line pt-6 text-sm">
              <div className="flex gap-3">
                <Truck size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                <div>
                  <p className="font-medium">{t('product.delivery')}</p>
                  <p className="text-muted">{t('product.deliveryEstimate', { min: product.deliveryEstimate.minDays, max: product.deliveryEstimate.maxDays })}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Info size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                <p className="leading-relaxed text-muted">{t('preorder.productNote')}</p>
              </div>
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <h2 className="mb-3 text-sm font-medium">{t('product.description')}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft">{productDescription(product)}</p>
            </div>
          </div>
        </div>
      </Container>

      {related && related.length > 0 && (
        <Container className="pt-20 sm:pt-28">
          <SectionHeading title={t('product.related')} />
          <ProductGrid products={related} skeletonCount={4} />
        </Container>
      )}
    </>
  );
}
