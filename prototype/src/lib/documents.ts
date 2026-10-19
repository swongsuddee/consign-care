import type { DocProps } from "@/components/DocumentSheet";
import { translate } from "@/i18n";
import { casePo } from "./selectors";
import { totals } from "./ops";
import type { Data } from "./types";

const unitTh = (u: string) => translate("th", `unit.${u}`);

/** "LOT 11411683 · SN 182998" for each unit of a product used in the case */
function lotSerials(d: Data, caseId: string, productId: string) {
  return d.usage
    .filter((u) => u.caseId === caseId && u.productId === productId)
    .map((u) => {
      const lot = d.lots.find((l) => l.id === u.lotId)?.lotNo;
      return [lot && `LOT ${lot}`, u.serialNo && `SN ${u.serialNo}`].filter(Boolean).join(" · ");
    })
    .filter(Boolean)
    .join("\n");
}

export function quotationDoc(d: Data, id: string): DocProps | null {
  const q = d.quotations.find((x) => x.id === id);
  if (!q) return null;
  const h = d.hospitals.find((x) => x.id === q.hospitalId);
  const c = d.cases.find((x) => x.id === q.caseId);
  const creator = d.users.find((u) => u.id === q.createdBy);
  return {
    kind: "quotation",
    no: q.no,
    date: q.date,
    partyLabel: { th: "ลูกค้า", en: "Customer" },
    party: { name: `${h?.nameTh ?? ""} (${h?.name ?? ""})`, address: h?.address, taxId: h?.taxId, contact: `ฝ่ายจัดซื้อ / Purchasing · ${h?.contactEmail ?? ""}` },
    meta: [
      { th: "ยืนราคาถึง", en: "Valid until", value: q.validUntil.split("-").reverse().join("/") },
      ...(c ? [{ th: "อ้างอิงเคส", en: "Case ref.", value: c.no }] : []),
      { th: "เงื่อนไขชำระ", en: "Credit term", value: "30 วัน / days" },
    ],
    rows: q.items.map((it) => {
      const p = d.products.find((x) => x.id === it.productId);
      return { code: p?.ref ?? "", name: p?.name ?? "", unit: unitTh(it.unit), qty: it.qty, unitPrice: it.unitPrice, extra: c ? lotSerials(d, c.id, it.productId) : undefined };
    }),
    // consignment is reconciled by lot and serial, so the hospital sees exactly which units were used
    extraColumn: c && d.usage.some((u) => u.caseId === c.id) ? { th: "LOT / SN", en: "LOT / SN" } : undefined,
    totals: { subtotal: q.subtotal, discount: q.discount, discountPct: q.discountPct, vat: q.vat, total: q.total },
    remark: q.note || "ราคาตามสัญญาโรงพยาบาล สินค้าฝากขาย (Consignment) ใช้ในหัตถการแล้ว",
    signatures: [
      { th: "ผู้จัดทำ", en: "Prepared by", name: creator?.name },
      { th: "ผู้รับใบเสนอราคา", en: "Accepted by (Customer)" },
    ],
  };
}

export function prDoc(d: Data, id: string): DocProps | null {
  const pr = d.purchaseRequests.find((x) => x.id === id);
  if (!pr) return null;
  const s = d.suppliers.find((x) => x.id === pr.supplierId);
  const req = d.users.find((u) => u.id === pr.requesterId);
  const items = pr.items.map((i) => ({ productId: i.productId, unit: "", qty: i.qty, unitPrice: i.unitPrice }));
  const t = totals(items, 0);
  return {
    kind: "pr",
    no: pr.no,
    date: pr.createdAt.slice(0, 10),
    partyLabel: { th: "ผู้จำหน่ายที่แนะนำ", en: "Suggested supplier" },
    party: { name: s?.name ?? "-", taxId: s?.taxId, contact: `${s?.email ?? ""} · ${s?.phone ?? ""}` },
    meta: [
      { th: "ผู้ขอซื้อ", en: "Requested by", value: req?.name ?? "-" },
      { th: "ต้องการภายใน", en: "Needed by", value: pr.neededBy.split("-").reverse().join("/") },
      ...(pr.supplierPoNo ? [{ th: "ใบสั่งซื้อ", en: "Supplier PO", value: pr.supplierPoNo }] : []),
    ],
    rows: pr.items.map((it) => {
      const p = d.products.find((x) => x.id === it.productId);
      return { code: p?.ref ?? "", name: p?.name ?? "", unit: unitTh(p?.unit ?? "piece"), qty: it.qty, unitPrice: it.unitPrice };
    }),
    totals: { subtotal: t.subtotal, discount: 0, discountPct: 0, vat: t.vat, total: t.total },
    remark: pr.note,
    signatures: [
      { th: "ผู้ขอซื้อ", en: "Requested by", name: req?.name },
      { th: "ผู้อนุมัติ", en: "Approved by", name: pr.approvedBy ? d.users.find((u) => u.id === pr.approvedBy)?.name : undefined },
      { th: "ฝ่ายจัดซื้อ", en: "Purchasing" },
    ],
  };
}

