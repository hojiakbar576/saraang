import { useTranslation } from 'react-i18next';
import type { ContentLang, NameTranslations, Product, ProductTranslations } from '@/types/catalog';
import { CONTENT_LANGS } from '@/types/catalog';
import { currentLang, isLang, t, type Lang } from '@/i18n';

/**
 * Translated catalogue content (product, category and colour names).
 * Uzbek is the source text; Russian/English fall back to it when missing or empty.
 */

/** The stored size value for one-size items (kept in Uzbek in the data). */
export const ONE_SIZE = 'Bitta oʻlcham';

const clean = (v: string | null | undefined) => (v ?? '').trim();

export function productName(p: Pick<Product, 'name' | 'translations'>, lang: Lang = currentLang()): string {
  if (lang === 'uz') return p.name;
  return clean(p.translations?.[lang]?.name) || p.name;
}

export function productDescription(p: Pick<Product, 'description' | 'translations'>, lang: Lang = currentLang()): string {
  if (lang === 'uz') return p.description;
  return clean(p.translations?.[lang]?.description) || p.description;
}

export function taxonomyName(item: { name: string; translations?: NameTranslations }, lang: Lang = currentLang()): string {
  if (lang === 'uz') return item.name;
  return clean(item.translations?.[lang]) || item.name;
}

export function sizeLabel(size: string): string {
  return size === ONE_SIZE ? t('sizes.oneSize') : size;
}

/**
 * Languages whose translation is incomplete: no name, or no description while
 * the Uzbek description is filled in.
 */
export function missingTranslations(
  p: { description: string; translations?: ProductTranslations },
): ContentLang[] {
  const needsDescription = clean(p.description) !== '';
  return CONTENT_LANGS.filter((l) => {
    const tr = p.translations?.[l];
    return !clean(tr?.name) || (needsDescription && !clean(tr?.description));
  });
}

/** All names of a product in every language — used by search so any language matches. */
export function allProductNames(p: Pick<Product, 'name' | 'translations'>): string[] {
  return [p.name, ...CONTENT_LANGS.map((l) => clean(p.translations?.[l]?.name)).filter(Boolean)];
}

/**
 * Hook form: re-renders the component on language change and returns helpers
 * bound to the current language.
 */
export function useContent() {
  const { i18n } = useTranslation();
  const lang: Lang = isLang(i18n.resolvedLanguage) ? i18n.resolvedLanguage : currentLang();
  return {
    lang,
    productName: (p: Pick<Product, 'name' | 'translations'>) => productName(p, lang),
    productDescription: (p: Pick<Product, 'description' | 'translations'>) => productDescription(p, lang),
    taxonomyName: (item: { name: string; translations?: NameTranslations }) => taxonomyName(item, lang),
    sizeLabel,
  };
}
