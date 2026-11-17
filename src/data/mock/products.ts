/**
 * DEMO DATA — fictional products for reviewing the storefront in Phase 1.
 * Names, prices and descriptions are placeholders, not real inventory.
 */
import type { CategoryId, Gender, Product, ProductImage, ProductVariant } from '@/types/catalog';
import { COLORS } from './taxonomy';
import { demoGarmentImage, type GarmentShape } from './demoImages';

const LETTER_SIZES = ['S', 'M', 'L', 'XL'];
const ONE_SIZE = ['Bitta oʻlcham'];

interface Seed {
  slug: string;
  name: string;
  description: string;
  price: number;
  categoryId: CategoryId;
  gender: Gender;
  shape: GarmentShape;
  sizes?: string[];
  colorIds: string[];
  /** "size:colorId" combinations that are not available. */
  unavailable?: string[];
  featured?: boolean;
  newArrival?: boolean;
  createdAt: string;
  delivery?: [number, number];
}

function hexOf(colorId: string): string {
  const c = COLORS.find((x) => x.id === colorId);
  if (!c) throw new Error(`Unknown color ${colorId}`);
  return c.hex;
}

function build(seed: Seed, index: number): Product {
  const id = `p_${String(index + 1).padStart(3, '0')}`;
  const sizes = seed.sizes ?? LETTER_SIZES;
  const unavailable = new Set(seed.unavailable ?? []);
  const variants: ProductVariant[] = seed.colorIds.flatMap((colorId) =>
    sizes.map((size) => ({
      id: `${id}_${colorId}_${size}`,
      size,
      colorId,
      available: !unavailable.has(`${size}:${colorId}`) && !unavailable.has(`*:${colorId}`),
    })),
  );
  const [first, second] = seed.colorIds;
  const images: ProductImage[] = [
    { id: `${id}_img1`, url: demoGarmentImage(seed.shape, hexOf(first), 'front'), alt: seed.name, position: 0 },
    { id: `${id}_img2`, url: demoGarmentImage(seed.shape, hexOf(first), 'detail'), alt: `${seed.name} — yaqindan`, position: 1 },
    {
      id: `${id}_img3`,
      url: demoGarmentImage(seed.shape, hexOf(second ?? first), 'alt'),
      alt: `${seed.name} — boshqa rang`,
      position: 2,
    },
  ];
  const [minDays, maxDays] = seed.delivery ?? [14, 21];
  return {
    id,
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    price: seed.price,
    categoryId: seed.categoryId,
    gender: seed.gender,
    sizes,
    colorIds: seed.colorIds,
    variants,
    images,
    deliveryEstimate: { minDays, maxDays },
    featured: seed.featured ?? false,
    newArrival: seed.newArrival ?? false,
    status: 'active',
    createdAt: seed.createdAt,
    updatedAt: seed.createdAt,
  };
}

