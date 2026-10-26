import type { ExtractedItem, ExtractedPatient } from "./extract";
import { parseSticker } from "./selectors";

/**
 * Split the barcodes read from one usage-sheet photo into patients and their equipment.
 *
 * A sheet can hold several patients. Each patient has a hospital sticker with the HN / AN (often as a barcode), and
 * the equipment stickers used on that patient are stuck below it. So, in reading order (column by column, top to
 * bottom), every patient code starts a new patient and the equipment after it belongs to that patient.
 *
 * When the photo has no patient barcode at all (the patient label is printed text only), the split falls back to the
 * layout: a bigger vertical gap between stickers, or a REF that repeats (one patient does not get the same device twice).
 */

/** One barcode found in the photo; x / y are its centre and w / h its size, in image pixels. */
export interface SheetCode {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PatientCode {
  hn?: string;
  an?: string;
}

const NUM = "([0-9]+(?:[-/][0-9]+)?)";
const HN_RE = new RegExp(`\\bHN\\s*[:#.\\-]?\\s*${NUM}`, "i");
const AN_RE = new RegExp(`\\bAN\\s*[:#.\\-]?\\s*${NUM}`, "i");
/** a bare hospital number, year-sequence, as printed on Thai patient stickers: "65-20026" */
const BARE_HN = /^[0-9]{2}-[0-9]{4,7}$/;

/** Read a patient sticker's barcode: "HN:65-20026 AN:69-19920", "HN-640112", "65-20026" or {"hn":…,"an":…}. */
export function parsePatientCode(raw: string): PatientCode | null {
  const text = raw.trim();
  if (text.startsWith("{")) {
    try {
      const j = JSON.parse(text) as Record<string, unknown>;
      const hn = j.hn ?? j.HN;
      const an = j.an ?? j.AN;
      if (hn || an) return { hn: hn ? String(hn) : undefined, an: an ? String(an) : undefined };
    } catch {
      /* not JSON: read it as text below */
    }
  }
  const hn = text.match(HN_RE)?.[1];
  const an = text.match(AN_RE)?.[1];
  if (hn || an) return { hn, an };
  if (BARE_HN.test(text)) return { hn: text };
  return null;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

/** Column by column (left to right), top to bottom within a column. Stickers count as one column unless far apart. */
export function readingOrder(codes: SheetCode[]): SheetCode[] {
  if (codes.length < 2) return [...codes];
  const gap = (median(codes.map((c) => c.w)) || 1) * 0.75;
  const columns: SheetCode[][] = [];
  for (const c of [...codes].sort((a, b) => a.x - b.x)) {
    const col = columns[columns.length - 1];
    if (col && c.x - col[col.length - 1].x < gap) col.push(c);
    else columns.push([c]);
  }
  return columns.flatMap((col) => col.sort((a, b) => a.y - b.y));
}

const equipment = (raw: string): ExtractedItem => ({ raw, confidence: 1, ...parseSticker(raw) });

export function groupByPatient(codes: SheetCode[]): ExtractedPatient[] {
  const ordered = readingOrder(codes);
  if (!ordered.some((c) => parsePatientCode(c.text))) return splitByLayout(ordered);

  const patients: (ExtractedPatient & { fromCode: boolean })[] = [];
  let cur: (typeof patients)[number] | undefined;
  for (const c of ordered) {
    const pt = parsePatientCode(c.text);
    if (pt) {
      // HN and AN printed as two barcodes on one sticker: the second one completes the patient just started
      if (cur?.fromCode && !cur.items.length && ((pt.hn && !cur.hn && !pt.an) || (pt.an && !cur.an && !pt.hn))) {
        cur.hn ??= pt.hn;
        cur.an ??= pt.an;
        continue;
      }
      // the same patient's sticker seen again further down the sheet: keep adding to that patient
      const same = patients.find((p) => p.fromCode && ((pt.hn && p.hn === pt.hn) || (pt.an && p.an === pt.an)));
      cur = same ?? { hn: pt.hn, an: pt.an, items: [], fromCode: true };
      if (!same) patients.push(cur);
      continue;
    }
    // equipment above the first patient sticker has no patient yet; it stays a group of its own for the rep to assign
    if (!cur) {
      cur = { items: [], fromCode: false };
      patients.push(cur);
    }
    if (!cur.items.some((it) => it.raw === c.text)) cur.items.push(equipment(c.text));
  }
  return patients.filter((p) => p.items.length).map((p) => ({ hn: p.hn, an: p.an, items: p.items }));
}

/** Top to bottom, split where the vertical gap between stickers jumps or a REF repeats; ignores patient barcodes. */
export function groupByLayout(codes: SheetCode[]): ExtractedPatient[] {
  return splitByLayout([...codes].sort((a, b) => a.y - b.y));
}

/** No patient barcode: split where the vertical gap between stickers jumps, or where a REF repeats. */
function splitByLayout(ordered: SheetCode[]): ExtractedPatient[] {
  const gaps = ordered.slice(1).map((c, i) => c.y - ordered[i].y);
  const typical = median(gaps.filter((g) => g > 0));
  const patients: ExtractedPatient[] = [];
  ordered.forEach((c, i) => {
    const it = equipment(c.text);
    const cur = patients[patients.length - 1];
    const repeat = cur?.items.some((x) => x.ref && x.ref === it.ref);
    // a negative gap means a new column started
    const jump = i > 0 && ordered.length >= 3 && (gaps[i - 1] < 0 || gaps[i - 1] > typical * 1.8);
    if (!cur || repeat || jump) patients.push({ items: [] });
    patients[patients.length - 1].items.push(it);
  });
  return patients;
}
