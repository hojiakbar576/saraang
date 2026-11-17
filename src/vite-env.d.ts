/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK_ADMIN_EMAIL?: string;
  readonly VITE_MOCK_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
