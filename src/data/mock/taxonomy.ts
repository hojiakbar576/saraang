import type { Category, Color } from '@/types/catalog';
import { ONE_SIZE } from '@/i18n/content';

/** Store-wide taxonomy. With Supabase these come from the database (same ids and names). */
export const CATEGORIES: Category[] = [
  { id: 'tshirts', name: 'Futbolkalar', genders: ['men', 'women', 'unisex'], translations: { ru: 'Футболки', en: 'T-shirts' } },
  { id: 'shirts', name: 'Koʻylaklar', genders: ['men', 'unisex'], translations: { ru: 'Рубашки', en: 'Shirts' } },
  { id: 'knitwear', name: 'Trikotaj', genders: ['men', 'women', 'unisex'], translations: { ru: 'Трикотаж', en: 'Knitwear' } },
  { id: 'outerwear', name: 'Ustki kiyim', genders: ['men', 'women', 'unisex'], translations: { ru: 'Верхняя одежда', en: 'Outerwear' } },
  { id: 'trousers', name: 'Shimlar', genders: ['men', 'women', 'unisex'], translations: { ru: 'Брюки', en: 'Trousers' } },
  { id: 'dresses', name: 'Ayollar koʻylaklari', genders: ['women'], translations: { ru: 'Платья', en: 'Dresses' } },
  { id: 'skirts', name: 'Yubkalar', genders: ['women'], translations: { ru: 'Юбки', en: 'Skirts' } },
  { id: 'accessories', name: 'Aksessuarlar', genders: ['men', 'women', 'unisex'], translations: { ru: 'Аксессуары', en: 'Accessories' } },
];

export const COLORS: Color[] = [
  { id: 'black', name: 'Qora', hex: '#1f1e1c', translations: { ru: 'Чёрный', en: 'Black' } },
  { id: 'white', name: 'Oq', hex: '#f7f6f2', translations: { ru: 'Белый', en: 'White' } },
  { id: 'cream', name: 'Krem', hex: '#ebe2d0', translations: { ru: 'Кремовый', en: 'Cream' } },
  { id: 'beige', name: 'Bej', hex: '#cdb994', translations: { ru: 'Бежевый', en: 'Beige' } },
  { id: 'grey', name: 'Kulrang', hex: '#9b9994', translations: { ru: 'Серый', en: 'Grey' } },
  { id: 'charcoal', name: 'Toʻq kulrang', hex: '#46454a', translations: { ru: 'Тёмно-серый', en: 'Charcoal' } },
  { id: 'navy', name: 'Toʻq koʻk', hex: '#29324a', translations: { ru: 'Тёмно-синий', en: 'Navy' } },
  { id: 'sky', name: 'Havorang', hex: '#b8c7d6', translations: { ru: 'Голубой', en: 'Sky blue' } },
  { id: 'olive', name: 'Zaytun', hex: '#69694a', translations: { ru: 'Оливковый', en: 'Olive' } },
  { id: 'brown', name: 'Jigarrang', hex: '#74533c', translations: { ru: 'Коричневый', en: 'Brown' } },
];

export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', ONE_SIZE] as const;
