import i18n, { type TFunction } from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from '@/locales/uz/translation.json';
import ru from '@/locales/ru/translation.json';
import en from '@/locales/en/translation.json';

/**
 * Internationalisation. Uzbek (Latin) is the default and the fallback: a key
 * missing in ru/en shows the Uzbek text, never the raw key.
 */
export const LANGUAGES = ['uz', 'ru', 'en'] as const;
export type Lang = (typeof LANGUAGES)[number];
export const DEFAULT_LANG: Lang = 'uz';

/** BCP 47 tags for <html lang> and Intl. */
export const HTML_LANG: Record<Lang, string> = { uz: 'uz-Latn', ru: 'ru', en: 'en' };

const STORAGE_KEY = 'store.lang';

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v);

function storedLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

void i18n.use(initReactI18next).init({
  resources: { uz: { translation: uz }, ru: { translation: ru }, en: { translation: en } },
  lng: storedLang(),
  fallbackLng: DEFAULT_LANG,
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false }, // React escapes output already
  returnNull: false,
  returnEmptyString: false,
  initAsync: false,
  react: { useSuspense: false },
});

function applyDocumentLanguage(lang: Lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = HTML_LANG[lang];
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.content = i18n.t('meta.description');
}

i18n.on('languageChanged', (lng) => {
  const lang = isLang(lng) ? lng : DEFAULT_LANG;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private mode / storage disabled: the choice simply isn't remembered.
  }
  applyDocumentLanguage(lang);
});
applyDocumentLanguage(currentLang());

/** The active language, always one of LANGUAGES. */
export function currentLang(): Lang {
  const l = i18n.resolvedLanguage ?? i18n.language;
  return isLang(l) ? l : DEFAULT_LANG;
}

export function setLanguage(lang: Lang) {
  return i18n.changeLanguage(lang);
}

/** Translate outside React components (helpers, services). Reads the current language at call time. */
export const t = i18n.t.bind(i18n);

// ——— Message codes ———
// Validation and service errors are stored as codes ("@@key" or "@@key|{json params}")
// and translated when shown, so they follow the current language.

export type Params = Record<string, string | number>;
const MARK = '@@';

export function msg(key: string, params?: Params): string {
  return params ? `${MARK}${key}|${JSON.stringify(params)}` : `${MARK}${key}`;
}

/** Translates a message code; plain text (e.g. an unexpected server message) is returned unchanged. */
type LooseT = (key: string, opts?: Params) => string;

export function translateMsg(value: string | null | undefined, translateFn: TFunction | LooseT = t): string {
  const translate = translateFn as unknown as LooseT;
  if (!value) return '';
  if (!value.startsWith(MARK)) return value;
  const body = value.slice(MARK.length);
  const bar = body.indexOf('|');
  const key = bar === -1 ? body : body.slice(0, bar);
  let params: Params | undefined;
  if (bar !== -1) {
    try {
      params = JSON.parse(body.slice(bar + 1)) as Params;
    } catch {
      params = undefined;
    }
  }
  if (params) {
    params = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, typeof v === 'string' && v.startsWith(MARK) ? translateMsg(v, translate) : v]),
    );
  }
  return translate(key, params);
}

export default i18n;
