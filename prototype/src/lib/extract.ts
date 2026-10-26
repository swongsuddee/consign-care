"use client";

import { flags } from "./flags";
import { groupByLayout, groupByPatient, type SheetCode } from "./patients";
import type { CasePhoto } from "./types";
import { asset, STATIC_SITE } from "./base";

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
  /** only mock data carries a (fictional) name and doctor; the photo readers never return a name */
  name?: string;
  doctorId?: string;
  doctorCode?: string;
  items: ExtractedItem[];
}
/** how a reading was made; "mock" is made-up demo data (lib/mock.ts), "sample" a drawn sample sheet */
export type Engine = "ai" | "barcode" | "sample" | "mock" | "none";
export interface Extraction {
  engine: Engine;
  hospitalName?: string;
  date?: string;
  patients: ExtractedPatient[];
  model?: string;
}


/** Full-resolution originals for this session (not persisted: localStorage keeps a small copy). */
export const originals = new Map<string, Blob>();

async function photoBlob(p: CasePhoto): Promise<Blob | undefined> {
  const o = originals.get(p.id);
  if (o) return o;
  if (p.url.startsWith("data:") || p.url.startsWith("/")) return (await fetch(asset(p.url))).blob();
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
  if (STATIC_SITE) return null;
  const r = await fetch(asset("/api/extract"), { method: "POST", body: form }).catch(() => null);
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
      overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? asset("/wasm/zxing_reader.wasm") : prefix + path) },
    });
    return m;
  });
  return zxingReady;
}

/** Every barcode in an image, top to bottom, decoded on the device, with where it sits in the photo. */
export async function decodeBarcodes(blob: Blob): Promise<SheetCode[]> {
  const { readBarcodes } = await zxing();
  const bmp = await createImageBitmap(blob);
  // a shared or downsized photo (~1000 px wide) leaves sticker bars about 1 px wide, too thin to read;
  // reading it again enlarged recovers most of them, so small photos are read at several sizes and the results merged
  const scales = Math.max(bmp.width, bmp.height) < 2000 ? [1, 2.5, 3] : [1];
  const out: SheetCode[] = [];
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
      const { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br } = r.position;
      const x = (tl.x + tr.x + bl.x + br.x) / 4 / s;
      const y = (tl.y + tr.y + bl.y + br.y) / 4 / s;
      const w = Math.hypot(tr.x - tl.x, tr.y - tl.y) / s;
      const h = Math.hypot(bl.x - tl.x, bl.y - tl.y) / s;
      // the same sticker read at another size: same text at about the same place
      if (text && !out.some((o) => o.text === text && Math.abs(o.y - y) < 20 && Math.abs(o.x - x) < 40)) out.push({ text, x, y, w, h });
    }
  }
  bmp.close();
  return out.sort((a, b) => a.y - b.y);
}

/** Decode every barcode in the photo, then split it into patients and their equipment (lib/patients.ts; flags.patientBarcodes). */
async function viaBarcodes(blob: Blob): Promise<Extraction> {
  const codes = await decodeBarcodes(blob);
  return { engine: codes.length ? "barcode" : "none", patients: flags.patientBarcodes ? groupByPatient(codes) : groupByLayout(codes) };
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
  out.engine = engines.has("ai") ? "ai" : engines.has("barcode") ? "barcode" : engines.has("mock") ? "mock" : engines.has("sample") ? "sample" : "none";
  return out;
}

/** Read one photo: AI when available, else on-device barcodes. */
export async function extractOne(p: CasePhoto, opts: { ai: boolean }): Promise<Extraction> {
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
  if (STATIC_SITE) return false;
  const r = await fetch(asset("/api/extract")).catch(() => null);
  return !!r?.ok && !!(await r.json()).ai;
}
