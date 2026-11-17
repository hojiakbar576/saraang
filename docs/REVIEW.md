# Milestone 7 — Frontend review & approval

Phase 1 (frontend on local demo data) is complete. **Nothing is connected to a
backend yet**: products, orders and the admin login live only in the browser you
test with. Supabase, Telegram and Vercel start only after you approve this review.

## 1. How to run it

```bash
npm install
npm run dev
```

- Storefront: http://localhost:5173
- Admin: http://localhost:5173/admin — demo login is in `.env.development.local`
  (copy `.env.example` if the file is missing). This login is a development mock,
  not real security, and is switched off in production builds.

Other commands: `npm test` (80 tests), `npm run lint`, `npm run build`.

## 2. Click-through script (≈ 20 minutes, ideally on a phone)

Storefront

- [ ] Home → Erkaklar / Ayollar → filter by size, colour, price; sort; search (try `zig'ir`)
- [ ] Product page → pick colour and size (crossed-out options cannot be chosen) → add to cart
- [ ] Cart → change quantity, remove a line → refresh the page: cart is still there
- [ ] Checkout → submit empty (errors appear) → fill name + phone → submit
- [ ] Success page says clearly it is a **demo order, not sent to the store**

Admin

- [ ] Log in → Dashboard shows the new order (labelled demo)
- [ ] Products → add a product **with your own photos** (several at once, reorder, set main photo)
- [ ] Duplicate a product → change name/price/photos → save; check it appears in the shop when set to "Sotuvda"
- [ ] Products → CSV import: download template, put 2 photos named like in the template, import
- [ ] Orders → open the order → move it step by step to "Yetkazildi", enter the amount received
- [ ] Dashboard and Analytics show that amount as revenue; cancelled orders never count
- [ ] Log out → admin pages are locked again

## 3. Decisions needed before Phase 2

| # | Question | Current assumption |
|---|---|---|
| 1 | **Order status rules** — forward one step at a time, back one step to correct, cancel any open order, reopen cancelled as "Yangi", delivered → only back to "Yoʻlda". OK? | as described |
| 2 | **Analytics definitions** — revenue = amount received on delivered orders by delivery date; order counts by creation date; best sellers = units in non-cancelled orders. OK? | as described |
| 3 | **Brand**: final name, phone, email, Instagram, Telegram, working hours | placeholders in `src/config/brand.ts` |
| 4 | **Language**: is Uzbek (Latin) only enough for launch, or is Russian needed too? Please have a native speaker read the texts in `src/i18n/uz.ts`. | Uzbek only |
| 5 | **Delivery cost**: still "confirmed by phone", or a fixed fee for Tashkent? | by phone |
| 6 | **Real order numbers**: format for live orders, e.g. `YB-1001` | `DEMO-1001` (demo only) |
| 7 | **Admin email** for the shared admin account (created by you in Supabase, never via a public sign-up) | — |
| 8 | **Supabase**: create a free project (region **Frankfurt / eu-central-1** is closest to Tashkent) or let me guide you; I will never need the service-role key in the browser | — |
| 9 | **Telegram**: create a bot with @BotFather and decide which chat/group receives order alerts | — |
| 10 | **Domain** for Vercel (can start on the free `*.vercel.app` address) | — |

## 4. Known limitations of Phase 1 (by design)

- Demo product images are generated drawings marked "DEMO"; real photos come from the admin upload.
- All data is per-browser: a second phone or the other partner will not see your test orders until Supabase is connected.
- Mock admin login can be bypassed with browser dev tools — it exists only to build the UI. Real protection = Supabase Auth + Row Level Security in Phase 2.
- Photo upload and CSV import were tested with unit tests; please try them with real files (step 2 above).
- No online payment, no customer accounts, no profit tracking (V1 scope).

## 5. What Phase 2 will change (preview)

- `src/services/*/mock/*` implementations are replaced by Supabase ones behind the same interfaces; pages stay the same.
- Tables: products, product_images, product_variants, orders, order_items (snapshots), order_status_history, order_notes, store_settings — all with RLS. Money as `bigint` so'm.
- Checkout calls a server-side function that re-validates and re-prices the order (customers get no direct table access).
- Images move to Supabase Storage (admin-only upload policy).
- Cost columns (purchase cost, shipping, other expenses) are designed in but unused, ready for profit tracking later.
