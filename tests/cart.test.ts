import { describe, expect, it } from 'vitest';
import { cartItemCount, cartReducer, EMPTY_CART, lineKey, MAX_LINE_QUANTITY, parseStoredCart } from '@/features/cart/cart';

const line = (size = 'M', colorId = 'black', quantity = 1) => ({ productId: 'p_001', size, colorId, quantity });

describe('cart reducer', () => {
  it('merges the same variant and keeps different variants as separate lines', () => {
    let s = cartReducer(EMPTY_CART, { type: 'add', line: line('M', 'black', 1) });
    s = cartReducer(s, { type: 'add', line: line('M', 'black', 2) });
    s = cartReducer(s, { type: 'add', line: line('L', 'black', 1) });
    s = cartReducer(s, { type: 'add', line: line('M', 'white', 1) });
    expect(s.lines).toHaveLength(3);
    expect(s.lines[0].quantity).toBe(3);
    expect(cartItemCount(s)).toBe(5);
  });

  it('clamps quantities between 1 and the maximum', () => {
    let s = cartReducer(EMPTY_CART, { type: 'add', line: line() });
    const key = lineKey(line());
    s = cartReducer(s, { type: 'setQuantity', key, quantity: 99 });
    expect(s.lines[0].quantity).toBe(MAX_LINE_QUANTITY);
    s = cartReducer(s, { type: 'setQuantity', key, quantity: 0 });
    expect(s.lines[0].quantity).toBe(1);
  });

  it('ignores invalid add quantities and removes lines', () => {
    let s = cartReducer(EMPTY_CART, { type: 'add', line: line('M', 'black', 0) });
    expect(s.lines).toHaveLength(0);
    s = cartReducer(s, { type: 'add', line: line() });
    s = cartReducer(s, { type: 'remove', key: lineKey(line()) });
    expect(s).toEqual(EMPTY_CART);
  });
});

describe('stored cart parsing', () => {
  it('drops malformed data instead of trusting it', () => {
    expect(parseStoredCart('not json')).toEqual(EMPTY_CART);
    expect(parseStoredCart(null)).toEqual(EMPTY_CART);
    const raw = JSON.stringify({ lines: [line(), { productId: 1 }, { ...line('L'), quantity: -3 }] });
    expect(parseStoredCart(raw).lines).toEqual([line()]);
  });
});