export function invoiceDoc(d: Data, id: string): DocProps | null {
  const inv = d.invoices.find((x) => x.id === id);
  if (!inv) return null;
  const h = d.hospitals.find((x) => x.id === inv.hospitalId);
  const c = d.cases.find((x) => x.id === inv.caseId);
  const q = d.quotations.find((x) => x.caseId === inv.caseId && x.status !== "REJECTED");
  const po = c ? casePo(d, c.id) : undefined;
  const rows = (q?.items ?? []).map((it) => {
    const p = d.products.find((x) => x.id === it.productId);
    return { code: p?.ref ?? "", name: p?.name ?? "", unit: unitTh(it.unit), qty: it.qty, unitPrice: it.unitPrice };
  });
  return {
    kind: "invoice",
    no: inv.no,
    date: inv.issueDate,
    partyLabel: { th: "ลูกค้า", en: "Bill to" },
    party: { name: `${h?.nameTh ?? ""} (${h?.name ?? ""})`, address: h?.address, taxId: h?.taxId },
    meta: [
      { th: "ครบกำหนด", en: "Due date", value: inv.dueDate.split("-").reverse().join("/") },
      ...(po ? [{ th: "อ้างอิง PO", en: "PO ref.", value: po.poNo }] : []),
      ...(c ? [{ th: "อ้างอิงเคส", en: "Case ref.", value: c.no }] : []),
    ],
    rows,
    totals: q ? { subtotal: q.subtotal, discount: q.discount, discountPct: q.discountPct, vat: q.vat, total: q.total } : undefined,
    signatures: [
      { th: "ผู้รับวางบิล", en: "Received by" },
      { th: "ผู้วางบิล", en: "Issued by", name: "Ratana" },
    ],
  };
}

export function requisitionDoc(d: Data, id: string): DocProps | null {
  const r = d.requisitions.find((x) => x.id === id);
  if (!r) return null;
  const dep = d.departments.find((x) => x.id === r.departmentId);
  const h = d.hospitals.find((x) => x.id === r.hospitalId);
  const req = d.users.find((u) => u.id === r.requesterId);
  return {
    kind: "requisition",
    no: r.no,
    date: r.createdAt.slice(0, 10),
    partyLabel: { th: "หน่วยงานที่ขอเบิก", en: "Department" },
    party: { name: `${dep?.nameTh ?? ""} (${dep?.name ?? ""})`, contact: h ? `ปลายทาง / Destination: คลังฝากขาย ${h.nameTh}` : undefined },
    meta: [{ th: "ผู้ขอเบิก", en: "Requested by", value: req?.name ?? "-" }],
    rows: r.items.map((it) => {
      const p = d.products.find((x) => x.id === it.productId);
      return { code: p?.ref ?? "", name: p?.name ?? "", unit: unitTh(p?.unit ?? "piece"), qty: it.qty, extra: it.reason };
    }),
    extraColumn: { th: "เหตุผล", en: "Reason" },
    remark: r.purpose,
    signatures: [
      { th: "ผู้ขอเบิก", en: "Requested by", name: req?.name },
      { th: "ผู้อนุมัติ", en: "Approved by", name: r.approvedBy ? d.users.find((u) => u.id === r.approvedBy)?.name : undefined },
      { th: "ผู้จ่ายของ", en: "Issued by", name: r.status === "ISSUED" ? "Pim" : undefined },
    ],
  };
}

export function docFor(d: Data, kind: string, id: string) {
  if (kind === "quotation") return quotationDoc(d, id);
  if (kind === "pr") return prDoc(d, id);
  if (kind === "invoice") return invoiceDoc(d, id);
  if (kind === "requisition") return requisitionDoc(d, id);
  return null;
}
