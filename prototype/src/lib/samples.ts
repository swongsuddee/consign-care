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
    "MAP-KIT-3-01 21005803 560115",
    "410105 21004417 560123",
    "410212 21005582 560137",
    "410320 21006139 560144",
    "ABL-20511 21005906 560160",
    "410438 21007264 560168",
    "999999 12345678 000001",
  ].map((code, i, all) => ({ label: code.split(" ")[0], code, hint: i === all.length - 1 ? "✕" : "REF LOT SN" }));
}
