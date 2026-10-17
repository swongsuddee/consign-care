"use client";

import { AlertTriangle, Camera, CheckCircle2, Image as ImageIcon, Loader2, UserRound, ImagePlus, ListPlus, PackageOpen, ScanLine, Sparkles, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { PhotoThumb, ProductArt, UsageSheetArt } from "@/components/art";
import { useMyHospitals } from "@/components/mobile/bits";
import { MScreen } from "@/components/mobile/MScreen";
import { ScannerView } from "@/components/Scanner";
import { toast } from "@/components/toast";
import { Button, Field, Input, Modal, PageLoader, Select } from "@/components/ui";
import { useT } from "@/i18n";
import { DEMO_TODAY, uid } from "@/lib/ops";
import { aiAvailable, extractOne, originals, SAMPLE_EP, type Extraction } from "@/lib/extract";
import { OCR_TEMPLATES } from "@/lib/seed";
import { stickerSamples } from "@/lib/samples";
import { name, parseBarcode, parseSticker } from "@/lib/selectors";
import { useData, useStore } from "@/lib/store";
import type { CasePhoto, PickedItem } from "@/lib/types";
import { EquipmentSheet, onHandByLot, RemoveBtn, Stepper } from "@/components/mobile/EquipmentSheet";

/** Downscale an image file to a small JPEG data URL (keeps localStorage small) */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 640 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NewCasePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewCase />
    </Suspense>
  );
}

