import type { ProductTranslations } from '@/types/catalog';

/** DEMO DATA — Russian and English text for the sample products, keyed by slug. */
export const DEMO_PRODUCT_TRANSLATIONS: Record<string, ProductTranslations> = {
  'oversize-paxta-futbolka': {
    ru: { name: 'Хлопковая футболка оверсайз', description: 'Футболка свободного кроя из плотного хлопка. Спущенная линия плеча, прочный воротник в рубчик. Удобная база на каждый день.' },
    en: { name: 'Oversized cotton T-shirt', description: 'A relaxed-fit T-shirt in dense cotton. Dropped shoulders and a sturdy ribbed neckline. A comfortable everyday essential.' },
  },
  'zigir-koylak': {
    ru: { name: 'Льняная рубашка', description: 'Рубашка свободного кроя из лёгкой ткани с льном. Дышащий материал для жарких дней, естественная фактура.' },
    en: { name: 'Linen shirt', description: 'A relaxed shirt in a light linen-blend fabric. Breathable for hot days, with a natural texture.' },
  },
  'oksford-koylak': {
    ru: { name: 'Оксфордская рубашка', description: 'Рубашка из классической оксфордской ткани с воротником на пуговицах. Подходит и для офиса, и для выходных.' },
    en: { name: 'Oxford shirt', description: 'A shirt in classic Oxford cloth with a button-down collar. Works for the office and for weekends.' },
  },
  'merino-sviter': {
    ru: { name: 'Свитер из мериноса', description: 'Свитер с круглым вырезом из тонкой шерсти с мериносом. Носите поверх рубашки или отдельно.' },
    en: { name: 'Merino jumper', description: 'A crew-neck jumper knitted from fine merino-blend wool. Wear it over a shirt or on its own.' },
  },
  'klassik-palto': {
    ru: { name: 'Классическое пальто', description: 'Пальто прямого кроя из ткани с шерстью. Подкладка, два боковых кармана. Для осени и зимы.' },
    en: { name: 'Classic coat', description: 'A straight-cut coat in a wool-blend fabric. Fully lined, with two side pockets. For autumn and winter.' },
  },
  'chino-shim': {
    ru: { name: 'Брюки чинос', description: 'Брюки чинос из слегка эластичного хлопка. Зауженный крой, четыре кармана.' },
    en: { name: 'Chino trousers', description: 'Chinos in a cotton fabric with a little stretch. Tapered fit, four pockets.' },
  },
  'keng-bichimli-shim': {
    ru: { name: 'Широкие брюки', description: 'Свободные брюки прямого силуэта. Защипы спереди, лёгкая и мягкая ткань.' },
    en: { name: 'Wide-leg trousers', description: 'Relaxed trousers with a straight fall. Front pleats, light and soft fabric.' },
  },
  'kanvas-sumka': {
    ru: { name: 'Сумка из канваса', description: 'Вместительная сумка из плотного канваса. Внутренний карман, прочные ручки.' },
    en: { name: 'Canvas tote bag', description: 'A roomy bag in heavy canvas. Inside pocket and sturdy handles.' },
  },
  'midi-koylak': {
    ru: { name: 'Платье миди', description: 'Платье длины миди из ткани с льном. Шов по талии, книзу расширяется.' },
    en: { name: 'Midi dress', description: 'A midi-length dress in a linen-blend fabric. Seamed at the waist and flaring towards the hem.' },
  },
  'atlas-slip-koylak': {
    ru: { name: 'Атласное платье-комбинация', description: 'Платье на тонких бретелях из гладкого атласа. Носится отдельно или с трикотажем.' },
    en: { name: 'Satin slip dress', description: 'A dress with thin straps in smooth satin. Wear it on its own or with knitwear.' },
  },
  'plisse-yubka': {
    ru: { name: 'Юбка плиссе', description: 'Лёгкая юбка миди со складками плиссе. Пояс на резинке, красиво движется при ходьбе.' },
    en: { name: 'Pleated skirt', description: 'A light midi skirt with fine pleats. Elasticated waist and a lovely swing as you move.' },
  },
  'trikotaj-kardigan': {
    ru: { name: 'Трикотажный кардиган', description: 'Кардиган на пуговицах из мягкого трикотажа с хлопком. Свободный крой, манжеты в рубчик.' },
    en: { name: 'Knitted cardigan', description: 'A button-up cardigan in soft cotton-blend knit. Relaxed fit with ribbed cuffs.' },
  },
  'trench-palto': {
    ru: { name: 'Тренч', description: 'Хлопковый тренч с водоотталкивающей пропиткой. С поясом, двубортная застёжка.' },
    en: { name: 'Trench coat', description: 'A cotton trench with a water-repellent finish. Belted, with double-breasted buttons.' },
  },
  'ayollar-keng-shim': {
    ru: { name: 'Широкие брюки', description: 'Брюки широкого кроя с высокой посадкой. Визуально удлиняют ноги, ровно сидят.' },
    en: { name: 'Wide trousers', description: 'High-waisted, wide-leg trousers. They lengthen the leg line and hang straight.' },
  },
  'asosiy-futbolka': {
    ru: { name: 'Базовая футболка', description: 'Приталенная футболка из мягкого хлопкового джерси. Основа гардероба.' },
    en: { name: 'Essential T-shirt', description: 'A fitted T-shirt in soft cotton jersey. A wardrobe staple.' },
  },
  'charm-sumka': {
    ru: { name: 'Сумка из экокожи', description: 'Сумка среднего размера из экокожи. Плечевой ремень, клапан на магните.' },
    en: { name: 'Faux leather bag', description: 'A medium-sized bag in faux leather. Shoulder strap and magnetic flap.' },
  },
};
