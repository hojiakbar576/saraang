/**
 * Pure cart logic. The cart stores only references (product, size, colour,
 * quantity); prices and availability are always resolved from the current
 * catalog so a stale cart can never show an outdated price.
 */
export interface CartLine {
  productId: string;
  size: string;
  colorId: string;
  quantity: number;
}

export interface CartState {
  lines: CartLine[];
}

export const MAX_LINE_QUANTITY = 10;
export const EMPTY_CART: CartState = { lines: [] };

export const lineKey = (l: Pick<CartLine, 'productId' | 'size' | 'colorId'>) =>
  `${l.productId}::${l.size}::${l.colorId}`;

const clampQty = (q: number) => Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.trunc(q)));

export type CartAction =
  | { type: 'add'; line: CartLine }
  | { type: 'setQuantity'; key: string; quantity: number }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'replace'; state: CartState };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      if (!Number.isFinite(action.line.quantity) || action.line.quantity < 1) return state;
      const key = lineKey(action.line);
      const existing = state.lines.find((l) => lineKey(l) === key);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            lineKey(l) === key ? { ...l, quantity: clampQty(l.quantity + action.line.quantity) } : l,
          ),
        };
      }
      return { lines: [...state.lines, { ...action.line, quantity: clampQty(action.line.quantity) }] };
    }
    case 'setQuantity':
      if (!Number.isFinite(action.quantity)) return state;
      return {
        lines: state.lines.map((l) => (lineKey(l) === action.key ? { ...l, quantity: clampQty(action.quantity) } : l)),
      };
    case 'remove':
      return { lines: state.lines.filter((l) => lineKey(l) !== action.key) };
    case 'clear':
      return EMPTY_CART;
    case 'replace':
      return action.state;
  }
}

export function cartItemCount(state: CartState): number {
  return state.lines.reduce((n, l) => n + l.quantity, 0);
}

/** Validates data read from storage; anything malformed is dropped rather than trusted. */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return EMPTY_CART;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !Array.isArray((data as CartState).lines)) return EMPTY_CART;
    const lines = (data as { lines: unknown[] }).lines.filter(
      (l): l is CartLine =>
        !!l &&
        typeof l === 'object' &&
        typeof (l as CartLine).productId === 'string' &&
        typeof (l as CartLine).size === 'string' &&
        typeof (l as CartLine).colorId === 'string' &&
        Number.isInteger((l as CartLine).quantity) &&
        (l as CartLine).quantity >= 1,
    );
    return { lines: lines.map((l) => ({ ...l, quantity: clampQty(l.quantity) })) };
  } catch {
    return EMPTY_CART;
  }
}
