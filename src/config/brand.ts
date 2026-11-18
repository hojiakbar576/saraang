/**
 * Single source of truth for brand identity and public contact details.
 * The brand name is never translated. Tagline, city and working hours are
 * translated: see brand.* in src/locales/<lang>/translation.json.
 */
export const brand = {
  name: 'SARANG',
  shortName: 'S',
  phone: '+998 90 000 00 00',
  phoneHref: 'tel:+998900000000',
  email: 'hello@sarang.uz',
  social: {
    instagram: 'https://instagram.com/',
    telegram: 'https://t.me/',
  },
  /** Placeholder values above are clearly fake and must be replaced before launch. */
  contactsArePlaceholders: true,
} as const;

export type Brand = typeof brand;
