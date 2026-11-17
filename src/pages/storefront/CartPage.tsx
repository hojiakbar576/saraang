import { Link } from 'react-router';
import { ShoppingBag, X } from 'lucide-react';
import { t } from '@/i18n';
import { Container, EmptyState, Price, Skeleton } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/Button';
import { QuantityStepper } from '@/components/storefront/VariantPicker';
import { useCart } from '@/features/cart/CartContext';
import { lineKey, MAX_LINE_QUANTITY } from '@/features/cart/cart';
import { isVariantAvailable } from '@/features/products/variants';
import { useActiveProducts, useTaxonomy } from '@/hooks/useCatalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import { multiply, sum } from '@/lib/money';

/**
 * Milestone 1 cart: lists lines, edits quantities, removes items, shows subtotal.
 * Checkout is added in Milestone 2.
 */
export function CartPage() {
  usePageTitle(t.cart.title);
  const { state, dispatch } = useCart();
  const { data: products, loading } = useActiveProducts();
  const { data: tax } = useTaxonomy();

  const lines = state.lines.map((line) => {
    const product = products?.find((p) => p.id === line.productId);
    const available = !!product && isVariantAvailable(product, line.size, line.colorId);
    return { line, key: lineKey(line), product, available };
  });
  const subtotal = sum(lines.filter((l) => l.available && l.product).map((l) => multiply(l.product!.price, l.line.quantity)));

  return (
    <Container className="pt-10 sm:pt-14">
      <h1 className="display mb-8 text-5xl sm:text-6xl">{t.cart.title}</h1>

      {state.lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={28} strokeWidth={1.25} />}
          title={t.cart.empty}
          text={t.cart.emptyText}
          action={<ButtonLink to="/new">{t.nav.newArrivals}</ButtonLink>}
        />
      ) : loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
          <ul className="border-t border-line">
            {lines.map(({ line, key, product, available }) => {
              const image = product?.images.find((i) => i.position === 0) ?? product?.images[0];
              const color = tax?.colorById.get(line.colorId);
              return (
                <li key={key} className="flex gap-4 border-b border-line py-5">
                  <div className="w-24 shrink-0 sm:w-28">
                    {image ? (
                      <img src={image.url} alt={image.alt} className="aspect-[4/5] w-full bg-mist object-cover" />
                    ) : (
                      <div className="aspect-[4/5] bg-mist" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {product ? (
                          <Link to={`/product/${product.slug}`} className="text-sm font-medium hover:underline">{product.name}</Link>
                        ) : (
                          <p className="text-sm font-medium text-muted">—</p>
                        )}
                        <p className="mt-1 text-xs text-muted">
                          {t.product.size}: {line.size} · {t.product.color}: {color?.name ?? line.colorId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'remove', key })}
                        aria-label={t.cart.remove}
                        className="-mt-1 -mr-1 p-1 text-muted hover:text-ink"
                      >
                        <X size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                    {available && product ? (
                      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                        <QuantityStepper
                          value={line.quantity}
                          max={MAX_LINE_QUANTITY}
                          onChange={(q) => dispatch({ type: 'setQuantity', key, quantity: q })}
                        />
                        <Price amount={multiply(product.price, line.quantity)} className="text-sm" />
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-danger">{t.cart.unavailableLine}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit bg-mist p-6">
            <div className="flex justify-between text-sm">
              <span>{t.cart.subtotal}</span>
              <Price amount={subtotal} />
            </div>
            <p className="mt-2 text-xs text-muted">{t.preorder.deliveryCostNote}</p>
            <div className="mt-4 flex justify-between border-t border-line pt-4 font-medium">
              <span>{t.cart.total}</span>
              <Price amount={subtotal} />
            </div>
            <p className="mt-6 border border-dashed border-stone px-3 py-2 text-xs text-muted">{t.cart.checkoutSoon}</p>
          </aside>
        </div>
      )}
    </Container>
  );
}
