import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { cartItemCount, cartReducer, parseStoredCart, type CartAction, type CartState } from './cart';

const STORAGE_KEY = 'store.cart.v1';

interface CartContextValue {
  state: CartState;
  itemCount: number;
  dispatch: (action: CartAction) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartState {
  try {
    return parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return { lines: [] };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, readStorage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable (private mode) — cart still works for this visit */
    }
  }, [state]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) dispatch({ type: 'replace', state: parseStoredCart(e.newValue) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ state, dispatch, itemCount: cartItemCount(state) }), [state]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
