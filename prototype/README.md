# ConsignCare – presentation prototype

"From Case to Billing, All in One Place." This is a clickable prototype of a consignment case-tracking and procurement
platform for a Thai medical-device distributor. It includes a sales-rep mobile app (`/m`), a back-office web app
(`/admin`), a presentation landing page (`/`) and the project slide deck
(`/presentation/index.html`, plain HTML in `public/presentation`).

> **All data is mock data.** It is seeded from `src/lib/seed.ts` and persisted in the browser's `localStorage`.
> Data lives in the browser (localStorage). Email, LINE, SSO and the hospital's PO reply are simulated.
>
> **Reading usage photos** works three ways:
> 1. **AI (optional):** start the server with `ANTHROPIC_API_KEY=...` and `/api/extract` sends the photo to Claude
>    (`claude-opus-5-5`, structured output). It reads the hospital, the date, each patient sticker (HN, AN, doctor code) and the
>    "REF LOT SERIAL" text under every barcode. It never returns patient names or birth dates.
> 2. **On the device:** without a key, barcodes are decoded in the browser (zxing-wasm, self-hosted wasm in `public/wasm`) and
>    grouped into patients by the gaps between sticker rows, or where a REF repeats. A photo under 2000 px is read again at
>    2.5× and 3×, which recovers most stickers in a ~1000 px shot. The longest codes still need the full-size photo or the AI.
> 3. **Sample sheet:** `public/samples/ep-usage-sheet.jpg` is the Phayathai Sriracha sheet with patient names, birth dates and the
>    doctor's name redacted. It uses a fixed transcription, so the demo works offline.
> Use **Reset demo data** (mobile side panel, mobile Settings, or `/admin/settings`) to restore the seed.

## Run

```bash
npm install
npm run build
npm run start -- -p 3100 -H 0.0.0.0   # production
# or: npm run dev -- -p 3100 -H 0.0.0.0
```

The stack is Node 18 compatible: Next.js 15, React 19, TypeScript, Tailwind CSS v3, zustand, lucide-react, recharts,
SheetJS (xlsx), and @zxing/browser for camera barcode scanning.

## Deploy to GitHub Pages

`.github/workflows/pages.yml` (at the repository root) builds a static copy of the prototype and publishes it on every
push to `main`. Turn it on once in **Settings › Pages › Source: GitHub Actions**; the site is then at
`https://<user>.github.io/consign-care/`.

```bash
BASE_PATH=/consign-care npm run build:pages   # static site in out/
npm run preview:pages                          # serves out/ on :3200 (build without BASE_PATH to browse it at /)
```

What differs on the static site:

- **No server, so no AI reading.** `/api/extract` is left out of the build; photos are read by the on-device barcode
  decoder and the sample sheet uses its fixed transcription.
- **Every seeded record has its own page** (cases, quotations, requisitions, PRs, products, accounts, printable
  documents). A record created in the browser has none, so GitHub Pages serves `404.html`, which forwards to the
  route's `_` page with the id in the query (`/m/cases/_/?id=case-…`). `useRouteParam` reads it from there.
- Files in `public/` are referenced through `asset()` (`src/lib/base.ts`) so they resolve under the base path.

## Routes

| Area | Routes |
|---|---|
| Presentation | `/` story, value pillars, case journey, role switcher, demo path |
| Mobile (sales rep) | `/m` login · `/m/home` · `/m/accounts` · `/m/accounts/[id]` · `/m/cases` · `/m/cases/new` · `/m/cases/new/review` (OCR) · `/m/cases/[id]` (tracking) · `/m/usage` · `/m/scan` · `/m/products/[id]` · `/m/notifications` · `/m/settings` |
| Back-office | `/admin` dashboard · cases · usage/new (v1 New Usage) · quotations · pos · requisitions · purchase-requests · billing · inventory · approvals · master · activity · settings |
| Documents | `/print/{quotation,pr,invoice,requisition}/[id]` A4 Thai document → Print / Save as PDF (+ Excel) |

## Demo tips

- Open `/m` and `/admin` in **two tabs**. They stay in sync through `localStorage` events.

### Local database (localStorage)

`src/lib/db.ts` treats `localStorage` as the database, with one key per table:

| Key | Holds |
| --- | --- |
| `consigncare:db:_meta` | data version, last commit, rows and update time per table |
| `consigncare:db:<table>` | one JSON array per table: `cases`, `usage`, `quotations`, `stock`, … (23 tables) |
| `consigncare:draft` | the New Case form in progress, so it survives a refresh |
| `consigncare:prefs` | language and the chosen personas |

A commit writes only the tables that changed, then writes the meta key last. Other tabs reload when the meta key changes.
Back-office **Database (local)** (`/admin/database`) lets you browse every table, back it up to JSON, restore from a backup and reset to the seed.
Bumping `DATA_VERSION` in `seed.ts` reseeds. An old single-key database (`consigncare:data`) is migrated on first load.
- On desktop, the mobile app renders in a phone frame with a presenter panel (persona switcher and screen shortcuts).
- No camera? Every scanner has **Simulate scan** sample barcodes and a manual input.
- TH/EN toggle is on every screen. Thai is the default.
- See `DEMO.md` for the 5–7 minute click path.

## Code map

- `src/lib/types.ts` domain entities · `seed.ts` demo data · `ops.ts` all business operations (case lifecycle,
  stock movements, numbering) · `selectors.ts` derived stats · `store.ts` zustand store + persistence
- `src/i18n/*` TH/EN dictionaries
- `src/components/*` shared UI (scanner, case timeline, A4 document sheet, persona switcher…)
