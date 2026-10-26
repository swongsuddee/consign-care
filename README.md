# ConsignCare

"From Case to Billing, All in One Place": consignment case tracking and procurement for a Thai medical-device distributor.

| Folder | What it is |
| --- | --- |
| [`prototype/`](prototype) | Clickable Next.js prototype: rep mobile app (`/m`), back office (`/admin`), landing page (`/`). See its [README](prototype/README.md) and [DEMO](prototype/DEMO.md). |
| [`design/`](design) | System design source for Truss: brand, domain model, specification. |
| [`docs/`](docs) | Domain notes ([domain.md](docs/domain.md)) and the [cost estimate](docs/cost-estimate.md) to build and run the system. |
| [`prototype/public/presentation/`](prototype/public/presentation) | 17-slide project deck, plain HTML. Served at `/presentation/index.html` and linked from the landing page; also opens straight from the file. |

Live demo (GitHub Pages, after it is enabled): https://swongsuddee.github.io/consign-care/

```bash
cd prototype && npm install && npm run dev   # http://localhost:3000
```

All data is mock data. There is no real usage sheet in the repo: the demo's patients, doctor codes and sticker codes are
made up, and **Create mock data** on New Case generates new fictional patients each time.
