export interface UploadedImage {
  /** Public URL saved on the product. */
  url: string;
  /** Provider path used later to delete the file. */
  storagePath: string;
}

/**
 * Storage-provider–agnostic image storage. Products only keep `url` and
 * `storagePath`, so moving from the mock to Supabase Storage (or elsewhere)
 * does not change the catalog model.
 */
export interface ImageStorage {
  upload(file: Blob, options?: { onProgress?: (fraction: number) => void }): Promise<UploadedImage>;
  remove(storagePath: string): Promise<void>;
}
