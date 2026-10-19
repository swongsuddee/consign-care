"use client";

import { ListPlus, PackageOpen, Save, ScanLine } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ProductArt } from "@/components/art";
import { useMyHospitals } from "@/components/mobile/bits";
import { EquipmentSheet, onHandByLot, RemoveBtn, Stepper } from "@/components/mobile/EquipmentSheet";
import { MScreen } from "@/components/mobile/MScreen";
import { ScannerView } from "@/components/Scanner";
import { toast } from "@/components/toast";
import { Button, Field, Input, Modal, PageLoader, Select } from "@/components/ui";
import { useT } from "@/i18n";
import * as ops from "@/lib/ops";
import { DEMO_TODAY } from "@/lib/ops";
import { stickerSamples } from "@/lib/samples";
import { name, parseBarcode, parseSticker } from "@/lib/selectors";
import { useData, useOp, useStore } from "@/lib/store";
import type { PickedItem } from "@/lib/types";

/**
 * Create a case by hand: hospital, date, patient no. (HN), patient name, doctor, operation, and the equipment picked
 * from the hospital's consignment stock or scanned. Saving creates the case straight away. The form is a draft in the
 * local DB, so a refresh or a trip to another screen loses nothing.
 */
export default function NewCaseManualPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ManualCase />
    </Suspense>
  );
}

