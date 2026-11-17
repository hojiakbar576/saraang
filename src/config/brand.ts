/**
 * Single source of truth for brand identity and public contact details.
 * The brand name is temporary — change it here and it updates everywhere.
 */
export const brand = {
  name: 'YOUR BRAND',
  shortName: 'YB',
  tagline: 'Zamonaviy kiyim. Toshkentga yetkazib berish.',
  city: 'Toshkent',
  phone: '+998 90 000 00 00',
  phoneHref: 'tel:+998900000000',
  email: 'hello@yourbrand.uz',
  workingHours: 'Har kuni, 10:00 – 20:00',
  social: {
    instagram: 'https://instagram.com/',
    telegram: 'https://t.me/',
  },
  /** Placeholder values above are clearly fake and must be replaced before launch. */
  contactsArePlaceholders: true,
} as const;

export type Brand = typeof brand;
