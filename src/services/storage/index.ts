import type { ImageStorage } from './ImageStorage';
import { mockImageStorage } from './mock/mockImageStorage';
import { supabaseEnabled } from '@/services/supabase/client';
import { supabaseImageStorage } from '@/services/supabase/repositories';

/** Supabase Storage (admin-only upload policy) when configured; demo data URLs otherwise. */
export const imageStorage: ImageStorage = supabaseEnabled ? supabaseImageStorage : mockImageStorage;
export type { ImageStorage, UploadedImage } from './ImageStorage';
