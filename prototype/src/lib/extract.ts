"use client";

import { parseSticker } from "./selectors";
import type { CasePhoto } from "./types";

/**
 * Reads usage-sheet photos into patients and the stickers under each.
 *
 *   1. AI (Claude vision via /api/extract), when the server has a key.
 *   2. Otherwise barcodes are decoded on the device (zxing-wasm), then grouped
 *      into patients by the gaps between sticker rows.
 *   3. The bundled sample sheet is read from its known transcription, so the
 *      demo works offline.
 */

export interface ExtractedItem {
  raw: string;
  ref?: string;
  lotNo?: string;
  serialNo?: string;
  confidence?: number;
  /** units of this item; 1 when absent (one sticker is one unit) */
  qty?: number;
}
export interface ExtractedPatient {
  hn?: string;
  an?: string;
  doctorCode?: string;
  items: ExtractedItem[];
}
export type Engine = "ai" | "barcode" | "sample" | "none";
export interface Extraction {
  engine: Engine;
  hospitalName?: string;
  date?: string;
  patients: ExtractedPatient[];
  model?: string;
}

export const SAMPLE_EP = "/samples/ep-usage-sheet.jpg";

/** Full-resolution originals for this session (not persisted: localStorage keeps a small copy). */
export const originals = new Map<string, Blob>();

const item = (raw: string, confidence = 0.97): ExtractedItem => ({ raw, confidence, ...parseSticker(raw) });

/** Transcription of the bundled sample (patient names were redacted from the image). */
const SAMPLE: Extraction = {
  engine: "sample",
  hospitalName: "Phayathai Sriracha",
  date: "2026-10-17",
  patients: [
    {
      hn: "●●-●●●●●",
      an: "●●-●●●●●",
      doctorCode: "1152",
      items: [
        item("ENSITE-SEK-5-I-01 11411683 182998"),
        item("402570 11325569 184796"),
        item("402811 11380356 188396"),
        item("401980 11445151 186684"),
        item("IBI-81102 11420679 180874"),
        item("401436 11534387 193082"),
      ],
    },
    {
      hn: "●●-●●●●●",
      an: "●●-●●●●●",
      doctorCode: "1152",
      items: [
        item("401436 11534387 193083"),
        item("ENSITE-SEK-5-I-01 11411683 182999", 0.86), // first letters torn on the sheet
        item("IBI-81102 11420679 180936"),
        item("401980 11445151 186682"),
        item("402811 11380356 190254"),
        item("402570 11325569 184795"),
      ],
    },
  ],
};

async function photoBlob(p: CasePhoto): Promise<Blob | undefined> {
  const o = originals.get(p.id);
  if (o) return o;
  if (p.url.startsWith("data:") || p.url.startsWith("/")) return (await fetch(p.url)).blob();
  return undefined;
}

/** Keep uploads under the API's image limits: longest side 2000px, JPEG. */
async function forUpload(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  if (scale === 1 && blob.type === "image/jpeg" && blob.size < 4_500_000) return blob;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? blob), "image/jpeg", 0.9));
}

async function viaAi(blob: Blob): Promise<Extraction | null> {
  const form = new FormData();
  form.append("image", await forUpload(blob), "sheet.jpg");
  const r = await fetch("/api/extract", { method: "POST", body: form }).catch(() => null);
  if (!r || !r.ok) return null;
  const j = await r.json();
  return {
    engine: "ai",
    hospitalName: j.hospitalName ?? undefined,
    date: j.date ?? undefined,
    model: j.model,
    patients: (j.patients ?? []).map((p: { hn: string | null; an: string | null; doctorCode: string | null; items: { text: string; ref: string; lot: string; serial: string; confidence: number }[] }) => ({
      hn: p.hn ?? undefined,
      an: p.an ?? undefined,
      doctorCode: p.doctorCode ?? undefined,
      items: p.items.map((i) => ({ raw: i.text, ref: i.ref.toUpperCase(), lotNo: i.lot, serialNo: i.serial, confidence: i.confidence })),
    })),
  };
}

