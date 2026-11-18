import 'i18next';
import type uz from '@/locales/uz/translation.json';

// Typed keys: t('nav.home') is checked against the Uzbek (reference) dictionary.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof uz };
    returnNull: false;
  }
}
