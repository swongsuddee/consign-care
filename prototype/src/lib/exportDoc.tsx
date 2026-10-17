"use client";

import { createRoot } from "react-dom/client";
import { COMPANY, DocumentSheet, type DocProps } from "@/components/DocumentSheet";

/** Files a hospital can be sent as-is: an A4 PDF and an Excel workbook of the same document. */

const TITLE: Record<DocProps["kind"], string> = {
  quotation: "ใบเสนอราคา / QUOTATION",
  invoice: "ใบแจ้งหนี้ / INVOICE",
  pr: "ใบขอซื้อ / PURCHASE REQUEST",
  requisition: "ใบเบิกสินค้า / REQUISITION",
};

const A4_W = 794; // 210 mm at 96 dpi

/** Render the document sheet off-screen and save it as a real PDF file (Thai text kept as the browser draws it). */
export async function downloadDocPdf(doc: DocProps) {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_W}px;background:#fff;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(<DocumentSheet {...doc} />);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await document.fonts.ready;
    const node = host.firstElementChild as HTMLElement;
    const png = await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff", width: A4_W, style: { boxShadow: "none" } });
    const img = new Image();
    img.src = png;
    await img.decode();

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    pdf.setProperties({ title: `${doc.no} – ${TITLE[doc.kind]}`, creator: "ConsignCare" });
    const pageW = 210;
    const pageH = 297;
    const h = (img.height * pageW) / img.width;
    for (let y = 0, page = 0; y < h - 0.5; y += pageH, page++) {
      if (page) pdf.addPage();
      pdf.addImage(png, "PNG", 0, -y, pageW, h, undefined, "FAST");
    }
    pdf.save(`${doc.no}.pdf`);
  } finally {
    root.unmount();
    host.remove();
  }
}

/** A formatted workbook: header block, item table and totals, with live formulas over the stored values. */
export async function downloadDocExcel(doc: DocProps) {
  const XLSX = await import("xlsx");
  const extra = doc.extraColumn;
  const head = ["No.", "Code / REF", "Description", ...(extra ? [extra.en] : []), "Qty", "Unit", "Unit price (THB)", "Amount (THB)"];
  const qtyCol = extra ? 4 : 3;
  const priceCol = qtyCol + 2;
  const amtCol = qtyCol + 3;
  const A = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

  const rows: (string | number | null)[][] = [
    [`${COMPANY.nameTh} · ${COMPANY.name}`],
    [TITLE[doc.kind]],
    [],
    ["Document no.", doc.no, null, "Date", doc.date.split("-").reverse().join("/")],
    [doc.partyLabel.en, doc.party.name],
    ...(doc.party.address ? [["Address", doc.party.address]] : []),
    ...(doc.party.taxId ? [["Tax ID", doc.party.taxId]] : []),
    ...doc.meta.map((m) => [m.en, m.value]),
    [],
    head,
  ];
  const formulas: { r: number; c: number; f: string }[] = [];
  const first = rows.length; // 0-based row of the first item
  doc.rows.forEach((r, i) => {
    const row = first + i;
    const amount = (r.unitPrice ?? 0) * r.qty;
    rows.push([i + 1, r.code, r.name, ...(extra ? [(r.extra ?? "").replace(/\n/g, "; ")] : []), r.qty, r.unit, r.unitPrice ?? 0, amount]);
    formulas.push({ r: row, c: amtCol, f: `${A(row, qtyCol)}*${A(row, priceCol)}` });
  });
  const money: { r: number; c: number }[] = [];
  if (doc.totals) {
    const t = doc.totals;
    rows.push([]);
    const pad = (label: string, v: number) => [...Array(amtCol - 1).fill(null), label, v];
    const sub = rows.length;
    rows.push(pad("Subtotal", t.subtotal));
    rows.push(pad(`Discount ${t.discountPct}%`, -t.discount));
    rows.push(pad("VAT 7%", t.vat));
    rows.push(pad("Grand total", t.total));
    formulas.push({ r: sub, c: amtCol, f: `SUM(${A(first, amtCol)}:${A(first + doc.rows.length - 1, amtCol)})` });
    formulas.push({ r: sub + 2, c: amtCol, f: `ROUND((${A(sub, amtCol)}+${A(sub + 1, amtCol)})*0.07,2)` });
    formulas.push({ r: sub + 3, c: amtCol, f: `${A(sub, amtCol)}+${A(sub + 1, amtCol)}+${A(sub + 2, amtCol)}` });
    for (let k = 0; k < 4; k++) money.push({ r: sub + k, c: amtCol });
  }
  if (doc.remark) rows.push([], ["Remark", doc.remark]);
  rows.push([], doc.signatures.map((s) => `${s.en}: ${s.name ?? "________________"}`));

  const ws = XLSX.utils.aoa_to_sheet(rows);
  for (const { r, c, f } of formulas) ws[A(r, c)].f = f; // value stays cached, so viewers without recalculation still show it
  for (let r = first; r < first + doc.rows.length; r++) money.push({ r, c: priceCol }, { r, c: amtCol });
  for (const { r, c } of money) if (ws[A(r, c)]) ws[A(r, c)].z = "#,##0.00";
  ws["!cols"] = head.map((_, i) => ({ wch: i === 2 ? 38 : i === 0 ? 6 : extra && i === 3 ? 30 : 16 }));
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: amtCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: amtCol } },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, doc.no.slice(0, 31));
  XLSX.writeFile(wb, `${doc.no}.xlsx`);
}
