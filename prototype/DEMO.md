# ConsignCare: 5–7 minute demo script

**Before you start:** open two browser tabs, **Tab A** `/m` (sales-rep app) and **Tab B** `/admin` (back-office).
They sync live through localStorage. Start from a clean state: back-office **Settings › Reset demo data**
(or **Reset demo data** in the mobile side panel). TH/EN is toggled from the top bar of every screen. Labels below
are in English with the Thai label in brackets.

Story: *Two EP ablation cases were done at Phayathai Sriracha this morning. The nurse stuck every device sticker under its patient's label on one sheet. Let's follow case C25002 from that photo to cash.*

---

### 0. Landing page `/` (30 s)
- Hero: "From Case to Billing, All in One Place". Scroll through **Problem → Solution** (15 min → 3 min, 21 → 7 days),
  the 4 pillars, and the **Case journey** (Usage → Quotation → PO → Requisition → Billing → Closed).
- **Roles** cards: each one drops you into that persona.

### 1. Rep turns one barcode photo into two cases, on mobile (Tab A, ~1.5 min)
1. `/m` login: any input works. Click **Sign In** [เข้าสู่ระบบ] (or **Sign in with SSO**).
2. Dashboard: "Hello, Sinenart", tiles **12 / 5 / 8 / 26**, Recent Activity.
3. **New Case** [สร้างเคสใหม่]. Leave Hospital on **Read from the photo (AI)** [อ่านจากรูป (AI)].
   The **Equipment used** [อุปกรณ์ที่ใช้] list has three ways in:
   - **Select** [เลือกรายการ] opens a bottom sheet with the consignment stock at the hospital. Tap a lot to add it (tap again for +1). **Scan** [สแกน] inside the sheet reads stickers one by one.
   - **Camera** [กล้อง] takes a photo.
   - **Upload** [อัปโหลด] picks photos.

   A photo is read the moment it is added: the barcodes found are listed under it, grouped by patient, and any item can be removed with ×. Review reuses that reading instead of reading the photo again. Picked items carry their quantity (− / +), capped at what is on hand. The form is saved as a draft, so a refresh keeps it; use **Start over** [เริ่มใหม่] to clear it.
   For the demo tap the sample **Real sheet · 2 patients (Phayathai Sriracha)** [ใบบันทึกจริง · 2 ผู้ป่วย]. It is the
   hospital's real usage sheet with patient names and birth dates redacted. Then **Next · AI reads the photo**.
4. Review: **"Found 2 patients · 12 items"** [พบ 2 ผู้ป่วย · 12 รายการ]. The hospital (*Phayathai Sriracha*) and the date (17 Oct 2026)
   were read from the handwriting. Each patient card has HN / AN (masked) and doctor **1152**. Every sticker shows
   **REF · LOT · SN**: the text printed under each barcode is "REF LOT SERIAL". One EnSite line is flagged **Check** because
   its sticker is torn on the sheet. Click **Confirm · 2 cases · 12 items** [ยืนยัน · 2 เคส · 12 รายการ].
5. Two cases are created, **C25002** and **C25003**, one per patient, and the Phayathai Sriracha consignment stock is deducted.
   Open C25002: each line shows its LOT and SN.
   *(Optional: **Scan** tab › Simulate scan a sticker such as "402570 11325569 184797" › REF / LOT / SN.)*

> **Reading for real:** without a server key the sample uses its pre-read transcription. A photo you upload is decoded **on the
> device** when its barcodes are sharp enough (a close-up, or a scanner-quality image). IMG_0027 as sent is too low-resolution
> for that, so the app says so. Set `ANTHROPIC_API_KEY` on the server to have Claude read the printed text and patient stickers
> from any photo; see README.

### 2. Sales admin quotes and emails (Tab B, ~1 min)
1. `/admin` dashboard: KPIs, cases by status, per-hospital table, expiring lots. C25002 is now in **Recent activity**.
2. **Cases** › **C25002**. The orange **Next step** panel says **Create quotation**.
3. The quotation form is prefilled: doc no `QT-2026-0NN`, contract prices, VAT 7%, total.
   *(Optional: set discount to 12% to show the "Pending manager approval" banner, then set it back to 0.)*
   Click **Save quotation**.
