# ConsignCare

"From Case to Billing, All in One Place": consignment case tracking and procurement for a Thai medical-device distributor.

| Folder | What it is |
| --- | --- |
| [`prototype/`](prototype) | Clickable Next.js prototype: rep mobile app (`/m`), back office (`/admin`), landing page (`/`), slide deck (`/presentation/index.html`). See its [README](prototype/README.md) and [DEMO](prototype/DEMO.md). |
| [`design/`](design) | System design source for Truss: brand, domain model, specification. |
| [`docs/`](docs) | Domain notes. |
| [`exports/presentation/`](exports/presentation) | 15-slide project deck. `ConsignCare-presentation.html` is a single file with the images built in. |
| [`exports/`](exports) | Sample quotation export (PDF, Excel). |

```bash
cd prototype && npm install && npm run dev   # http://localhost:3000
```

All data is mock data. The one real usage sheet in the repo (`prototype/public/samples/ep-usage-sheet.jpg`) has patient
names, birth dates, HN/AN numbers and the doctor's name covered.
