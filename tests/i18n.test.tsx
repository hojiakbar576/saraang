import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import i18n, { msg, setLanguage, translateMsg } from '@/i18n';
import uz from '@/locales/uz/translation.json';
import ru from '@/locales/ru/translation.json';
import en from '@/locales/en/translation.json';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { missingTranslations, productDescription, productName, sizeLabel, taxonomyName, ONE_SIZE } from '@/i18n/content';
import { formatUZS } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/date';
import { validateCheckout } from '@/validation/checkout';
import { validateProductInput, DEFAULT_PRODUCT_INPUT, emptyTranslations } from '@/features/products/admin/productInput';
import { CATEGORIES, COLORS } from '@/data/mock/taxonomy';
import { MOCK_PRODUCTS } from '@/data/mock/products';

type Dict = { [k: string]: string | Dict | Dict[] | string[] };

const PLURAL = /_(zero|one|two|few|many|other)$/;

function flatten(o: Dict | Dict[] | string[], prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v as Dict, key));
  }
  return out;
}

const FLAT = { uz: flatten(uz as Dict), ru: flatten(ru as Dict), en: flatten(en as Dict) };
const baseKeys = (lang: keyof typeof FLAT) => new Set(Object.keys(FLAT[lang]).map((k) => k.replace(PLURAL, '')));
const vars = (s: string) => new Set([...s.matchAll(/\{\{\s*(\w+)/g)].map((m) => m[1]));

describe('translation files', () => {
  it('have the same keys in uz, ru and en', () => {
    const [u, r, e] = [baseKeys('uz'), baseKeys('ru'), baseKeys('en')];
    expect([...u].filter((k) => !r.has(k))).toEqual([]);
    expect([...u].filter((k) => !e.has(k))).toEqual([]);
    expect([...r].filter((k) => !u.has(k))).toEqual([]);
    expect([...e].filter((k) => !u.has(k))).toEqual([]);
  });

  it('contain no empty strings', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect(Object.entries(FLAT[lang]).filter(([, v]) => !v.trim()).map(([k]) => `${lang}:${k}`)).toEqual([]);
    }
  });

  it('use the same interpolation variables as Uzbek', () => {
    const problems: string[] = [];
    for (const lang of ['ru', 'en'] as const) {
      for (const [key, value] of Object.entries(FLAT[lang])) {
        const base = FLAT.uz[key.replace(PLURAL, '')] ?? FLAT.uz[key];
        if (base === undefined) continue;
        const expected = vars(base);
        for (const v of vars(value)) if (!expected.has(v)) problems.push(`${lang}:${key} uses {{${v}}}`);
        for (const v of expected) if (!vars(value).has(v)) problems.push(`${lang}:${key} misses {{${v}}}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('give Russian all plural forms and English one/other wherever a count is used', () => {
    const counted = Object.entries(FLAT.uz).filter(([, v]) => vars(v).has('count')).map(([k]) => k);
    expect(counted.length).toBeGreaterThan(5);
    for (const k of counted) {
      for (const f of ['one', 'few', 'many']) expect(FLAT.ru[`${k}_${f}`], `ru ${k}_${f}`).toBeTruthy();
      for (const f of ['one', 'other']) expect(FLAT.en[`${k}_${f}`], `en ${k}_${f}`).toBeTruthy();
    }
  });

  it('do not leave Uzbek text in the Russian and English files', () => {
    // Uzbek-specific letters (oʻ, gʻ, ʼ) only appear in the language's own name.
    const leaks = (lang: 'ru' | 'en') =>
      Object.entries(FLAT[lang]).filter(([k, v]) => /[ʻʼ]/.test(v) && k !== 'language.uz').map(([k]) => k);
    expect(leaks('ru')).toEqual([]);
    expect(leaks('en')).toEqual([]);
  });

  it('never translate the brand name', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) expect(FLAT[lang]['meta.description']).toMatch(/^SARANG/);
  });
});

describe('i18n runtime', () => {
  it('defaults to Uzbek and falls back to Uzbek for a missing key', async () => {
    expect(i18n.language).toBe('uz');
    i18n.addResource('uz', 'translation', 'test.onlyUz', 'Faqat oʻzbekcha');
    await setLanguage('ru');
    expect(i18n.t('test.onlyUz' as never)).toBe('Faqat oʻzbekcha');
  });

  it('uses correct plural forms', async () => {
    await setLanguage('ru');
    expect(i18n.t('collection.results', { count: 1 })).toBe('1 товар');
    expect(i18n.t('collection.results', { count: 3 })).toBe('3 товара');
    expect(i18n.t('collection.results', { count: 5 })).toBe('5 товаров');
    expect(i18n.t('collection.results', { count: 21 })).toBe('21 товар');
    await setLanguage('en');
    expect(i18n.t('collection.results', { count: 1 })).toBe('1 product');
    expect(i18n.t('collection.results', { count: 2 })).toBe('2 products');
    await setLanguage('uz');
    expect(i18n.t('collection.results', { count: 5 })).toBe('5 ta mahsulot');
  });

  it('remembers the language and updates <html lang> and the meta description', async () => {
    await setLanguage('en');
    expect(localStorage.getItem('store.lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(/clothing and accessories/);
    await setLanguage('ru');
    expect(document.documentElement.lang).toBe('ru');
    await setLanguage('uz');
    expect(document.documentElement.lang).toBe('uz-Latn');
  });
});

describe('formatting', () => {
  it('formats UZS per language', () => {
    expect(formatUZS(349000, true, 'uz')).toBe('349 000 soʻm');
    expect(formatUZS(349000, true, 'ru')).toBe('349 000 сум');
    expect(formatUZS(1349000, true, 'en')).toBe('1,349,000 UZS');
    expect(formatUZS(5000, false, 'en')).toBe('5,000');
  });

  it('formats dates per language', () => {
    const iso = new Date(2026, 10, 7, 9, 5).toISOString();
    expect(formatDate(iso, 'uz')).toBe('07.11.2026');
    expect(formatDate(iso, 'ru')).toBe('07.11.2026');
    expect(formatDate(iso, 'en')).toBe('7 Nov 2026');
    expect(formatDateTime(iso, 'en')).toBe('7 Nov 2026, 09:05');
  });
});

describe('translated content', () => {
  const product = { name: 'Paxta futbolka', description: 'Uz tavsif', translations: { ru: { name: 'Футболка', description: '' } } };

  it('shows the translation and falls back to Uzbek field by field', () => {
    expect(productName(product, 'ru')).toBe('Футболка');
    expect(productDescription(product, 'ru')).toBe('Uz tavsif');
    expect(productName(product, 'en')).toBe('Paxta futbolka');
    expect(productName({ ...product, translations: { en: { name: '   ', description: '' } } }, 'en')).toBe('Paxta futbolka');
    expect(productName(product, 'uz')).toBe('Paxta futbolka');
  });

  it('translates categories, colours and the one-size label', async () => {
    const tshirts = CATEGORIES.find((c) => c.id === 'tshirts')!;
    expect(taxonomyName(tshirts, 'ru')).toBe('Футболки');
    expect(taxonomyName(tshirts, 'en')).toBe('T-shirts');
    expect(taxonomyName({ name: 'Qora' }, 'en')).toBe('Qora');
    expect(COLORS.every((c) => c.translations?.ru && c.translations?.en)).toBe(true);
    await setLanguage('en');
    expect(sizeLabel(ONE_SIZE)).toBe('One size');
    expect(sizeLabel('XL')).toBe('XL');
  });

  it('lists incomplete languages', () => {
    expect(missingTranslations(product)).toEqual(['ru', 'en']);
    expect(missingTranslations({ description: '', translations: { ru: { name: 'Футболка', description: '' }, en: { name: 'Tee', description: '' } } })).toEqual([]);
  });

  it('has Russian and English text for every demo product', () => {
    for (const p of MOCK_PRODUCTS) {
      expect(missingTranslations(p), p.slug).toEqual([]);
    }
  });
});

describe('translated validation messages', () => {
  it('checkout errors follow the current language', async () => {
    const r = validateCheckout({ fullName: '', phone: '12', privacyConsent: false });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(translateMsg(r.errors.fullName)).toBe('Ismingizni kiriting.');
    await setLanguage('ru');
    expect(translateMsg(r.errors.fullName)).toBe('Введите ваше имя.');
    await setLanguage('en');
    expect(translateMsg(r.errors.phone)).toBe('Enter the full phone number: +998 XX XXX XX XX');
  });

  it('product errors, including translated fields and nested messages', async () => {
    const r = validateProductInput({
      ...DEFAULT_PRODUCT_INPUT,
      name: 'Futbolka',
      slug: 'futbolka',
      price: 500,
      colorIds: ['black'],
      status: 'inactive',
      translations: { ...emptyTranslations(), ru: { name: 'Ф', description: '' } },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    await setLanguage('ru');
    expect(translateMsg(r.errors['translations.ru.name'])).toBe('Название должно содержать не менее 2 символов.');
    expect(translateMsg(r.errors.price)).toBe('Цена должна быть не меньше 1 000 сум.');
    await setLanguage('en');
    expect(translateMsg(r.errors.price)).toBe('The price must be at least 1,000 UZS.');
    expect(translateMsg(msg('csv.fieldError', { field: 'price', message: msg('validation.priceInt') }))).toBe('price: The price must be a whole number.');
    expect(translateMsg('plain server text')).toBe('plain server text');
  });

  it('a product with only Uzbek text is valid (translations are optional)', () => {
    const r = validateProductInput({ ...DEFAULT_PRODUCT_INPUT, name: 'Futbolka', slug: 'futbolka', price: 150000, colorIds: ['black'], status: 'inactive' });
    expect(r.ok).toBe(true);
  });
});

function Probe() {
  const { t } = useTranslation();
  return <p data-testid="probe">{t('nav.cart')}</p>;
}

describe('<LanguageSwitcher />', () => {
  it('switches language in place, keeps component state, and is keyboard operable', async () => {
    const user = userEvent.setup();
    render(
      <>
        <LanguageSwitcher />
        <input aria-label="draft" defaultValue="kept" />
        <Probe />
      </>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('Savat');
    const group = screen.getByRole('group', { name: 'Tilni tanlang' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oʻzbekcha' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Русский' }));
    expect(screen.getByTestId('probe')).toHaveTextContent('Корзина');
    expect(screen.getByRole('button', { name: 'Русский' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('draft')).toHaveValue('kept');

    // Keyboard: Tab to English and press Enter.
    screen.getByRole('button', { name: 'Русский' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'English' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('probe')).toHaveTextContent('Cart');
    expect(localStorage.getItem('store.lang')).toBe('en');
  });

  it('starts in the saved language after a reload', async () => {
    await act(async () => {
      await setLanguage('ru');
    });
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('Корзина');
  });
});
