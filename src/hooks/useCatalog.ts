import { useEffect, useState } from 'react';
import { catalog } from '@/services/catalog';
import type { Category, Color, Product } from '@/types/catalog';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    load().then(
      (data) => !cancelled && setState({ data, loading: false, error: null }),
      (error: unknown) =>
        !cancelled && setState({ data: undefined, loading: false, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      cancelled = true;
    };
  }, deps);
  return state;
}

export function useActiveProducts() {
  return useAsync<Product[]>(() => catalog.listActiveProducts(), []);
}

export function useProductBySlug(slug: string | undefined) {
  return useAsync<Product | null>(() => (slug ? catalog.getActiveProductBySlug(slug) : Promise.resolve(null)), [slug]);
}

export interface Taxonomy {
  categories: Category[];
  colors: Color[];
  categoryById: Map<string, Category>;
  colorById: Map<string, Color>;
}

export function useTaxonomy() {
  return useAsync<Taxonomy>(async () => {
    const [categories, colors] = await Promise.all([catalog.listCategories(), catalog.listColors()]);
    return {
      categories,
      colors,
      categoryById: new Map(categories.map((c) => [c.id, c])),
      colorById: new Map(colors.map((c) => [c.id, c])),
    };
  }, []);
}
