import { Link } from 'react-router';
import { AlertCircle, ShoppingBag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Container, EmptyState, Price, Skeleton } from '@/components/ui/primitives';
import { Button, ButtonLink } from '@/components/ui/Button';
import { QuantityStepper } from '@/components/storefront/VariantPicker';
import { MAX_LINE_QUANTITY } from '@/features/cart/cart';
import { useResolvedCart } from '@/features/cart/useResolvedCart';
import { usePageTitle } from '@/hooks/usePageTitle';
import { productName, sizeLabel, taxonomyName } from '@/i18n/content';

export function CartPage() {
  const { t } = useTranslation();
  usePageTitle(t('cart.title'));
  const { state, dispatch, lines, loading, subtotal, unavailableKeys } = useResolvedCart();
  const hasUnavailable = unavailableKeys.length > 0;

  return (
    <Container className="pt-10 sm:pt-14">
      <h1 className="display mb-8 text-5xl sm:text-6xl">{t('cart.title')}</h1>

      {state.lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={28} strokeWidth={1.25} />}
          title={t('cart.empty')}
          text={t('cart.emptyText')}
          action={<ButtonLink to="/new">{t('nav.newArrivals')}</ButtonLink>}
        />
      ) : loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
          <div>
            {hasUnavailable && (
              <div role="alert" className="mb-4 flex flex-col gap-3 border border-danger/30 bg-danger/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-start gap-2 text-danger">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {t('checkout.unavailableBlock')}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => unavailableKeys.forEach((key) => dispatch({ type: 'remove', key }))}
                >
                  {t('cart.removeUnavailable')}
                </Button>
              </div>
            )}
            <ul className="border-t border-line">
              {lines.map(({ line, key, product, color, available, lineTotal }) => {
                const image = product && [...product.images].sort((a, b) => a.position - b.position)[0];
                return (
                  <li key={key} className="flex gap-4 border-b border-line py-5">
                    <div className="w-24 shrink-0 sm:w-28">
                      {image ? (
                        <img src={image.url} alt={product ? productName(product) : ''} className={`aspect-[4/5] w-full bg-mist object-cover ${available ? '' : 'opacity-50'}`} />
                      ) : (
                        <div className="aspect-[4/5] bg-mist" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {product ? (
                            <Link to={`/product/${product.slug}`} className="text-sm font-medium hover:underline">
                              {productName(product)}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium text-muted">{t('product.notFoundTitle')}</p>
                          )}
                          <p className="mt-1 text-xs text-muted">
                            {t('product.size')}: {sizeLabel(line.size)} · {t('product.color')}: {color ? taxonomyName(color) : line.colorId}
                          </p>
                          {product && <Price amount={product.price} className="mt-1 block text-xs text-muted" />}
                        </div>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'remove', key })}
                          aria-label={`${t('cart.remove')}: ${product ? productName(product) : ''}`}
                          className="-mt-1 -mr-1 p-1 text-muted hover:text-ink"
                        >
                          <X size={18} strokeWidth={1.5} />
                        </button>
                      </div>
                      {available ? (
                        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                          <QuantityStepper
                            value={line.quantity}
                            max={MAX_LINE_QUANTITY}
                            onChange={(q) => dispatch({ type: 'setQuantity', key, quantity: q })}
                          />
                          <Price amount={lineTotal} className="text-sm font-medium" />
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-danger">{t('cart.unavailableLine')}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link to="/new" className="mt-6 inline-block text-sm text-muted underline underline-offset-4 hover:text-ink">
              {t('cart.continueShopping')}
            </Link>
          </div>

          <aside className="h-fit bg-mist p-6 lg:sticky lg:top-28">
            <div className="flex justify-between text-sm">
              <span>{t('cart.subtotal')}</span>
              <Price amount={subtotal} />
            </div>
            <p className="mt-2 text-xs text-muted">{t('preorder.deliveryCostNote')}</p>
            <div className="mt-4 flex justify-between border-t border-line pt-4 text-base font-medium">
              <span>{t('cart.total')}</span>
              <Price amount={subtotal} />
            </div>
            {hasUnavailable ? (
              <Button size="lg" className="mt-6 w-full" disabled>
                {t('cart.checkout')}
              </Button>
            ) : (
              <ButtonLink to="/checkout" size="lg" className="mt-6 w-full">
                {t('cart.checkout')}
              </ButtonLink>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted">{t('preorder.productNote')}</p>
          </aside>
        </div>
      )}
    </Container>
  );
}
