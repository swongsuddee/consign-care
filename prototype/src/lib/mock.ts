import type { ExtractedItem, Extraction } from "./extract";
import type { Data } from "./types";

/**
 * Mock usage for a demo without a camera: what reading a usage sheet would return, made up on the spot. 1-3 fictional
 * patients (surname ทดสอบ), each with a few items taken from what is really on the shelf at the hospital, so the
 * patient pages, stock cut and quotation all work on it. Nothing here comes from a real sheet.
 */
const TITLES = ["นาย", "นาง", "นางสาว"] as const;
const FIRST = {
  นาย: ["สมชาย", "ประเสริฐ", "วิชัย", "อนุชา", "กิตติพงษ์", "ณัฐวุฒิ", "ธีรพงษ์", "ศุภชัย"],
  นาง: ["มาลี", "วรรณา", "อรุณี", "ศิริพร", "พรทิพย์", "รัตนา"],
  นางสาว: ["สุดารัตน์", "ปิยะนุช", "กัญญารัตน์", "ณัฐธิดา", "สุภาวดี", "พิมพ์ชนก"],
};

const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const digits = (n: number) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0");

export function mockExtraction(d: Data, hospitalId: string, date: string): Extraction {
  const hospital = d.hospitals.find((h) => h.id === hospitalId);
  const locs = new Set(d.locations.filter((l) => l.hospitalId === hospitalId).map((l) => l.id));
  // units left on the shelf per lot, so the mock never uses more than the hospital holds
  const left = new Map<string, number>();
  for (const s of d.stock) if (locs.has(s.locationId) && s.qty > 0) left.set(s.lotId, (left.get(s.lotId) ?? 0) + s.qty);
  const doctors = d.doctors.filter((x) => x.hospitalIds.includes(hospitalId));

  const patients = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
    const title = pick(TITLES);
    const lots = [...left].filter(([, n]) => n > 0).map(([id]) => d.lots.find((l) => l.id === id)!).filter(Boolean);
    const chosen = lots.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
    const items: ExtractedItem[] = chosen.map((lot) => {
      const ref = d.products.find((p) => p.id === lot.productId)!.ref;
      const qty = Math.min(left.get(lot.id)!, 1 + Math.floor(Math.random() * 2));
      left.set(lot.id, left.get(lot.id)! - qty);
      const serialNo = `9${digits(5)}`;
      return { raw: `${ref} ${lot.lotNo} ${serialNo}`, ref, lotNo: lot.lotNo, serialNo, qty, confidence: Math.random() < 0.15 ? 0.86 : 0.95 + Math.random() * 0.04 };
    });
    const doctor = doctors.length ? pick(doctors) : undefined;
    return {
      hn: `HN-${digits(6)}`,
      an: `69-${digits(5)}`,
      name: `${title}${pick(FIRST[title])} ทดสอบ`,
      doctorId: doctor?.id,
      doctorCode: doctor?.code,
      items,
    };
  }).filter((p) => p.items.length);

  return { engine: "mock", hospitalName: hospital?.name, date, patients };
}
