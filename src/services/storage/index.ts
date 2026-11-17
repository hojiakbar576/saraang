import type { ImageStorage } from './ImageStorage';
import { mockImageStorage } from './mock/mockImageStorage';

/** Phase 2: Supabase Storage implementation (admin-only upload policy). */
export const imageStorage: ImageStorage = mockImageStorage;
export type { ImageStorage, UploadedImage } from './ImageStorage';
