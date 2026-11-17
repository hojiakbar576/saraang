import { useMemo } from 'react';
import type { Color, Product } from '@/types/catalog';
import { useActiveProducts, useTaxonomy } from '@/hooks/useCatalog';
import { isVariantAvailable } from '@/features/products/variants';
import { multiply, sum } from '@/lib/money';
import { useCart } from './CartContext';
import { lineKey, type CartLine } from './cart';

export interface ResolvedLine {
  key: string;
  line: CartLine;
  product: Product | undefined;
  color: Color | undefined;
  available: boolean;
  lineTotal: number;
}

/** Joins cart references with the current catalog: live prices and availability. */
export function useResolvedCart() {
  const cart = useCart();
  const { data: products, loading: pLoading } = useActiveProducts();
  const { data: tax, loading: tLoading } = useTaxonomy();

  return useMemo(() => {
    const lines: ResolvedLine[] = cart.state.lines.map((line) => {
      const product = products?.find((p) => p.id === line.productId);
      const available = !!product && isVariantAvailable(product, line.size, line.colorId);
      return {
        key: lineKey(line),
        line,
        product,
        color: tax?.colorById.get(line.colorId),
        available,
        lineTotal: available && product ? multiply(product.price, line.quantity) : 0,
      };
    });
    const availableLines = lines.filter((l) => l.available);
    return {
      ...cart,
      loading: pLoading || tLoading,
      lines,
      unavailableKeys: lines.filter((l) => !l.available).map((l) => l.key),
      subtotal: sum(availableLines.map((l) => l.lineTotal)),
      availableItemCount: availableLines.reduce((n, l) => n + l.line.quantity, 0),
    };
  }, [cart, products, tax, pLoading, tLoading]);
}
