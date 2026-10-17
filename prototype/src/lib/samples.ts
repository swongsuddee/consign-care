import type { SampleCode } from "@/components/Scanner";
import type { Data } from "./types";
import { gs1For } from "./selectors";

/** Sample product barcodes for "Simulate scan" */
export function productSamples(d: Data): SampleCode[] {
  const pick = ["p-se", "p-sa", "p-ct", "p-bl", "p-as", "p-pc"];
  const out: SampleCode[] = [];
  for (const id of pick) {
    const p = d.products.find((x) => x.id === id);
    if (!p) continue;
    const lot = d.lots.filter((l) => l.productId === id).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];
    out.push({
      label: p.name,
      code: id === "p-pc" ? p.gtin : lot ? gs1For(p.gtin, lot.lotNo, lot.expiryDate) : p.gtin,
      hint: id === "p-pc" ? "EAN-13" : "GS1-128",
    });
  }
  out.push({ label: "Unknown item", code: "8850000999999", hint: "✕" });
  return out;
}

/** Sample hospital PO barcodes: pending incoming POs + one unknown */
export function poSamples(d: Data): SampleCode[] {
  return [
    ...d.incomingPos.map((p) => ({
      label: `${p.poNo}`,
      code: p.poNo,
      hint: p.quotationNo,
    })),
    { label: "PO-UNKNOWN-0000", code: "XYZ-PO-26-0000", hint: "✕" },
  ];
}

/** Equipment stickers as printed by the hospital: "REF LOT SERIAL" (Phayathai Sriracha sheet) */
export function stickerSamples(): SampleCode[] {
  return [
    "ENSITE-SEK-5-I-01 11411683 183001",
    "402570 11325569 184797",
    "402811 11380356 190255",
    "401980 11445151 186685",
    "IBI-81102 11420679 180937",
    "401436 11534387 193084",
    "999999 12345678 000001",
  ].map((code, i, all) => ({ label: code.split(" ")[0], code, hint: i === all.length - 1 ? "✕" : "REF LOT SN" }));
}
