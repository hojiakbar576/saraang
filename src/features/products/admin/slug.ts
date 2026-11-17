const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

/** "Zigʻir koʻylak (nusxa)" → "zigir-koylak-nusxa". Handles Uzbek Latin and Cyrillic. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ʻʼ'‘’`]/g, '')
    .replace(/[а-яёўқғҳ]/g, (ch) => CYRILLIC[ch] ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Returns `base`, or `base-2`, `base-3`… — whichever is not taken. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  const root = base.length >= 2 ? base : base ? `mahsulot-${base}` : 'mahsulot';
  if (!set.has(root)) return root;
  for (let i = 2; ; i++) {
    const candidate = `${root}-${i}`;
    if (!set.has(candidate)) return candidate;
  }
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