const SEEDS: Seed[] = [
  // ——— Men ———
  {
    slug: 'oversize-paxta-futbolka',
    name: 'Oversize paxta futbolka',
    description:
      'Zich paxta matosidan tikilgan keng bichimli futbolka. Yelka chizigʻi tushirilgan, yoqasi mustahkam qovurgʻali. Har kuni kiyish uchun qulay asos.',
    price: 189_000,
    categoryId: 'tshirts',
    gender: 'men',
    shape: 'tshirt',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colorIds: ['white', 'black', 'grey'],
    unavailable: ['XXL:grey', 'S:black'],
    featured: true,
    newArrival: true,
    createdAt: '2026-11-12T09:00:00.000Z',
  },
  {
    slug: 'zigir-koylak',
    name: 'Zigʻir koʻylak',
    description:
      'Yengil zigʻir aralash matodan tikilgan erkin bichimli koʻylak. Issiq kunlar uchun nafas oladigan mato, tabiiy tuzilish.',
    price: 349_000,
    categoryId: 'shirts',
    gender: 'men',
    shape: 'shirt',
    colorIds: ['cream', 'sky', 'white'],
    unavailable: ['XL:sky'],
    newArrival: true,
    createdAt: '2026-11-10T09:00:00.000Z',
  },
  {
    slug: 'oksford-koylak',
    name: 'Oksford koʻylak',
    description:
      'Klassik oksford matosidan tikilgan koʻylak, tugmali yoqa bilan. Ofis uchun ham, dam olish kunlari uchun ham mos.',
    price: 329_000,
    categoryId: 'shirts',
    gender: 'men',
    shape: 'shirt',
    colorIds: ['white', 'sky'],
    createdAt: '2026-10-21T09:00:00.000Z',
  },
  {
    slug: 'merino-sviter',
    name: 'Merino sviter',
    description:
      'Yupqa merino aralash junidan toʻqilgan dumaloq yoqali sviter. Koʻylak ustidan yoki yolgʻiz kiyish uchun.',
    price: 459_000,
    categoryId: 'knitwear',
    gender: 'men',
    shape: 'knit',
    colorIds: ['charcoal', 'cream', 'navy'],
    unavailable: ['*:navy'],
    featured: true,
    createdAt: '2026-10-28T09:00:00.000Z',
    delivery: [18, 25],
  },
  {
    slug: 'klassik-palto',
    name: 'Klassik palto',
    description:
      'Jun aralash matodan tikilgan toʻgʻri bichimli palto. Ichki astar, ikki yon choʻntak. Kuz va qish uchun.',
    price: 1_290_000,
    categoryId: 'outerwear',
    gender: 'men',
    shape: 'coat',
    sizes: ['M', 'L', 'XL'],
    colorIds: ['beige', 'charcoal'],
    unavailable: ['XL:beige'],
    featured: true,
    createdAt: '2026-10-15T09:00:00.000Z',
    delivery: [18, 25],
  },
  {
    slug: 'chino-shim',
    name: 'Chino shim',
    description: 'Biroz choʻziluvchan paxta matosidan tikilgan chino shim. Toraygan bichim, toʻrt choʻntak.',
    price: 389_000,
    categoryId: 'trousers',
    gender: 'men',
    shape: 'trousers',
    colorIds: ['beige', 'olive', 'navy'],
    createdAt: '2026-10-08T09:00:00.000Z',
  },
  {
    slug: 'keng-bichimli-shim',
    name: 'Keng bichimli shim',
    description: 'Erkin, toʻgʻri tushadigan shim. Old tomonida burma, yengil va yumshoq mato.',
    price: 419_000,
    categoryId: 'trousers',
    gender: 'men',
    shape: 'trousers',
    colorIds: ['black', 'grey'],
    newArrival: true,
    createdAt: '2026-11-14T09:00:00.000Z',
  },
  {
    slug: 'kanvas-sumka',
    name: 'Kanvas sumka',
    description: 'Zich kanvas matosidan tikilgan katta hajmli sumka. Ichki choʻntak, mustahkam tutqichlar.',
    price: 249_000,
    categoryId: 'accessories',
    gender: 'unisex',
    shape: 'bag',
    sizes: ONE_SIZE,
    colorIds: ['cream', 'black'],
    createdAt: '2026-10-02T09:00:00.000Z',
  },
  // ——— Women ———
  {
    slug: 'midi-koylak',
    name: 'Midi koʻylak',
    description:
      'Zigʻir aralash matodan tikilgan midi uzunlikdagi koʻylak. Belida chok, pastga qarab kengayib boradi.',
    price: 529_000,
    categoryId: 'dresses',
    gender: 'women',
    shape: 'dress',
    sizes: ['XS', 'S', 'M', 'L'],
    colorIds: ['cream', 'olive', 'black'],
    unavailable: ['XS:olive', 'L:black'],
    featured: true,
    newArrival: true,
    createdAt: '2026-11-15T09:00:00.000Z',
  },
  {
    slug: 'atlas-slip-koylak',
    name: 'Atlas slip koʻylak',
    description: 'Silliq atlas matodan tikilgan ingichka bogʻichli koʻylak. Yolgʻiz yoki trikotaj bilan kiyiladi.',
    price: 489_000,
    categoryId: 'dresses',
    gender: 'women',
    shape: 'dress',
    sizes: ['XS', 'S', 'M', 'L'],
    colorIds: ['brown', 'black'],
    createdAt: '2026-10-25T09:00:00.000Z',
  },
  {
    slug: 'plisse-yubka',
    name: 'Plisse yubka',
    description: 'Yengil plisse burmali midi yubka. Rezinali bel, harakatda chiroyli tebranadi.',
    price: 359_000,
    categoryId: 'skirts',
    gender: 'women',
    shape: 'skirt',
    sizes: ['XS', 'S', 'M', 'L'],
    colorIds: ['beige', 'black'],
    newArrival: true,
    createdAt: '2026-11-08T09:00:00.000Z',
  },
  {
    slug: 'trikotaj-kardigan',
    name: 'Trikotaj kardigan',
    description: 'Yumshoq ip aralash trikotajdan toʻqilgan tugmali kardigan. Erkin bichim, qovurgʻali yeng uchlari.',
    price: 429_000,
    categoryId: 'knitwear',
    gender: 'women',
    shape: 'knit',
    sizes: ['XS', 'S', 'M', 'L'],
    colorIds: ['cream', 'grey'],
    featured: true,
    createdAt: '2026-10-30T09:00:00.000Z',
  },
  {
    slug: 'trench-palto',
    name: 'Trench palto',
    description: 'Suv oʻtkazmaydigan qoplamali paxta trench. Kamar bilan, ikki qatorli tugmalar.',
    price: 1_190_000,
    categoryId: 'outerwear',
    gender: 'women',
    shape: 'coat',
    sizes: ['XS', 'S', 'M', 'L'],
    colorIds: ['beige', 'black'],
    unavailable: ['XS:black'],
    newArrival: true,
    createdAt: '2026-11-16T09:00:00.000Z',
    delivery: [18, 25],
  },
  {
    slug: 'ayollar-keng-shim',
    name: 'Keng shim',
    description: 'Baland belli, keng bichimli shim. Uzun oyoq siluetini yaratadi, tekis tushadi.',
    price: 399_000,
    categoryId: 'trousers',
    gender: 'women',
    shape: 'trousers',
    sizes: ['XS', 'S', 'M', 'L'],
    colorIds: ['cream', 'black'],
    createdAt: '2026-10-12T09:00:00.000Z',
  },
  {
    slug: 'asosiy-futbolka',
    name: 'Asosiy futbolka',
    description: 'Yumshoq paxta jerseydan tikilgan, tanaga mos bichimli futbolka. Garderobning asosi.',
    price: 159_000,
    categoryId: 'tshirts',
    gender: 'women',
    shape: 'tshirt',
    sizes: ['XS', 'S', 'M', 'L'],
    colorIds: ['white', 'black', 'beige'],
    createdAt: '2026-10-05T09:00:00.000Z',
  },
  {
    slug: 'charm-sumka',
    name: 'Charm sumka',
    description: 'Ekologik charmdan tayyorlangan oʻrtacha hajmli sumka. Yelka tasmasi, magnitli qopqoq.',
    price: 549_000,
    categoryId: 'accessories',
    gender: 'women',
    shape: 'bag',
    sizes: ONE_SIZE,
    colorIds: ['black', 'brown'],
    featured: true,
    createdAt: '2026-10-18T09:00:00.000Z',
  },
];

export const MOCK_PRODUCTS: Product[] = SEEDS.map(build);
