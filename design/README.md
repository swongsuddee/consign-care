# ConsignCare — Truss design

The full business and system design for ConsignCare, built from the 9 concept images, as a Truss product.

## Open it in Truss

1. Run Truss (`cd ~/Repositories/truss && npm run dev`) and open it in your browser.
2. On the product list, click **Import a design file** and pick `consigncare.truss.zip`. This brings in the design plus the logos and icons.
   `consigncare.design.json` works too, but has no images.
3. In the plan, use **Export → Specification (PDF)** or **Overview deck (PDF)** to get documents to hand out.

## What's inside

| Truss stage | Content |
|---|---|
| 0 Problem & Outcomes | 5 outcomes with baselines and targets; Business Model Canvas; 10 stakeholders; 5 personas; the "case today" journey; value proposition canvas; SWOT → TOWS; sweet spot; 16 impacts; value × effort priorities |
| Architecture & Patterns | Modular monolith, hexagonal; State Machine, Repository, Adapter, Outbox, Strategy |
| Tech Stack | 18 choices: Next.js PWA, NestJS, Prisma/PostgreSQL, BullMQ/Redis, S3, Claude vision OCR, ZXing, Auth.js + Entra ID, LINE + SES, AWS Bangkok region, … |
| Design System | Navy/blue palette (light and dark), Thai fonts, type scale, spacing, breakpoints, navigation, 12 components with states, Thai voice rules |
| Assets | Logo (mark, horizontal, reversed, mono), favicon, PWA icon, share image, hospital hero |
| 1 Use Case | 13 actors, 18 goals in 5 features |
| 2 Activity | 18 flows; each action is linked to the lifecycle transitions it causes |
| 3 ER | 24 entities, 38 relationships |
| 4 State | Case, Quotation, Requisition, Purchase Request, Invoice, Usage Photo |
| Swimlanes | 7 journeys: case to cash, restocking, onboarding a hospital, quotation, requisition, invoice, OCR photo |
| NF | 12 non-functional requirements (OCR latency, offline photos, PDPA, document numbering, stock reconciliation, …) |
| 5 / 6 / 8 | 12 components, 14 dependencies, 5 sequences, 77 classes (system and UI) |
| 7 UI | 22 screens (10 mobile, 12 back-office) traced to journey steps and columns |

Truss's checks: **0 conflicts and 12 advisories**. Nine are wireframe "attention" hints. One is the separate S3 file store next to the modular monolith, which is deliberate. Two are enum columns with no lifecycle drawn.

## Rebuild

The design is code: `src/*.ts`, typed against Truss's own model.

```sh
cd ~/Repositories/truss && npx jiti ~/Repositories/lee-project/design/src/main.ts
```

This validates against Truss's schema, runs every Truss check (written to `findings.json`), and rewrites the JSON, the zip and `brand/`.