4. On the quotation page, **Download PDF** [ดาวน์โหลด PDF] and **Download Excel** [ดาวน์โหลด Excel] save `QT-2026-0NN.pdf` / `.xlsx`.
   Both carry a **LOT / SN** column so the hospital can reconcile the consignment. **Print** opens the A4 page. The quotation list has
   **Export list (Excel)**. **Send Email** shows a preview modal; click **Send now**.
   Toast: "Sent (simulated) · Hospital replied with PO BKH-PO-26-xxxx". The case is now **Waiting PO**.

### 3. Record the hospital PO (~40 s)
1. On the case page, **Next step › Record PO**, or **Hospital POs** in the sidebar.
2. Click **Scan** › pick the PYS-PO sample barcode (or type it) › the matched card appears › **Save PO** › **"PO saved"**.
   Try the `XYZ-PO-26-0000` sample to show **"PO not found"**.
3. Tab A: the rep's case timeline now shows *PO Received* ✓.

### 4. Requisition: approve and issue (~1 min)
1. Case page › **Next step › Create requisition**. It is prefilled with the case's items, reason "Used in case C25002",
   destination Phayathai Sriracha consignment, and the warehouse stock per line. Click **Submit request**.
2. Open **Approvals** › **Approve**. Only the Sales Manager decides: if you are another persona, the dialog says so, records the decision as **Wichai S. (Manager)** and switches you to that persona. You can also pick Wichai in the persona menu (top right) beforehand.
   (You can also approve inline on the case page.)
3. Case page › **Issue stock**. Stock is transferred from Main Warehouse to Bangkok consignment (FEFO). The case is **Requisitioned**.

### 5. Billing (~40 s)
1. Persona **Ratana (Accounting)** › **Billing** › *Ready to bill* › C25002 › **Issue invoice** (`INV-2026-NNNN`).
2. **Mark paid** › the case is **Closed**. Show it in Tab A: every step on the mobile timeline is green.

### 6. Traceability (~30 s)
- **Inventory** › search "Surpass" (or scan) › **Transaction History** shows `OUT · C25002` (usage) and
  `TRANSFER · RQ-2026-0NN` (replenishment). **Stock Details** shows the per-location and per-lot split with expiry warnings.
  **Usage History** lists every case that used it.
- Search `1245678980123` for **Paracetamol 500 mg**: 1,250 pcs, LOT2264A, ABC Pharma, GR-001 / OS-023 / PO-045.

### Extras if time allows
- **Purchase Requests**: "Suggested from reorder point" › Create PR › Approve › Create supplier PO › Receive goods (GR).
  The PR document has **Download PDF / Excel**.
- **New Usage** (v1 back-office flow): Select Hospital › Scan › PO no. › Review › Confirm.
- **Master Data**: CRUD for hospitals, doctors, products, suppliers, price lists and users (with hospital assignment).

**Recovery:** if anything goes sideways, use **Reset demo data**. The seed restores C25001 (Waiting PO, QT-2026-001) and
the next case number is C25002 again.

---

### Extras worth showing
- **Documents open over the app.** Quotation, requisition (ใบเบิก) and bill (บิล) open in an overlay above the phone or the back office:
  on the mobile case timeline use the **ดู / ใบเบิก / บิล** buttons; in the back office, any document link or **PDF** button.
  Inside the overlay: **Download PDF**, **Download Excel**, **Print**; close with ✕, a click outside, or Esc.
- **Barcode from a picture.** Scan screen › **เลือกจากคลังภาพ / From gallery** decodes every barcode in a chosen image
  (one: shown straight away; several: pick one). The **Search** tab has 📷 camera and 🖼 gallery buttons next to the field;
  a decoded or typed sticker such as `IBI-81102 11420679 180874` finds its product directly.
  On **New Case › Select › Scan** a gallery image with several stickers adds them all.
