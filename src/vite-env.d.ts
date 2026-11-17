/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK_ADMIN_EMAIL?: string;
  readonly VITE_MOCK_ADMIN_PASSWORD?: string;
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (anon) key — safe in the browser; RLS protects the data. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** 'mock' forces local demo data even when Supabase is configured. */
  readonly VITE_DATA_SOURCE?: 'mock' | 'supabase';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