let zxingReady: Promise<typeof import("zxing-wasm/reader")> | null = null;
function zxing() {
  zxingReady ??= import("zxing-wasm/reader").then((m) => {
    m.prepareZXingModule({
      overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? "/wasm/zxing_reader.wasm" : prefix + path) },
    });
    return m;
  });
  return zxingReady;
}

/** Every barcode in an image, top to bottom, decoded on the device. */
export async function decodeBarcodes(blob: Blob): Promise<{ text: string; y: number }[]> {
  const { readBarcodes } = await zxing();
  const bmp = await createImageBitmap(blob);
  // a shared or downsized photo (~1000 px wide) leaves sticker bars about 1 px wide, too thin to read;
  // reading it again enlarged recovers most of them, so small photos are read at several sizes and the results merged
  const scales = Math.max(bmp.width, bmp.height) < 2000 ? [1, 2.5, 3] : [1];
  const out: { text: string; y: number }[] = [];
  for (const s of scales) {
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    const g = c.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(bmp, 0, 0, c.width, c.height);
    const found = await readBarcodes(g.getImageData(0, 0, c.width, c.height), {
      formats: ["Code128", "Code39", "DataMatrix", "QRCode", "EAN-13", "ITF"],
      maxNumberOfSymbols: 60,
      tryHarder: true,
    });
    for (const r of found) {
      const text = r.text.trim();
      const y = (r.position.topLeft.y + r.position.bottomLeft.y) / 2 / s;
      // the same sticker read at another size: same text at about the same height
      if (text && !out.some((o) => o.text === text && Math.abs(o.y - y) < 20)) out.push({ text, y });
    }
  }
  bmp.close();
  return out.sort((a, b) => a.y - b.y);
}

/**
 * Decode every barcode in the photo, then split into patients where the vertical gap between stickers jumps,
 * or where a REF repeats (one patient does not get the same device twice; this also holds when unread stickers
 * leave gaps of every size).
 */
async function viaBarcodes(blob: Blob): Promise<Extraction> {
  const rows = await decodeBarcodes(blob);
  const gaps = rows.slice(1).map((r, i) => r.y - rows[i].y);
  const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0;
  const patients: ExtractedPatient[] = [];
  rows.forEach((r, i) => {
    const it = item(r.text, 1);
    const cur = patients[patients.length - 1];
    const repeat = cur?.items.some((x) => x.ref && x.ref === it.ref);
    if (!cur || repeat || (rows.length >= 3 && gaps[i - 1] > median * 1.8)) patients.push({ items: [] });
    patients[patients.length - 1].items.push(it);
  });
  return { engine: rows.length ? "barcode" : "none", patients };
}

/** Combine the readings of several photos into one: patients in photo order, first hospital and date found. */
export function merge(list: Extraction[]): Extraction {
  const out: Extraction = { engine: "none", patients: [] };
  const engines = new Set<Engine>();
  for (const r of list) {
    engines.add(r.engine);
    out.hospitalName ??= r.hospitalName;
    out.date ??= r.date;
    out.model ??= r.model;
    out.patients.push(...r.patients.filter((x) => x.items.length));
  }
  out.engine = engines.has("ai") ? "ai" : engines.has("barcode") ? "barcode" : engines.has("sample") ? "sample" : "none";
  return out;
}

/** Read one photo: the bundled sample from its transcription, else AI when available, else on-device barcodes. */
export async function extractOne(p: CasePhoto, opts: { ai: boolean }): Promise<Extraction> {
  if (p.url === SAMPLE_EP) return structuredClone(SAMPLE);
  const blob = await photoBlob(p);
  if (!blob) return { engine: "none", patients: [] };
  let r: Extraction | null = null;
  if (opts.ai) r = await viaAi(blob);
  r ??= await viaBarcodes(blob).catch(() => null);
  return r ?? { engine: "none", patients: [] };
}

export async function extract(photos: CasePhoto[], opts: { ai: boolean }): Promise<Extraction> {
  return merge(await Promise.all(photos.map((p) => extractOne(p, opts))));
}

export async function aiAvailable(): Promise<boolean> {
  const r = await fetch("/api/extract").catch(() => null);
  return !!r?.ok && !!(await r.json()).ai;
}
