import type { ImageStorage } from '../ImageStorage';

/**
 * DEMO ONLY — "uploads" by converting the (already resized) image to a data URL
 * that is stored with the product in this browser's IndexedDB. Progress events
 * come from FileReader. Phase 2 uploads to Supabase Storage instead.
 */
export const mockImageStorage: ImageStorage = {
  upload(file, options) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) options?.onProgress?.(e.loaded / e.total);
      };
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.onload = () => {
        options?.onProgress?.(1);
        resolve({ url: String(reader.result), storagePath: `mock/${crypto.randomUUID()}` });
      };
      reader.readAsDataURL(file);
    });
  },
  async remove() {
    // Data URLs live inside the product record; nothing separate to delete.
  },
};