function NewCase() {
  const { t, lang } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const d = useData();
  const hospitals = useMyHospitals();
  const draft = useStore((s) => s.ocrDraft);
  const setDraft = useStore((s) => s.setOcrDraft);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [hospitalId, setHospitalId] = useState(sp.get("hospital") ?? draft?.hospitalId ?? "");
  const [caseDate, setCaseDate] = useState(draft?.caseDate ?? DEMO_TODAY);
  const [doctorId, setDoctorId] = useState(draft?.doctorId ?? "");
  const [patientHn, setPatientHn] = useState(draft?.patientHn ?? "");
  const [procedure, setProcedure] = useState(draft?.procedure ?? "");
  const [photos, setPhotos] = useState<CasePhoto[]>(draft?.photos ?? []);
  const [scanned, setScanned] = useState<string[]>(draft?.scanned ?? []);
  const [picked, setPicked] = useState<PickedItem[]>(draft?.picked ?? []);
  const [scanning, setScanning] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const doctors = hospitalId ? d.doctors.filter((x) => x.hospitalIds.includes(hospitalId)) : d.doctors;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const list = Array.from(files).slice(0, 4);
      const urls = await Promise.all(list.map(readPhoto));
      const added = urls.map((url, i) => {
        const id = uid("ph");
        originals.set(id, list[i]); // full resolution for barcode / AI reading
        return { id, url };
      });
      setPhotos((p) => [...p, ...added]);
      added.forEach(read);
    } catch {
      toast.error(t("m.new.photoError"));
    }
  };

  const addSample = (url: string) => {
    const ph = { id: uid("ph"), url };
    setPhotos((p) => [...p, ph]);
    read(ph);
  };

  // each photo is read the moment it is added; the result is kept with the draft so review does not read it again
  const [reads, setReads] = useState<Record<string, Extraction | "reading">>(draft?.extracted ?? {});
  const ai = useRef<Promise<boolean> | undefined>(undefined);
  const read = (ph: CasePhoto) => {
    if (ph.url.startsWith("sample-")) {
      // the drawn sample sheets read as their procedure's template
      const tpl = OCR_TEMPLATES[procedure || "knee"] ?? OCR_TEMPLATES.knee;
      const items = tpl.flatMap(([pid, qty], i) => {
        const prod = d.products.find((x) => x.id === pid);
        return prod ? [{ raw: prod.ref, ref: prod.ref, qty, confidence: [0.98, 0.96, 0.94, 0.91, 0.88][i] ?? 0.9 }] : [];
      });
      setReads((r) => ({ ...r, [ph.id]: { engine: "sample", patients: [{ items }] } }));
      return;
    }
    setReads((r) => ({ ...r, [ph.id]: "reading" }));
    void (async () => {
      ai.current ??= aiAvailable();
      const ex = await extractOne(ph, { ai: await ai.current }).catch((): Extraction => ({ engine: "none", patients: [] }));
      setReads((r) => (ph.id in r ? { ...r, [ph.id]: ex } : r));
      const n = ex.patients.reduce((a, x) => a + x.items.length, 0);
      if (n) toast.success(t("m.new.readDone", { n, p: ex.patients.length }));
      else toast.warning(t("m.new.readNone"));
    })();
  };
  const removePhoto = (id: string) => {
    setPhotos((ps) => ps.filter((x) => x.id !== id));
    setReads((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== id)));
  };
  /** Change the units of one item read from a photo; at 0 it leaves the list. */
  const setReadQty = (id: string, pi: number, ii: number, qty: number) =>
    setReads((r) => {
      const ex = r[id];
      if (!ex || ex === "reading") return r;
      const items = (x: Extraction["patients"][number]) =>
        qty <= 0 ? x.items.filter((_, j) => j !== ii) : x.items.map((it, j) => (j === ii ? { ...it, qty } : it));
      const patients = ex.patients.map((x, k) => (k === pi ? { ...x, items: items(x) } : x)).filter((x) => x.items.length);
      return { ...r, [id]: { ...ex, patients } };
    });
  const reading = Object.values(reads).some((x) => x === "reading");
  const extracted = Object.fromEntries(Object.entries(reads).filter((e): e is [string, Extraction] => e[1] !== "reading"));
  const onHand = onHandByLot(d, hospitalId ? [hospitalId] : hospitals.map((h) => h.id));

  const onScan = (code: string) => {
    const st = parseSticker(code);
    setScanned((s) => [...s, code]);
    if (st) toast.success(t("m.new.stickerAdded", { ref: st.ref, lot: st.lotNo, sn: st.serialNo }));
    else toast.success(code);
  };

  const readItems = Object.values(extracted).reduce((a, ex) => a + ex.patients.reduce((b, x) => b + x.items.reduce((c, it) => c + (it.qty ?? 1), 0), 0), 0);
  const count = picked.reduce((a, x) => a + x.qty, 0) + scanned.length + readItems;
  const [restored] = useState(() => !!draft);

  // the form is a draft in the local DB: a refresh or a trip to another screen keeps it
  useEffect(() => {
    const blank = !hospitalId && !doctorId && !patientHn && !procedure && !photos.length && !count && caseDate === DEMO_TODAY;
    setDraft(blank ? undefined : { hospitalId, caseDate, doctorId, patientHn, procedure, photos, scanned, picked, extracted });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId, caseDate, doctorId, patientHn, procedure, photos, scanned, picked, reads, count, setDraft]);

  const startOver = () => {
    setHospitalId("");
    setCaseDate(DEMO_TODAY);
    setDoctorId("");
    setPatientHn("");
    setProcedure("");
    setPhotos([]);
    setScanned([]);
    setPicked([]);
    setReads({});
  };
  const setQty = (productId: string, lotId: string, qty: number) =>
    setPicked((ps) =>
      qty <= 0
        ? ps.filter((x) => x.lotId !== lotId)
        : ps.some((x) => x.lotId === lotId)
          ? ps.map((x) => (x.lotId === lotId ? { ...x, qty } : x))
          : [...ps, { productId, lotId, qty }],
    );

  const next = () => {
    if (!count && !photos.length) return toast.warning(t("m.new.needCapture"));
    setBusy(true);
    setDraft({ hospitalId, caseDate, doctorId, patientHn, procedure, photos, scanned, picked, extracted });
    router.push("/m/cases/new/review");
  };

  return (
    <MScreen
      title={t("m.new.title")}
      back
      tabs={false}
      footer={
        <Button size="lg" className="w-full" onClick={next} loading={busy || reading} disabled={reading}>
          {!reading && <Sparkles className="h-4 w-4" />} {t(reading ? "m.new.reading" : "m.new.nextReview")}
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        {restored && count > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
            <span>{t("m.new.restored")}</span>
            <button onClick={startOver} className="shrink-0 font-semibold underline underline-offset-2">
              {t("m.new.startOver")}
            </button>
          </div>
        )}
        <Field label={t("g.hospital")} required>
          <Select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} className="h-11">
            <option value="">{t("m.new.hospitalFromPhoto")}</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {name(h, lang)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("m.new.caseDate")} required>
          <Input type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} className="h-11" />
        </Field>
        <Field label={t("g.doctor")} hint={t("g.optional")}>
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="h-11">
            <option value="">{t("g.pleaseSelect")}</option>
            {doctors.map((x) => (
              <option key={x.id} value={x.id}>
                {name(x, lang)} · {x.specialty}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("m.new.patientId")} hint={t("m.new.hnHint")}>
          <Input value={patientHn} onChange={(e) => setPatientHn(e.target.value)} placeholder="HN-000000" className="h-11" />
        </Field>
        <Field label={t("g.procedure")} hint={t("g.optional")}>
          <Select value={procedure} onChange={(e) => setProcedure(e.target.value)} className="h-11">
            <option value="">{t("g.pleaseSelect")}</option>
            {d.procedures.map((p) => (
              <option key={p.id} value={p.id}>
                {name(p, lang)}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>
              {t("m.new.equipment")} <span className="text-rose-500">*</span>
            </span>
            {count > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700">{t("m.new.selectedN", { n: count })}</span>}
          </p>
          <p className="mb-2 mt-0.5 text-[11px] leading-snug text-slate-500">{t("m.new.equipmentHint")}</p>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-auto flex-col gap-1 py-2.5 text-[11px]" onClick={() => setSheet(true)}>
              <ListPlus className="h-5 w-5" /> {t("m.new.pick")}
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1 py-2.5 text-[11px]" onClick={() => cameraRef.current?.click()}>
              <Camera className="h-5 w-5" /> {t("m.new.camera")}
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1 py-2.5 text-[11px]" onClick={() => fileRef.current?.click()}>
              <Upload className="h-5 w-5" /> {t("m.new.upload")}
            </Button>
          </div>

          {count === 0 && photos.length === 0 ? (
            <button onClick={() => setSheet(true)} className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-[11px] text-slate-500 hover:border-brand-400">
              <PackageOpen className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
              {t("m.new.emptyList")}
            </button>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              {picked.map((x) => {
                const p = d.products.find((q) => q.id === x.productId);
                const lot = d.lots.find((l) => l.id === x.lotId);
                if (!p) return null;
                return (
                  <li key={x.lotId} className="flex items-center gap-2.5 px-3 py-2.5">
                    <ProductArt category={p.category} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{p.name}</p>
                      <p className="truncate font-mono text-[10px] text-slate-500">
                        {p.ref} · LOT {lot?.lotNo}
                      </p>
                    </div>
                    <Stepper value={x.qty} max={onHand.get(x.lotId) ?? x.qty} onChange={(q) => setQty(x.productId, x.lotId, q)} />
                  </li>
                );
              })}
              {scanned.map((c, i) => {
                const r = parseBarcode(d, c);
                const st = parseSticker(c);
                return (
                  <li key={`s${i}`} className="flex items-center gap-2.5 px-3 py-2.5">
                    {r.product ? <ProductArt category={r.product.category} className="h-9 w-9" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100"><ScanLine className="h-4 w-4 text-slate-400" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{r.product?.name ?? t("m.new.notInCatalog")}</p>
                      <p className="truncate font-mono text-[10px] text-slate-500">{st ? `${st.ref} · LOT ${st.lotNo} · SN ${st.serialNo}` : c}</p>
                    </div>
                    <RemoveBtn onClick={() => setScanned((s) => s.filter((_, j) => j !== i))} />
                  </li>
                );
              })}
              {photos.map((p, i) => {
                const r = reads[p.id];
                const found = r && r !== "reading" ? r.patients.reduce((a, x) => a + x.items.reduce((b, it) => b + (it.qty ?? 1), 0), 0) : 0;
                return (
                  <li key={p.id} className="bg-slate-50/60">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                      <PhotoThumb url={p.url} className="h-11 w-9 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                          <ImageIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" /> {t("m.new.photoN", { n: i + 1 })}
                        </p>
                        {r === "reading" ? (
                          <p className="flex items-center gap-1 text-[10px] text-brand-600">
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> {t("m.new.reading")}
                          </p>
                        ) : r && found === 0 ? (
                          <p className="flex items-center gap-1 text-[10px] text-amber-700">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {t("m.new.readNone")}
                          </p>
                        ) : r ? (
                          <p className="flex items-center gap-1 text-[10px] text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 shrink-0" /> {t("m.new.readFound", { n: found, p: r.patients.length })} · {t(`m.ocr.engine.${r.engine}`, { model: r.model ?? "Claude" })}
                          </p>
                        ) : null}
                      </div>
                      <RemoveBtn onClick={() => removePhoto(p.id)} />
                    </div>
                    {r && r !== "reading" &&
                      r.patients.map((pt, pi) => (
                        <div key={pi} className="pb-1">
                          {r.patients.length > 1 || pt.hn ? (
                            <p className="flex items-center gap-1 px-3 pb-0.5 pt-1 text-[10px] font-semibold text-slate-500">
                              <UserRound className="h-3 w-3" /> {t("m.new.patientN", { n: pi + 1 })}
                              {pt.hn && <span className="font-mono font-normal">· HN {pt.hn}</span>}
                            </p>
                          ) : null}
                          {pt.items.map((it, ii) => {
                            const prod = d.products.find((x) => it.ref && x.ref.toUpperCase() === it.ref.toUpperCase()) ?? parseBarcode(d, it.raw).product;
                            return (
                              <div key={ii} className="flex items-center gap-2.5 py-1.5 pl-6 pr-3">
                                {prod ? <ProductArt category={prod.category} className="h-7 w-7 rounded-lg" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100"><ScanLine className="h-3.5 w-3.5 text-slate-400" /></span>}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[11px] font-medium text-slate-800">{prod?.name ?? t("m.new.notInCatalog")}</p>
                                  <p className="truncate font-mono text-[10px] text-slate-500">{it.ref ? `${it.ref}${it.lotNo ? ` · LOT ${it.lotNo}` : ""}${it.serialNo ? ` · SN ${it.serialNo}` : ""}` : it.raw}</p>
                                </div>
                                {it.confidence != null && it.confidence < 0.9 && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">{t("m.new.check")}</span>}
                                <Stepper value={it.qty ?? 1} onChange={(n) => setReadQty(p.id, pi, ii, n)} />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </li>
                );
              })}
            </ul>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />

          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <ImagePlus className="h-3.5 w-3.5" /> {t("m.new.samples")}
            </p>
            <button onClick={() => addSample(SAMPLE_EP)} className="mb-2 flex w-full items-center gap-3 overflow-hidden rounded-xl p-1.5 text-left ring-1 ring-brand-200 transition hover:ring-brand-400">
              <PhotoThumb url={SAMPLE_EP} className="h-16 w-12 shrink-0 rounded-lg" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-slate-800">{t("m.new.sampleEp")}</span>
                <span className="block text-[11px] text-slate-500">12 × REF · LOT · SN — {t("m.new.sampleRedacted")}</span>
              </span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((n) => (
                <button key={n} onClick={() => addSample(`sample-${n}`)} className="overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-brand-400">
                  <UsageSheetArt variant={n} className="h-16" />
                  <span className="block bg-slate-50 py-1 text-[11px] font-medium text-slate-600">{t("m.new.sampleN", { n })}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <EquipmentSheet
        open={sheet}
        onClose={() => setSheet(false)}
        hospitalId={hospitalId}
        picked={picked}
        onQty={setQty}
        onScan={() => setScanning(true)}
      />
      <Modal open={scanning} onClose={() => setScanning(false)} title={t("m.new.scanLive")}>
        <ScannerView compact autoStart multi samples={stickerSamples()} onResult={(code) => onScan(code)} />
        <Button className="mt-3 w-full" onClick={() => setScanning(false)}>
          {t("g.done")} ({scanned.length})
        </Button>
      </Modal>
    </MScreen>
  );
}
