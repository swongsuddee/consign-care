"use client";

import { AlertTriangle, Camera, CheckCircle2, ChevronLeft, ChevronRight, Dices, Download, Plus, ScanLine, Search, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PhotoThumb, ProductArt } from "@/components/art";
import { Stepper } from "@/components/mobile/EquipmentSheet";
import { MScreen } from "@/components/mobile/MScreen";
import { ScannerView } from "@/components/Scanner";
import { toast } from "@/components/toast";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Tabs, cx } from "@/components/ui";
import { useT } from "@/i18n";
import * as ops from "@/lib/ops";
import { aiAvailable, extract, merge, originals, type Engine, type ExtractedItem } from "@/lib/extract";
import { captured, saveToGallery } from "@/lib/photos";
import { stickerSamples } from "@/lib/samples";
import { OCR_TEMPLATES } from "@/lib/seed";
import { name, parseBarcode, parseSticker } from "@/lib/selectors";
import { useData, useOp, useStore } from "@/lib/store";
import type { Data } from "@/lib/types";

interface Line {
  key: string;
  raw: string;
  productId?: string;
  lotId?: string;
  lotNo?: string;
  serialNo?: string;
  qty: number;
  checked: boolean;
  confidence?: number;
  source: "OCR" | "SCAN" | "MANUAL";
}

interface Group {
  key: string;
  hn: string;
  an: string;
  patientName: string;
  doctorId: string;
  lines: Line[];
}

const STEPS = ["m.ocr.s1", "m.ocr.s2", "m.ocr.s3"];

/** Find the hospital named on the sheet: every significant word of our hospital name must appear. */
function matchHospital(d: Data, written?: string) {
  if (!written) return undefined;
  const w = written.toLowerCase().replace(/[^a-z0-9ก-๙ ]/g, " ");
  const norm = (s: string) => s.toLowerCase().replace(/hospital|โรงพยาบาล/g, "").replace(/[^a-z0-9ก-๙ ]/g, " ").split(/\s+/).filter(Boolean);
  return d.hospitals.find((h) => {
    const words = norm(h.name);
    const alt = words.map((x) => x.replace("phyathai", "phayathai"));
    return words.every((x, i) => w.includes(x) || w.includes(alt[i])) || norm(h.nameTh).every((x) => w.includes(x));
  });
}

function toLine(d: Data, it: ExtractedItem, source: Line["source"], key: string): Line {
  const parsed = it.ref ? { ref: it.ref, lotNo: it.lotNo, serialNo: it.serialNo } : parseSticker(it.raw);
  let productId: string | undefined;
  let lotId: string | undefined;
  if (parsed?.ref) {
    const p = d.products.find((x) => x.ref.toUpperCase() === parsed.ref!.toUpperCase());
    productId = p?.id;
    lotId = p ? d.lots.find((l) => l.productId === p.id && l.lotNo === parsed.lotNo)?.id : undefined;
  } else {
    const r = parseBarcode(d, it.raw);
    productId = r.product?.id;
    lotId = r.lot?.id;
  }
  return {
    key,
    raw: it.raw,
    productId,
    lotId,
    lotNo: parsed?.lotNo,
    serialNo: parsed?.serialNo,
    qty: it.qty ?? 1,
    checked: !!productId,
    confidence: it.confidence,
    source,
  };
}

