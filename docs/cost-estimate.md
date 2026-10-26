# ConsignCare: cost to build and run

Estimate prepared 23 October 2026, for planning and budgeting. It prices the production system from zero, without
counting the existing prototype and design. All figures are estimates; check the prices marked in [Sources](#sources)
before quoting them to a customer.

**Assumptions**

- 5 hospitals, about 25 users: 10 sales reps on the phone app, 15 back-office staff.
- About 300 usage-sheet photos read a month.
- The rep app is a web app installed from the browser (PWA), so there are no App Store or Play Store fees.
- 1 USD ≈ ฿34. Prices exclude 7% VAT.
- People cost ฿8,000 per person-day, a blended company or agency rate. Thai senior developers earn about
  ฿95,000–150,000 a month; this rate is derived from that, not from agency quotes.

## Summary

| | Cost |
|---|---|
| Build, one time (including security test and PDPA work) | **≈ ฿2.7M–2.9M** |
| Running cost (hosting, database, AI, messaging) | **≈ ฿31k–107k a year** |
| Yearly maintenance (running cost + support retainer) | **≈ ฿510k–740k a year** |
| Three-year total | **≈ ฿4.4M**, about ฿122k a month averaged |

About 85% of the cost is people. Hosting and AI together are under 5%.

## 1. Build (one time)

Team: a tech lead, 2 full-stack developers, a part-time designer/BA, QA and a project manager. About 4–5 months to go
live at the pilot hospital.

| Work | Person-days |
|---|---|
| Foundation: login and SSO, roles, database, audit log, deploy pipeline, Thai/English | 25 |
| Master data: hospitals, doctors, products, contract prices, users | 15 |
| Sales rep phone app: new case (scan, upload, manual), patient pages, case tracking, scan, notifications | 35 |
| Photo reading: AI and barcode, tuned on real usage sheets | 20 |
| Quotations: created and approved automatically, numbering, PDF/Excel, email/LINE, admin reject | 15 |
| Hospital PO intake and matching (email, LINE) | 15 |
| Requisitions and approvals | 12 |
| Stock: lots, consignment stock, purchase requests, supplier POs, goods received | 30 |
| Billing, invoices, payments | 15 |
| Dashboards, tables with column filters, Excel export | 15 |
| Integrations: LINE OA, email, accounting export | 15 |
| Testing, test automation, user acceptance | 35 |
| Project management, business analysis, UX design | 40 |
| Security and PDPA work | 10 |
| Data loading, training, pilot support | 15 |
| **Total** | **≈ 310 person-days ≈ ฿2.5M** (range ฿1.9M–3.1M) |

Other one-time costs:

| Item | Cost |
|---|---|
| Penetration test before go-live | ฿100,000–200,000 |
| PDPA: legal review, consent text, data-processing agreements with the AI provider and cloud vendors | ฿50,000–150,000 |
| Hosting on Cloudflare Workers (OpenNext adapter setup) | included above; about 3–5 person-days |
| **Build total** | **≈ ฿2.7M–2.9M** |

The existing prototype and system design would save about 20–30 person-days of discovery and design work.

## 2. Running cost

### Recommended: Cloudflare + Supabase

| Item | Service | Per month | Per year |
|---|---|---|---|
| Domain | consigncare.co.th (Thai registrar) + .com | ~฿120 | ~฿1,450 |
| DNS, SSL, firewall, DDoS protection | Cloudflare Free | ฿0 | ฿0 |
| Web app hosting | Cloudflare Workers Paid ($5) | ~฿170 | ~฿2,040 |
| Photo storage | Cloudflare R2: ~1–2 GB added a month, first 10 GB free | ฿0–50 | ฿0–600 |
| Database | Supabase Pro + Small compute ($40), connected through Cloudflare Hyperdrive | ~฿1,360 | ~฿16,320 |
| Point-in-time database recovery (recommended for billing data) | Supabase PITR (from $100) | ~฿3,400 | ~฿40,800 |
| Back-office login / SSO | Cloudflare Access (free up to 50 users) | ฿0 | ฿0 |
| AI reading of usage sheets | Claude Opus 5.5, 300 photos × ~$0.05 | ~฿500 | ~฿6,000 |
| Email | Resend | ฿0–700 | ฿0–8,400 |
| LINE Official Account | Free (pilot) → Basic | ฿0–1,280 | ฿0–15,360 |
| Error monitoring | Sentry | ฿0–900 | ฿0–10,800 |
| Code repository | GitHub Team, 3 users | ~฿400 | ~฿4,800 |
| **Total** | | **≈ ฿2.6k–8.9k** | **≈ ฿31k–107k** |

The low end is the pilot: free plans, no point-in-time recovery. The high end is full use at 5 hospitals with backups
and monitoring.

### Comparing hosting options

| Option | Per month | Per year | Pick it when |
|---|---|---|---|
| **Cloudflare + Supabase** (above) | ฿2.6k–8.9k | ฿31k–107k | Default: cheapest, fast in Thailand |
| Vercel + Supabase | ฿3.1k–10.1k | ฿37k–121k | The team prefers Vercel's Next.js tooling |
| AWS Bangkok region | ฿10k–17k | ฿120k–204k | PDPA review requires patient data to be stored in Thailand |

AWS Bangkok runs the app in containers (ECS) with a two-zone Postgres database (RDS), S3 photo storage, a load
balancer, logs and a firewall. It needs about 10–15 extra person-days of DevOps work (about ฿100,000). Cloudflare can
still sit in front of it for DNS, SSL and the firewall.

### AI reading cost per photo

| | Tokens | Price | Cost |
|---|---|---|---|
| Input: photo (~2,500 tokens) + instructions (~1,000) | ~3,500 | $4 per million | $0.014 |
| Output: result + model reasoning | ~1,800 | $20 per million | $0.036 |
| **Per photo** | | | **≈ $0.05 (≈ ฿1.7)** |

Even 2,000 photos a month is about ฿3,400. Claude Sonnet 5.5 ($2 / $10 per million) would halve the cost, if its
accuracy on real usage sheets is good enough.

## 3. Yearly maintenance

| Item | Per year |
|---|---|
| Running cost (section 2, Cloudflare) | ฿31,000–107,000 |
| Support retainer: about 5 person-days a month for bug fixes, security and library updates, LINE and Claude API changes, small changes and monitoring | ≈ ฿480,000 (15–20% of build cost) |
| Yearly penetration test (optional) | ฿100,000–150,000 |
| Domain renewals | included in running cost |
| **Total** | **≈ ฿510,000–740,000** |

New features beyond small changes are quoted separately.

## 4. Three-year total

| Item | Cost |
|---|---|
| Build, including security test and PDPA work | ≈ ฿2.8M |
| Running cost, 3 × ~฿70,000 (mid-range) | ≈ ฿0.2M |
| Support retainer, 3 × ~฿480,000 | ≈ ฿1.45M |
| **Three-year total** | **≈ ฿4.4M**, about ฿122,000 a month averaged |

## What moves the cost

- **Team size and duration.** People are about 85% of the total. A smaller first release, for example cases,
  quotations and hospital POs without purchasing and full stock management, saves about 80–100 person-days
  (about ฿0.7M).
- **Where patient data must be stored.** If the PDPA review requires storage in Thailand, use AWS Bangkok: about
  ฿90,000–100,000 more a year to run, plus about ฿100,000 of DevOps work. Cloudflare serves from Bangkok but does not
  guarantee data is stored in Thailand.
- **AI and patient data.** Usage-sheet photos sent to Claude carry patient details outside Thailand, so the PDPA review
  must cover that transfer.
- **The people rate.** ฿8,000 a day is an estimate. An in-house team costs less per day but adds hiring and management
  cost; an established Thai agency may charge ฿10,000–15,000 a day.

## Sources

Prices come from the pages below, checked October 2026. Most are third-party summaries, so confirm them on each
vendor's own pricing page before quoting:

- Claude API prices (Opus 5.5 $4 / $20, Sonnet 5.5 $2 / $10 per million tokens): Anthropic's current API price list.
- Supabase: [pricing](https://supabase.com/pricing), [2026 guide](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/). The PITR price is a starting price.
- Vercel: [cost in 2026](https://makerkit.dev/blog/tutorials/vercel-cost), [Pro plan docs](https://vercel.com/docs/plans/pro-plan/switching). Per-seat pricing is not confirmed on Vercel's own page.
- LINE Official Account: [Messaging API pricing](https://developers.line.biz/en/docs/messaging-api/pricing/), [Thai plans](https://yespress.io/line-company-thailand).
- AWS Bangkok (ap-southeast-7) database: [db.t4g.small regional prices](https://www.bytebase.com/dbcost/rds/instance/db.t4g.small/).
- .co.th domain: [Netim](https://netim.com/en/domain-name/co.th-domain), [DonDominio](https://dondominio.com/en/products/domains/th).
- Thai developer pay: [web developers](https://www.secondtalent.com/developer-rate-card/web-developer-thailand/), [React developers](https://www.secondtalent.com/developer-rate-card/react-developer-thailand/).
- Cloudflare Workers, R2 and Access prices: from Cloudflare's published plans; not re-checked for this estimate.
