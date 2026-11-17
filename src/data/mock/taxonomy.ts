import type { Category, Color } from '@/types/catalog';

/** Store-wide taxonomy. In Phase 2 these come from the database. */
export const CATEGORIES: Category[] = [
  { id: 'tshirts', name: 'Futbolkalar', genders: ['men', 'women', 'unisex'] },
  { id: 'shirts', name: 'Koʻylaklar', genders: ['men', 'unisex'] },
  { id: 'knitwear', name: 'Trikotaj', genders: ['men', 'women', 'unisex'] },
  { id: 'outerwear', name: 'Ustki kiyim', genders: ['men', 'women', 'unisex'] },
  { id: 'trousers', name: 'Shimlar', genders: ['men', 'women', 'unisex'] },
  { id: 'dresses', name: 'Ayollar koʻylaklari', genders: ['women'] },
  { id: 'skirts', name: 'Yubkalar', genders: ['women'] },
  { id: 'accessories', name: 'Aksessuarlar', genders: ['men', 'women', 'unisex'] },
];

export const COLORS: Color[] = [
  { id: 'black', name: 'Qora', hex: '#1f1e1c' },
  { id: 'white', name: 'Oq', hex: '#f7f6f2' },
  { id: 'cream', name: 'Krem', hex: '#ebe2d0' },
  { id: 'beige', name: 'Bej', hex: '#cdb994' },
  { id: 'grey', name: 'Kulrang', hex: '#9b9994' },
  { id: 'charcoal', name: 'Toʻq kulrang', hex: '#46454a' },
  { id: 'navy', name: 'Toʻq koʻk', hex: '#29324a' },
  { id: 'sky', name: 'Havorang', hex: '#b8c7d6' },
  { id: 'olive', name: 'Zaytun', hex: '#69694a' },
  { id: 'brown', name: 'Jigarrang', hex: '#74533c' },
];

export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Bitta oʻlcham'] as const;
