"use client";

import { bahtText, fmtDate, fmtMoney } from "@/lib/format";
import { cx } from "./ui";

export const COMPANY = {
  nameTh: "บริษัท คอนไซน์แคร์ เมดิคอล จำกัด",
  name: "ConsignCare Medical Co., Ltd.",
  address: "99/9 อาคารเมดิคอลทาวเวอร์ ชั้น 12 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310",
  addressEn: "99/9 Medical Tower, 12th Fl., Ratchadaphisek Rd., Huai Khwang, Bangkok 10310",
  taxId: "0105565012345",
  phone: "02-111-2200",
  email: "sales@consigncare.co.th",
};

export interface DocRow {
  code: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice?: number;
  extra?: string;
}

export interface DocProps {
  kind: "quotation" | "pr" | "invoice" | "requisition";
  no: string;
  date: string;
  partyLabel: { th: string; en: string };
  party: { name: string; address?: string; taxId?: string; contact?: string };
  meta: { th: string; en: string; value: string }[];
  rows: DocRow[];
  totals?: { subtotal: number; discount: number; discountPct: number; vat: number; total: number };
  remark?: string;
  signatures: { th: string; en: string; name?: string }[];
  extraColumn?: { th: string; en: string };
}

const THEME = {
  quotation: { color: "#1d4ed8", th: "ใบเสนอราคา", en: "QUOTATION" },
  invoice: { color: "#0f2d5c", th: "ใบแจ้งหนี้ / ใบกำกับภาษี", en: "INVOICE / TAX INVOICE" },
  pr: { color: "#16a34a", th: "ใบขอซื้อ", en: "PURCHASE REQUEST" },
  requisition: { color: "#7c3aed", th: "ใบเบิกสินค้า", en: "REQUISITION" },
};