export default function OcrReviewPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const d = useData();
  const run = useOp();
  const [draft] = useState(() => useStore.getState().ocrDraft);
  const setDraft = useStore((s) => s.setOcrDraft);
  const [phase, setPhase] = useState(0);
  const [engine, setEngine] = useState<Engine>("none");
  const [model, setModel] = useState<string>();
  const [hospitalId, setHospitalId] = useState(draft?.hospitalId ?? "");
  const [hospitalRead, setHospitalRead] = useState<string>();
  const [caseDate, setCaseDate] = useState(draft?.caseDate ?? ops.DEMO_TODAY);
  const [groups, setGroups] = useState<Group[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(-1);
  const [shotsSaved, setShotsSaved] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draft) return;
    let alive = true;
    const t1 = setTimeout(() => alive && setPhase(1), 500);
    (async () => {
      const ai = await aiAvailable();
      const cached = draft.extracted ?? {};
      const real = draft.photos.filter((p) => !p.url.startsWith("sample-") || cached[p.id]);
      const ex = merge([...(draft.mock ? [draft.mock] : []), ...real.filter((p) => cached[p.id]).map((p) => cached[p.id]), await extract(real.filter((p) => !cached[p.id]), { ai })]);
      // the drawn sample sheets keep their per-procedure template
      const legacy = draft.photos.filter((p) => p.url.startsWith("sample-") && !cached[p.id]);
      await new Promise((r) => setTimeout(r, 900));
      if (!alive) return;
      setPhase(2);
      const out: Group[] = ex.patients.map((p, gi) => ({
        key: `g${gi}`,
        hn: p.hn ?? (gi === 0 ? draft.patientHn ?? "" : ""),
        an: p.an ?? "",
        patientName: p.name ?? (gi === 0 ? draft.patientName ?? "" : ""),
        doctorId: p.doctorId ?? d.doctors.find((x) => x.code && x.code === p.doctorCode)?.id ?? draft.doctorId ?? "",
        lines: p.items.map((it, i) => toLine(d, it, "OCR", `g${gi}-${i}`)),
      }));
      if (legacy.length) {
        const tpl = OCR_TEMPLATES[draft.procedure || "knee"] ?? OCR_TEMPLATES.knee;
        out.push({
          key: "gl",
          hn: draft.patientHn ?? "",
          an: "",
          patientName: draft.patientName ?? "",
          doctorId: draft.doctorId ?? "",
          lines: tpl.map(([productId, qty], i) => ({ key: `gl-${i}`, raw: "", productId, qty, checked: true, confidence: [0.98, 0.96, 0.94, 0.91, 0.88][i] ?? 0.9, source: "OCR" })),
        });
      }
      if (draft.scanned?.length || draft.picked?.length) {
        const target = out[0] ?? { key: "gs", hn: draft.patientHn ?? "", an: "", patientName: draft.patientName ?? "", doctorId: draft.doctorId ?? "", lines: [] };
        target.lines.push(...(draft.scanned ?? []).map((raw, i) => toLine(d, { raw }, "SCAN", `gs-${i}`)));
        target.lines.push(
          ...(draft.picked ?? []).map((x, i): Line => {
            const lot = d.lots.find((l) => l.id === x.lotId);
            return { key: `gp-${i}`, raw: lot?.lotNo ?? "", productId: x.productId, lotId: x.lotId, lotNo: lot?.lotNo, qty: x.qty, checked: true, source: "MANUAL" };
          }),
        );
        if (!out.length) out.push(target);
      }
      const h = matchHospital(d, ex.hospitalName);
      if (h && !draft.hospitalId) setHospitalId(h.id);
      // mock data has no photo to read the hospital from; it is already chosen
      if (!draft.mock) setHospitalRead(ex.hospitalName);
      if (ex.date && !draft.hospitalId) setCaseDate(ex.date);
      setEngine(legacy.length && ex.engine === "none" ? "sample" : ex.engine);
      setModel(ex.model);
      setGroups(out);
      await new Promise((r) => setTimeout(r, 500));
      if (alive) setPhase(3);
    })();
    return () => {
      alive = false;
      clearTimeout(t1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft)
    return (
      <MScreen title={t("m.ocr.title")} back="/m/cases/new" tabs={false}>
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title={t("m.ocr.noDraft")}
          action={
            <Link href="/m/cases/new">
              <Button>{t("m.new.title")}</Button>
            </Link>
          }
        />
      </MScreen>
    );

  const hospital = d.hospitals.find((h) => h.id === hospitalId);
  const itemCount = groups.reduce((a, g) => a + g.lines.length, 0);
  const picked = (g: Group) => g.lines.filter((l) => l.checked && l.productId && l.qty > 0);
  const selectedCount = groups.reduce((a, g) => a + picked(g).length, 0);
  const doctors = d.doctors.filter((x) => !hospitalId || x.hospitalIds.includes(hospitalId));
  const cameraShots = draft.photos.filter((p) => captured.has(p.id) && originals.has(p.id));

  const patch = (gk: string, f: (g: Group) => Group) => setGroups((gs) => gs.map((g) => (g.key === gk ? f(g) : g)));
  const patchLine = (gk: string, lk: string, f: (l: Line) => Line) => patch(gk, (g) => ({ ...g, lines: g.lines.map((l) => (l.key === lk ? f(l) : l)) }));

  const addTo = (gk: string, line: Line) => {
    patch(gk, (g) => ({ ...g, lines: [...g.lines, line] }));
    setAdding(null);
  };

  /** -1 is the summary (patient count, hospital, date); 0…n-1 are the patients, one page each. */
  const go = (p: number) => {
    if (p >= 0 && !hospitalId) return toast.warning(t("m.ocr.needHospital"));
    setPage(p);
    top.current?.scrollIntoView({ block: "start" });
  };

  const saveShots = async () => {
    for (const p of cameraShots) {
      const blob = originals.get(p.id)!;
      const file = blob instanceof File ? blob : new File([blob], `consigncare-${p.id}.jpg`, { type: blob.type || "image/jpeg" });
      const r = await saveToGallery(file);
      if (r === "cancelled") return;
    }
    setShotsSaved(true);
    toast.success(t("m.new.savedToGallery", { n: cameraShots.length }));
  };

  const confirm = () => {
    if (!hospitalId) return toast.warning(t("m.ocr.needHospital"));
    const ready = groups.filter((g) => picked(g).length);
    if (!ready.length) return toast.warning(t("m.ocr.needItem"));
    setSaving(true);
    const created = ready.map((g) => {
      const items = picked(g);
      const ep = items.some((l) => d.products.find((p) => p.id === l.productId)?.category === "Electrophysiology");
      return run(ops.createCase, {
        hospitalId,
        caseDate,
        doctorId: g.doctorId || undefined,
        patientHn: g.hn || undefined,
        patientAn: g.an || undefined,
        patientName: g.patientName.trim() || undefined,
        procedure: draft.procedure || (ep ? "ep" : undefined),
        photos: draft.photos,
        items: items.map((l) => ({ productId: l.productId!, qty: l.qty, lotId: l.lotId, source: l.source, serialNo: l.serialNo })),
      });
    });
    setDraft(undefined);
    if (created.length === 1) {
      toast.success(t("m.ocr.created", { no: created[0].no }), t("m.ocr.createdDesc", { n: selectedCount }));
      router.replace(`/m/cases/${created[0].id}?created=1`);
    } else {
      toast.success(t("m.ocr.createdN", { n: created.length, nos: created.map((c) => c.no).join(", ") }), t("m.ocr.createdDesc", { n: selectedCount }));
      router.replace(`/m/cases`);
    }
  };

  const engineLabel =
    engine === "ai" ? t("m.ocr.engine.ai", { model: model ?? "Claude" }) : engine === "barcode" ? t("m.ocr.engine.barcode") : engine === "sample" ? t("m.ocr.engine.sample") : engine === "mock" ? t("m.ocr.engine.mock") : "";
  const ready = phase === 3 && itemCount > 0;
  const n = groups.length;
  const g = page >= 0 ? groups[page] : undefined;
  const last = page === n - 1;

  const footer = !ready ? undefined : page < 0 ? (
    <Button size="lg" className="w-full" onClick={() => go(0)}>
      {t("m.ocr.startPatients", { n })} <ChevronRight className="h-4 w-4" />
    </Button>
  ) : (
    <div className="grid grid-cols-[auto_1fr] gap-2">
      <Button size="lg" variant="outline" onClick={() => go(page - 1)} aria-label={t("m.ocr.prev")}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {last ? (
        <Button size="lg" onClick={confirm} loading={saving}>
          {t("g.confirm")} · {n > 1 ? `${n} ${t("g.cases")} · ` : ""}
          {selectedCount} {t("g.items")}
        </Button>
      ) : (
        <Button size="lg" onClick={() => go(page + 1)}>
          {t("m.ocr.nextPatient", { i: page + 2, n })} <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <MScreen title={g ? t("m.ocr.patientOf", { i: page + 1, n }) : t("m.ocr.title")} onBack={() => (page >= 0 ? go(page - 1) : router.push("/m/cases/new"))} tabs={false} footer={footer}>
      <div ref={top} className="space-y-4 p-4">
        {!g && (
          <div className="relative overflow-hidden rounded-2xl bg-slate-200">
            <div className="flex gap-1">
              {draft.photos.slice(0, 3).map((p) => (
                <PhotoThumb key={p.id} url={p.url} className="h-36 flex-1 rounded-none" />
              ))}
              {!draft.photos.length && (
                <div className={cx("flex flex-1 items-center justify-center gap-2 text-sm font-medium text-slate-500", draft.mock ? "h-16" : "h-24")}>
                  {draft.mock ? <Dices className="h-7 w-7 text-violet-500" /> : <ScanLine className="h-8 w-8" />}
                  {draft.mock && t("m.ocr.engine.mock")}
                </div>
              )}
            </div>
            {draft.photos.length > 3 && <span className="absolute bottom-2 right-2 rounded-full bg-navy-900/70 px-2 py-0.5 text-[11px] font-semibold text-white">+{draft.photos.length - 3}</span>}
            {phase < 3 && (
              <div className="absolute inset-0 overflow-hidden bg-navy-900/40">
                <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                <div className="absolute inset-x-0 h-0.5 bg-sky-300 shadow-[0_0_14px_#7dd3fc] animate-scanline" style={{ top: "50%" }} />
              </div>
            )}
          </div>
        )}

        {phase < 3 ? (
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <div className="flex items-center gap-2 text-brand-700">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <p className="font-semibold">{t("m.ocr.processing")}</p>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${((phase + 1) / 3) * 100}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {STEPS.map((s, i) => (
                <li key={s} className={cx("flex items-center gap-2 text-sm", i <= phase ? "text-slate-700" : "text-slate-300")}>
                  {i < phase ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className={cx("h-4 w-4 rounded-full border-2", i === phase ? "border-brand-500 border-t-transparent animate-spin" : "border-slate-200")} />}
                  {t(s)}
                </li>
              ))}
            </ul>
          </div>
        ) : itemCount === 0 ? (
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="h-5 w-5" /> {t("m.ocr.none")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800/90">{t("m.ocr.noneDesc")}</p>
            <Link href="/m/cases/new">
              <Button variant="outline" className="mt-3 w-full">
                <Camera className="h-4 w-4" /> {t("m.ocr.retake")}
              </Button>
            </Link>
          </div>
        ) : !g ? (
          <>
            {/* patient count first */}
            <div className="rounded-2xl bg-white p-4 text-center shadow-card">
              <p className="text-xs font-medium text-slate-500">{t(draft.mock ? "m.ocr.foundMock" : "m.ocr.found")}</p>
              <p className="mt-1 flex items-baseline justify-center gap-2 text-navy-800">
                <span className="text-5xl font-bold tabular-nums">{n}</span>
                <span className="text-lg font-semibold">{t("m.ocr.patientsUnit")}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">{t("m.ocr.itemsN", { n: itemCount })}</p>
              {engineLabel && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> {engineLabel}</p>}
            </div>

            {cameraShots.length > 0 && (
              <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
                <Download className="h-5 w-5 shrink-0 text-sky-700" />
                <p className="min-w-0 flex-1 text-xs text-sky-900">{t(shotsSaved ? "m.new.savedToGallery" : "m.new.saveToGalleryHint", { n: cameraShots.length })}</p>
                {!shotsSaved && (
                  <Button size="sm" variant="outline" className="shrink-0 bg-white" onClick={() => void saveShots()}>
                    {t("m.new.saveToGallery")}
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-3 rounded-2xl bg-white p-3 shadow-card">
              <Field label={t("g.hospital")} required hint={hospitalRead ? `${t("m.ocr.readFrom")}: “${hospitalRead}”` : undefined}>
                <Select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
                  <option value="">{t("g.pleaseSelect")}</option>
                  {d.hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {name(h, lang)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("m.new.caseDate")} required>
                <Input type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} />
              </Field>
            </div>

            <ul className="overflow-hidden rounded-2xl bg-white shadow-card">
              {groups.map((x, i) => (
                <li key={x.key} className="border-b border-slate-100 last:border-0">
                  <button onClick={() => go(i)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{x.patientName || t("m.ocr.patientN", { n: i + 1 })}</span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {x.hn ? `HN ${x.hn} · ` : ""}
                        {t("m.ocr.itemsN", { n: picked(x).length })}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
            {hospital && <p className="text-center text-[11px] text-slate-400">{name(hospital, lang)}</p>}
          </>
        ) : (
          <>
            {/* one page per patient */}
            <div className="flex items-center justify-center gap-1.5" aria-hidden>
              {groups.map((x, i) => (
                <button key={x.key} onClick={() => go(i)} className={cx("h-2 rounded-full transition-all", i === page ? "w-6 bg-brand-600" : "w-2 bg-slate-300 hover:bg-slate-400")} />
              ))}
            </div>
            <section className="overflow-hidden rounded-2xl bg-white shadow-card">
              <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white">
                  <UserRound className="h-4 w-4" />
                </span>
                <p className="flex-1 text-sm font-semibold text-slate-800">{t("m.ocr.patientOf", { i: page + 1, n })}</p>
                <Badge tone="blue">{picked(g).length}</Badge>
              </header>
              <div className="grid grid-cols-2 gap-2 px-3 pt-3">
                <Field label="HN">
                  <Input value={g.hn} onChange={(e) => patch(g.key, (x) => ({ ...x, hn: e.target.value }))} placeholder="HN" />
                </Field>
                <Field label="AN">
                  <Input value={g.an} onChange={(e) => patch(g.key, (x) => ({ ...x, an: e.target.value }))} placeholder="AN" />
                </Field>
                <div className="col-span-2">
                  <Field label={t("g.patientName")}>
                    <Input value={g.patientName} onChange={(e) => patch(g.key, (x) => ({ ...x, patientName: e.target.value }))} placeholder={t("m.new.patientNamePh")} autoComplete="off" />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label={t("g.doctor")}>
                    <Select value={g.doctorId} onChange={(e) => patch(g.key, (x) => ({ ...x, doctorId: e.target.value }))}>
                      <option value="">{t("g.pleaseSelect")}</option>
                      {doctors.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.code ? `${x.code} · ` : ""}
                          {name(x, lang)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
              <ul className="mt-2 divide-y divide-slate-100">
                {g.lines.map((l) => {
                  const p = d.products.find((x) => x.id === l.productId);
                  const lot = d.lots.find((x) => x.id === l.lotId);
                  const low = (l.confidence ?? 1) < 0.9;
                  return (
                    <li key={l.key} className={cx("flex items-center gap-3 px-3 py-2.5", !l.checked && "opacity-50")}>
                      <input
                        type="checkbox"
                        checked={l.checked}
                        disabled={!p}
                        onChange={(e) => patchLine(g.key, l.key, (x) => ({ ...x, checked: e.target.checked }))}
                        className="h-5 w-5 shrink-0 rounded border-slate-300 accent-brand-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cx("truncate text-sm font-semibold", p ? "text-slate-800" : "text-rose-600")}>{p ? p.name : t("m.ocr.unknownRef")}</p>
                        <p className="truncate font-mono text-[11px] text-slate-500">
                          REF {p?.ref ?? parseSticker(l.raw)?.ref ?? l.raw}
                          {(lot?.lotNo ?? l.lotNo) && ` · LOT ${lot?.lotNo ?? l.lotNo}`}
                          {l.serialNo && ` · SN ${l.serialNo}`}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                          {l.source === "OCR" && l.confidence !== undefined && (
                            <span className={low ? "text-amber-600" : "text-emerald-600"}>
                              {engine === "barcode" ? "BARCODE" : engine === "mock" ? t("m.ocr.mockTag") : "AI"} {Math.round(l.confidence * 100)}%{low && ` · ${t("m.ocr.lowConf")}`}
                            </span>
                          )}
                          {l.source !== "OCR" && <span className="text-brand-600">{t(`src.${l.source}`)}</span>}
                          {p && l.lotNo && !lot && <span className="text-amber-600">{t("m.ocr.unknownLot")}</span>}
                        </div>
                      </div>
                      <Stepper value={l.qty} onChange={(q) => (q <= 0 ? patch(g.key, (x) => ({ ...x, lines: x.lines.filter((y) => y.key !== l.key) })) : patchLine(g.key, l.key, (x) => ({ ...x, qty: q })))} />
                    </li>
                  );
                })}
              </ul>
              <div className="p-3 pt-1">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setAdding(g.key)}>
                  <Plus className="h-4 w-4" /> {t("m.ocr.addTo")}
                </Button>
              </div>
            </section>
          </>
        )}
      </div>

      <AddItemModal open={!!adding} onClose={() => setAdding(null)} onAdd={(line) => adding && addTo(adding, line)} />
    </MScreen>
  );
}

function AddItemModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (line: Line) => void }) {
  const { t } = useT();
  const d = useData();
  const [tab, setTab] = useState<"scan" | "search">("scan");
  const [q, setQ] = useState("");
  const list = d.products.filter((p) => p.category !== "Pharmaceutical" && `${p.name} ${p.ref}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} title={t("g.addItem")}>
      <Tabs
        variant="pill"
        className="mb-3 w-full [&>button]:flex-1"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "scan", label: <span className="inline-flex items-center gap-1"><ScanLine className="h-3.5 w-3.5" />{t("m.tab.scan")}</span> },
          { id: "search", label: <span className="inline-flex items-center gap-1"><Search className="h-3.5 w-3.5" />{t("g.search")}</span> },
        ]}
      />
      {tab === "search" ? (
        <div className="space-y-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("m.scan.searchPh")} autoFocus />
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => onAdd({ key: ops.uid("ln"), raw: p.ref, productId: p.id, qty: 1, checked: true, source: "MANUAL" })}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-2 text-left hover:bg-slate-50"
            >
              <ProductArt category={p.category} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-[11px] text-slate-500">REF {p.ref}</p>
              </div>
              <Plus className="h-4 w-4 text-brand-600" />
            </button>
          ))}
          {list.length === 0 && <EmptyState title={t("g.noResults")} />}
        </div>
      ) : (
        <ScannerView
          compact
          samples={stickerSamples()}
          onResult={(code) => {
            const line = toLine(d, { raw: code }, "SCAN", ops.uid("ln"));
            if (!line.productId) return toast.error(t("scan.notFound"), code);
            toast.success(t("scan.found"), d.products.find((p) => p.id === line.productId)?.name);
            onAdd(line);
          }}
        />
      )}
    </Modal>
  );
}
