# ConsignCare — Consignment Case Tracking & Procurement Platform

Source: 9 concept images (IMG_0018–0026). Two drafts of one business merged into one platform:
- **v1 "Inventory & Procurement App"** → back-office web (quotation, requisition, purchase request, PO, inventory, master data)
- **v2 "Consignment Case Tracking"** → sales-rep mobile app (cases, OCR usage capture, barcode, case journey)

## 1. Business

A Thai medical-device distributor places **consignment stock** (implants, catheters, arthroscopy
disposables) inside hospital ORs. The hospital pays only for what is used in surgery. Today a sales
rep learns about usage from a paper usage sheet / sticker sheet photographed in LINE, then the
back-office manually types quotations, chases the hospital PO, issues a requisition to cut stock and
replenish the hospital, and bills. Cases fall through the cracks → **revenue leakage, slow billing
(DSO), expired/lost consignment stock, no visibility per hospital.**

Tagline: *"From Case to Billing, All in One Place." / "One Team. One Platform."*

### Value pillars (from images)
Faster process · Accurate records · Paperless workflow · Better decision making ·
Capture usage by photo or scan · Track case progress (Quotation → Billing) · Multi-user access · Work across hospitals

### Problems → measures (before → target)
| Pain | Who | Measure | Before | Target |
|---|---|---|---|---|
| Usage typed by hand from photos/paper | Sales rep, admin | minutes to record a case | 15 min | 3 min (OCR) |
| Cases never billed | Finance, management | % of used items billed | ~92% | 99.5% |
| Slow cash | Finance | usage→invoice days | 21 days | 7 days |
| Expired stock in hospitals | Warehouse | expired write-off / yr | 3% of stock | <1% |
| No visibility | Manager | status known without phone calls | no | real-time dashboard |

## 2. Roles (actors)
| Role | Channel | Does |
|---|---|---|
| Sales Representative | Mobile (PWA) | Own hospital accounts; create case; capture usage photo (OCR) / scan barcode; view case journey, usage history, product history |
| Sales Admin (back-office) | Web | Create/send quotation from case usage; record hospital PO (scan PO barcode / PO no.); create requisition; issue invoice |
| Warehouse / Inventory | Web + scanner | Receive goods (GR), transfer stock to hospital consignment, issue requisitions, stock count, expiry watch |
| Purchasing | Web | Turn approved Purchase Requests into supplier POs |
| Sales Manager (approver) | Web/Mobile | Approve requisitions/PRs, dashboards |
| Accounting / Billing | Web | Invoice, mark paid, close case |
| System Admin | Web | Master data: hospitals, doctors, products, price lists, suppliers, users & hospital assignment |
| External: Hospital (purchasing dept) | Email / LINE | Receives quotation, sends PO |
| External: Supplier | Email | Receives supplier PO |
| External systems | — | OCR/AI service, LINE Messaging API, Email (SMTP), SSO (Google/Microsoft), ERP/Accounting (export) |

## 3. Core flows
1. **Login & account selection** — email/password or SSO; rep sees only assigned hospitals.
2. **Create case** — the rep first chooses **Scan QR / barcode** (the rear camera photographs the stickers or the usage sheet; the photo can be saved to the gallery), **Upload** (several photos from the gallery) or **Create manually**. Photos are read and shown as the patient count first, then one page per patient: hospital, case date, patient no. (HN), patient name-surname, doctor, operation, equipment picked from the hospital's consignment stock.
3. **Photo / barcode capture** — the rep takes or uploads a photo of the usage sheet, or scans stickers one by one. A sheet holds one or more **patient stickers** (HN, AN, name, age, doctor code : name) and, under each, the **equipment barcode stickers** whose printed text is `REF LOT SERIAL` (e.g. `402570 11325569 184796`). The system groups stickers under their patient, so **one photo becomes one case per patient**. The hospital and date are read from the handwriting. The rep confirms or edits, and usage (with lot and serial) is deducted from that hospital's consignment stock. Reading order: AI vision of the printed text, then on-device barcode decoding, then manual. The photo readers never return patient names or birth dates; the rep types the patient name.
4. **Quotation** (ใบเสนอราคา) — doc no `QT-NNNNN`, one running number from `QT-00001`, date, items (search/scan), unit, qty, contract price per hospital, discount, VAT 7%, supplier/company → export PDF / send email / send LINE. Created and approved automatically when usage is recorded (all items at contract price); an admin can force-reject it (with a reason) until the hospital accepts it with a PO, and the case then gets a new quotation.
5. **Hospital PO** — hospital returns PO; admin/rep records PO no. (scan barcode or type) against quotation. If found → "PO saved", else "PO not found".
6. **Requisition** (ใบเบิก) — department, purpose, items, qty, reason → approval → warehouse issues stock (replenish hospital consignment).
7. **Purchase Request** (ใบขอซื้อ) — when warehouse stock below reorder point → PR → approval → Purchasing creates supplier PO → Goods Receipt (lot/expiry captured). Download PDF / Excel.
8. **Billing** — invoice (ใบแจ้งหนี้/ใบกำกับภาษี) against hospital PO → paid → case **Closed**.
9. **Search inventory / barcode history** — by name or barcode: stock, unit, expiry, location, batch/lot, supplier, unit price, in/out transaction history, where/when each unit was used.
10. **Dashboard** — my cases, waiting PO, waiting billing, usage this month, recent activity, per-hospital summary.