/** A4 formal Thai business document */
export function DocumentSheet(p: DocProps) {
  const theme = THEME[p.kind];
  const minRows = Math.max(8 - p.rows.length, 0);
  return (
    <div className="doc-sheet relative mx-auto w-full max-w-[210mm] bg-white text-[12px] leading-relaxed text-slate-800 shadow-xl print:shadow-none">
      {p.kind === "pr" && <div className="absolute inset-y-0 left-0 w-2" style={{ background: theme.color }} />}
      <div className="px-[14mm] py-[12mm]">
        {/* header */}
        <div className="flex items-start justify-between gap-6 border-b-2 pb-4" style={{ borderColor: theme.color }}>
          <div className="flex items-start gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-white" style={{ background: theme.color }}>
              <svg viewBox="0 0 40 40" className="h-9 w-9">
                <path d="M11 21.5 17 27.5 29 13.5" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-bold">{COMPANY.nameTh}</p>
              <p className="font-semibold text-slate-600">{COMPANY.name}</p>
              <p className="text-[11px] text-slate-500">{COMPANY.address}</p>
              <p className="text-[11px] text-slate-500">
                เลขประจำตัวผู้เสียภาษี / Tax ID {COMPANY.taxId} · โทร {COMPANY.phone} · {COMPANY.email}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[22px] font-bold leading-tight" style={{ color: theme.color }}>
              {theme.th}
            </p>
            <p className="text-[12px] font-semibold tracking-widest text-slate-500">{theme.en}</p>
            <p className="mt-1 text-[10px] text-slate-400">ต้นฉบับ / Original</p>
          </div>
        </div>

        {/* party + meta */}
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-4">
          <div className="rounded-lg border border-slate-300 p-3">
            <p className="text-[11px] font-semibold text-slate-500">
              {p.partyLabel.th} / {p.partyLabel.en}
            </p>
            <p className="mt-1 font-semibold">{p.party.name}</p>
            {p.party.address && <p className="text-[11px] text-slate-600">{p.party.address}</p>}
            {p.party.taxId && <p className="text-[11px] text-slate-600">เลขประจำตัวผู้เสียภาษี / Tax ID: {p.party.taxId}</p>}
            {p.party.contact && <p className="text-[11px] text-slate-600">{p.party.contact}</p>}
          </div>
          <table className="self-start border border-slate-300 text-[11px]">
            <tbody>
              {[{ th: "เลขที่", en: "No.", value: p.no }, { th: "วันที่", en: "Date", value: fmtDate(p.date, "th") }, ...p.meta].map((m) => (
                <tr key={m.en} className="border-b border-slate-200 last:border-0">
                  <td className="whitespace-nowrap bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                    {m.th} / {m.en}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1 font-medium">{m.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* items */}
        <table className="mt-4 w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="text-white" style={{ background: theme.color }}>
              <th className="w-8 border border-slate-300 px-1 py-1.5">ลำดับ<br />No.</th>
              <th className="border border-slate-300 px-2 py-1.5">รหัสสินค้า<br />Code</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">รายการ<br />Description</th>
              {p.extraColumn && (
                <th className="border border-slate-300 px-2 py-1.5">
                  {p.extraColumn.th}
                  <br />
                  {p.extraColumn.en}
                </th>
              )}
              <th className="border border-slate-300 px-2 py-1.5">จำนวน<br />Qty</th>
              <th className="border border-slate-300 px-2 py-1.5">หน่วย<br />Unit</th>
              {p.totals && (
                <>
                  <th className="border border-slate-300 px-2 py-1.5">ราคา/หน่วย<br />Unit Price</th>
                  <th className="border border-slate-300 px-2 py-1.5">จำนวนเงิน<br />Amount</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r, i) => (
              <tr key={i} className="align-top">
                <td className="border-x border-slate-300 px-1 py-1.5 text-center">{i + 1}</td>
                <td className="border-x border-slate-300 px-2 py-1.5 font-mono text-[10px]">{r.code}</td>
                <td className="border-x border-slate-300 px-2 py-1.5">{r.name}</td>
                {p.extraColumn && <td className="border-x border-slate-300 px-2 py-1.5">{r.extra}</td>}
                <td className="border-x border-slate-300 px-2 py-1.5 text-right tabular-nums">{r.qty.toLocaleString()}</td>
                <td className="border-x border-slate-300 px-2 py-1.5 text-center">{r.unit}</td>
                {p.totals && (
                  <>
                    <td className="border-x border-slate-300 px-2 py-1.5 text-right tabular-nums">{fmtMoney(r.unitPrice ?? 0, "th")}</td>
                    <td className="border-x border-slate-300 px-2 py-1.5 text-right tabular-nums">{fmtMoney((r.unitPrice ?? 0) * r.qty, "th")}</td>
                  </>
                )}
              </tr>
            ))}
            {Array.from({ length: minRows }).map((_, i) => (
              <tr key={`f${i}`}>
                {Array.from({ length: 5 + (p.extraColumn ? 1 : 0) + (p.totals ? 2 : 0) }).map((__, k) => (
                  <td key={k} className="h-6 border-x border-slate-300" />
                ))}
              </tr>
            ))}
            <tr>
              <td colSpan={5 + (p.extraColumn ? 1 : 0) + (p.totals ? 2 : 0)} className="border-t border-slate-300" />
            </tr>
          </tbody>
        </table>

        {/* totals */}
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-4">
          <div className="space-y-2">
            {p.totals && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px]">
                <span className="font-semibold text-slate-500">ตัวอักษร / In words: </span>
                <span className="font-semibold">({bahtText(p.totals.total)})</span>
              </div>
            )}
            {p.remark && (
              <div className="text-[11px] text-slate-600">
                <span className="font-semibold">หมายเหตุ / Remark: </span>
                {p.remark}
              </div>
            )}
          </div>
          {p.totals && (
            <table className="text-[11px]">
              <tbody>
                {[
                  { l: "รวมเป็นเงิน / Subtotal", v: p.totals.subtotal },
                  { l: `ส่วนลด / Discount ${p.totals.discountPct}%`, v: p.totals.discount ? -p.totals.discount : 0 },
                  { l: "ยอดหลังหักส่วนลด / Net", v: p.totals.subtotal - p.totals.discount },
                  { l: "ภาษีมูลค่าเพิ่ม / VAT 7%", v: p.totals.vat },
                ].map((r) => (
                  <tr key={r.l}>
                    <td className="py-0.5 pr-4 text-slate-600">{r.l}</td>
                    <td className="py-0.5 text-right tabular-nums">{fmtMoney(r.v, "th")}</td>
                  </tr>
                ))}
                <tr className="text-[13px] font-bold" style={{ color: theme.color }}>
                  <td className="border-t-2 pt-1 pr-4" style={{ borderColor: theme.color }}>
                    จำนวนเงินรวมทั้งสิ้น / Total
                  </td>
                  <td className="border-t-2 pt-1 text-right tabular-nums" style={{ borderColor: theme.color }}>
                    {fmtMoney(p.totals.total, "th")}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* signatures */}
        <div className={cx("mt-10 grid gap-4", p.signatures.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {p.signatures.map((s) => (
            <div key={s.en} className="rounded-lg border border-slate-300 px-3 pb-3 pt-10 text-center text-[11px]">
              <div className="mx-auto mb-1 h-8 w-3/4 border-b border-dotted border-slate-400 text-[13px] italic text-slate-400" style={{ fontFamily: "cursive" }}>
                {s.name ?? ""}
              </div>
              <p className="font-semibold">{s.th}</p>
              <p className="text-slate-500">{s.en}</p>
              <p className="mt-1 text-slate-400">วันที่ / Date ......../......../........</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
