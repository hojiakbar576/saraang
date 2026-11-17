/** Window events fired after data changes so open admin screens refresh. */
export const PRODUCTS_CHANGED_EVENT = 'store:products-changed';
export const ORDERS_CHANGED_EVENT = 'store:orders-changed';

export function emit(event: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(event));
}