## 4. Lifecycles
- **Case**: `DRAFT → USAGE_RECORDED → QUOTED → WAITING_PO → PO_RECEIVED → REQUISITIONED → BILLED → CLOSED`; `CANCELLED` from any state before BILLED.
  (Images show timeline: Usage Recorded → Quotation Generated → PO Received → Requisition → Billing → Closed.)
- **Quotation**: `APPROVED (automatic) → SENT → ACCEPTED | EXPIRED`; an admin can force `APPROVED | SENT → REJECTED`
- **Requisition**: `DRAFT → SUBMITTED → APPROVED | REJECTED → ISSUED`
- **Purchase Request**: `DRAFT → SUBMITTED → APPROVED | REJECTED → ORDERED → RECEIVED`
- **Invoice**: `ISSUED → PAID | OVERDUE → PAID`; `VOID`
- **OCR Job**: `UPLOADED → PROCESSING → EXTRACTED → CONFIRMED | FAILED`

## 5. Data model (entities)
User(id, name, email, role, phone) · HospitalAssignment(user, hospital)
Hospital(id, code, name, address, taxId, contactEmail, lineGroupId, imageUrl)
Department(id, hospital, name) · Doctor(id, hospital, name, specialty)
Product(id, ref, name, category, unit, gtin, listPrice, reorderPoint, supplier)
Supplier(id, name, email, phone, taxId)
PriceList(hospital, product, contractPrice, validFrom, validTo)
Location(id, type WAREHOUSE|HOSPITAL, hospital?) · Lot(id, product, lotNo, expiryDate)
StockBalance(location, lot, qty) · StockMovement(id, type IN|OUT|TRANSFER|ADJUST, lot, qty, from, to, refDocType, refDocNo, at, by)
Case(id, no `C25001`, hospital, rep, doctor?, patientHn?, patientName?, procedure?, caseDate, status)
CasePhoto(id, case, url) · OcrJob(id, photo, status, confidence, rawText)
UsageItem(id, case, product, lot, qty, unitPrice, source OCR|SCAN|MANUAL)
Quotation(id, no, case, hospital, date, validUntil, subtotal, discount, vat, total, status) · QuotationItem
CustomerPO(id, poNo, hospital, quotation, date, amount, fileUrl)
Requisition(id, no, department, purpose, requester, status, case?) · RequisitionItem(product, qty, reason)
PurchaseRequest(id, no, supplier, requester, status) · PRItem · SupplierPO · GoodsReceipt
Invoice(id, no, case, customerPO, amount, dueDate, status)
ActivityLog(id, actor, action, entity, entityId, at) · Notification · Approval(entity: requisition or PR, approver, decision, note)

## 6. Seed / demo data (shared by prototype)
Hospitals: Bangkok Hospital (12 open cases, 26 usage this month, 4 waiting PO, 3 waiting billing),
Bumrungrad Hospital (8/15/2/2), Samitivej Hospital (6/9/1/1), Phyathai 2 Hospital.
Users: Sinenart (Sales Rep), Anan (Sales Rep), Nattapong (Sales Rep), Kanya (Sales Admin), Wichai S. (Manager), Pim (Warehouse), Ratana (Accounting), Admin.
Doctors: Dr. Somchai, Dr. Anan, Dr. Krit. Procedures: Knee Arthroscopy, Shoulder Arthroscopy, ACL Reconstruction, PCI.
Products: Surpass Evolve (SE-001), Suture Anchor 3.0 (SA-003), Cannula 5mm (CN-005), Suction Tube (ST-010),
Arthroscopic Shaver Blade (AS-020), Catheter XYZ (CT-101), Balloon ABC (BL-202), Paracetamol 500 mg (code 1245678980123, Main Warehouse, LOT2264A, ABC Pharma).
Cases: C25001 (Bangkok Hospital, 15 Oct 2026, Dr. Somchai, Knee Arthroscopy, status WAITING_PO, QT-00040), C24985, C24980, C24970, C24921.
