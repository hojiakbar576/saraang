export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 12;
const MAX_EDGE = 1600;

export type ImageValidationError = 'type' | 'size';

export function validateImageFile(file: { type: string; size: number }): ImageValidationError | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size > MAX_IMAGE_BYTES) return 'size';
  return null;
}

export const IMAGE_ERROR_TEXT: Record<ImageValidationError, string> = {
  type: 'Faqat JPG, PNG yoki WEBP rasm yuklash mumkin.',
  size: `Rasm hajmi ${MAX_IMAGE_BYTES / 1024 / 1024} MB dan oshmasin.`,
};

/**
 * Downscales large photos (long edge ≤ 1600px) and re-encodes them as WEBP/JPEG
 * before upload — much faster on mobile data and cheaper to store.
 * Falls back to the original file if the browser cannot decode it.
 */
export async function prepareImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.85));
    if (blob && blob.type === 'image/webp') return blob;
    const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return jpeg ?? file;
  } catch {
    return file;
  }
}

/** "Oq-futbolka_01.JPG" → "oq-futbolka_01" — used for alt text and CSV filename matching. */
export function baseFilename(name: string): string {
  const last = name.split(/[\\/]/).pop() ?? name;
  return last.replace(/\.[^.]+$/, '');
}
