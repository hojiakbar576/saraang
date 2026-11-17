# YOUR BRAND — clothing pre-order store

React + TypeScript + Vite + Tailwind storefront (and, later, admin dashboard) for a
Tashkent-based clothing pre-order business. Brand name and contacts live in
`src/config/brand.ts`; all UI text lives in `src/i18n/uz.ts`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + component tests
npm run build      # type-check + production build
```

## Current status — Phase 1 (local mock data, no backend)

- Product data and images are **demo placeholders** (`src/data/mock/`), marked "DEMO".
- The cart is stored in the browser (localStorage). No orders are sent anywhere yet.
- The data layer goes through `src/services/catalog` so Supabase can replace the mock
  implementation in Phase 2 without touching the pages.

## Structure

```
src/
  app/          router + providers
  config/       brand identity (replaceable)
  i18n/         UI strings (Uzbek Latin)
  types/        domain types
  lib/          money (integer UZS), helpers
  data/mock/    DEMO catalog, colours, categories, generated images
  services/     data-access interfaces + mock implementations
  features/     pure logic: product filters, variants, cart
  hooks/        data hooks
  components/   ui/ primitives, storefront/ components
  layouts/      StorefrontLayout (admin layout comes in Milestone 3)
  pages/        storefront pages
tests/          Vitest tests
```

## Windows note

`package.json` overrides `rollup` with `@rollup/wasm-node` because Windows
Application Control blocks Rollup's native `.node` binary on this machine.