function ManualCase() {
  const { t, lang } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const d = useData();
  const run = useOp();
  const hospitals = useMyHospitals();
  const stored = useStore((s) => s.ocrDraft);
  const setDraft = useStore((s) => s.setOcrDraft);
  const [draft] = useState(() => (stored?.mode === "manual" ? stored : undefined));

  const [hospitalId, setHospitalId] = useState(sp.get("hospital") ?? draft?.hospitalId ?? "");
  const [caseDate, setCaseDate] = useState(draft?.caseDate ?? DEMO_TODAY);
  const [patientHn, setPatientHn] = useState(draft?.patientHn ?? "");
  const [patientName, setPatientName] = useState(draft?.patientName ?? "");
  const [doctorId, setDoctorId] = useState(draft?.doctorId ?? "");
  const [procedure, setProcedure] = useState(draft?.procedure ?? "");
  const [picked, setPicked] = useState<PickedItem[]>(draft?.picked ?? []);
  const [scanned, setScanned] = useState<string[]>(draft?.scanned ?? []);
  const [sheet, setSheet] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restored] = useState(() => !!draft);

  const doctors = hospitalId ? d.doctors.filter((x) => x.hospitalIds.includes(hospitalId)) : d.doctors;
  const onHand = onHandByLot(d, hospitalId ? [hospitalId] : hospitals.map((h) => h.id));
  const count = picked.reduce((a, x) => a + x.qty, 0) + scanned.length;

  useEffect(() => {
    const blank = !hospitalId && !patientHn && !patientName && !doctorId && !procedure && !count && caseDate === DEMO_TODAY;
    // a photo draft from the other path is left alone until this form has something in it
    if (blank && stored?.mode !== "manual") return;
    setDraft(blank ? undefined : { mode: "manual", hospitalId, caseDate, patientHn, patientName, doctorId, procedure, photos: [], picked, scanned });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId, caseDate, patientHn, patientName, doctorId, procedure, picked, scanned, count, setDraft]);

  const setQty = (productId: string, lotId: string, qty: number) =>
    setPicked((ps) =>
      qty <= 0 ? ps.filter((x) => x.lotId !== lotId) : ps.some((x) => x.lotId === lotId) ? ps.map((x) => (x.lotId === lotId ? { ...x, qty } : x)) : [...ps, { productId, lotId, qty }],
    );

  const onScan = (code: string) => {
    const st = parseSticker(code);
    setScanned((s) => [...s, code]);
    toast.success(st ? t("m.new.stickerAdded", { ref: st.ref, lot: st.lotNo, sn: st.serialNo }) : code);
  };

  const startOver = () => {
    setHospitalId("");
    setCaseDate(DEMO_TODAY);
    setPatientHn("");
    setPatientName("");
    setDoctorId("");
    setProcedure("");
    setPicked([]);
    setScanned([]);
  };

  const save = () => {
    if (!hospitalId) return toast.warning(t("m.new.needHospital"));
    if (!patientHn.trim()) return toast.warning(t("m.new.needHn"));
    const fromScan = scanned.map((code) => parseBarcode(d, code));
    const unknown = fromScan.filter((x) => !x.product).length;
    const items: ops.NewUsageLine[] = [
      ...picked.map((x) => ({ productId: x.productId, lotId: x.lotId, qty: x.qty, source: "MANUAL" as const })),
      ...fromScan.flatMap((x) => (x.product ? [{ productId: x.product.id, lotId: x.lot?.id, qty: 1, source: "SCAN" as const, serialNo: x.serialNo }] : [])),
    ];
    if (!items.length) return toast.warning(t("m.new.needItem"));
    setBusy(true);
    const c = run(ops.createCase, {
      hospitalId,
      caseDate,
      doctorId: doctorId || undefined,
      patientHn: patientHn.trim(),
      patientName: patientName.trim() || undefined,
      procedure: procedure || undefined,
      photos: [],
      items,
    });
    setDraft(undefined);
    if (unknown) toast.warning(t("m.new.skippedUnknown", { n: unknown }));
    toast.success(t("m.ocr.created", { no: c.no }), t("m.ocr.createdDesc", { n: items.reduce((a, x) => a + x.qty, 0) }));
    router.replace(`/m/cases/${c.id}?created=1`);
  };

  return (
    <MScreen
      title={t("m.new.titleManual")}
      back="/m/cases/new"
      tabs={false}
      footer={
        <Button size="lg" className="w-full" onClick={save} loading={busy}>
          {!busy && <Save className="h-4 w-4" />} {t("m.new.saveCase")}
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        {restored && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
            <span>{t("m.new.restored")}</span>
            <button onClick={startOver} className="shrink-0 font-semibold underline underline-offset-2">
              {t("m.new.startOver")}
            </button>
          </div>
        )}
        <Field label={t("g.hospital")} required>
          <Select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} className="h-11">
            <option value="">{t("g.pleaseSelect")}</option>
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
        <Field label={t("m.new.patientId")} required>
          <Input value={patientHn} onChange={(e) => setPatientHn(e.target.value)} placeholder="HN-000000" className="h-11" />
        </Field>
        <Field label={t("g.patientName")}>
          <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder={t("m.new.patientNamePh")} className="h-11" autoComplete="off" />
        </Field>
        <Field label={t("g.doctor")}>
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="h-11">
            <option value="">{t("g.pleaseSelect")}</option>
            {doctors.map((x) => (
              <option key={x.id} value={x.id}>
                {name(x, lang)} · {x.specialty}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("g.procedure")}>
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
          <p className="mb-2 mt-0.5 text-[11px] leading-snug text-slate-500">{t("m.new.equipmentHintManual")}</p>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto flex-col gap-1 py-2.5 text-[11px]" onClick={() => setSheet(true)}>
              <ListPlus className="h-5 w-5" /> {t("m.new.pick")}
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1 py-2.5 text-[11px]" onClick={() => setScanning(true)}>
              <ScanLine className="h-5 w-5" /> {t("m.new.scanCode")}
            </Button>
          </div>
          {count === 0 ? (
            <button onClick={() => setSheet(true)} className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-[11px] text-slate-500 hover:border-brand-400">
              <PackageOpen className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
              {t("m.new.emptyListManual")}
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
                    {r.product ? (
                      <ProductArt category={r.product.category} className="h-9 w-9" />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100">
                        <ScanLine className="h-4 w-4 text-slate-400" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{r.product?.name ?? t("m.new.notInCatalog")}</p>
                      <p className="truncate font-mono text-[10px] text-slate-500">{st ? `${st.ref} · LOT ${st.lotNo} · SN ${st.serialNo}` : c}</p>
                    </div>
                    <RemoveBtn onClick={() => setScanned((s) => s.filter((_, j) => j !== i))} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <EquipmentSheet open={sheet} onClose={() => setSheet(false)} hospitalId={hospitalId} picked={picked} onQty={setQty} onScan={() => setScanning(true)} />
      <Modal open={scanning} onClose={() => setScanning(false)} title={t("m.new.scanLive")}>
        <ScannerView compact autoStart multi samples={stickerSamples()} onResult={onScan} />
        <Button className="mt-3 w-full" onClick={() => setScanning(false)}>
          {t("g.done")} ({scanned.length})
        </Button>
      </Modal>
    </MScreen>
  );
}
