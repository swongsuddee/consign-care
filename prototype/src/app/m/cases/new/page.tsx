"use client";

import { ChevronRight, ClipboardPen, Dices, History, ImagePlus, Images, QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, type ReactNode } from "react";
import { useMyHospitals } from "@/components/mobile/bits";
import { MScreen } from "@/components/mobile/MScreen";
import { toast } from "@/components/toast";
import { PageLoader, cx } from "@/components/ui";
import { useT } from "@/i18n";
import { DEMO_TODAY } from "@/lib/ops";
import { mockExtraction } from "@/lib/mock";
import { toCasePhotos } from "@/lib/photos";
import { useStore } from "@/lib/store";
import type { CasePhoto } from "@/lib/types";

/**
 * First step of a new case, three ways in:
 * 1. Scan QR / barcode: the rear camera takes a photo of the stickers or the usage sheet.
 * 2. Upload: pick one or more photos from the gallery.
 * 3. Create manually: the form.
 * Photos go to the patient details page (review), which reads them and shows one page per patient. Without a camera,
 * "create mock data" sends made-up patients there instead.
 */
export default function NewCaseChoicePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Choice />
    </Suspense>
  );
}

function Choice() {
  const { t } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const draft = useStore((s) => s.ocrDraft);
  const setDraft = useStore((s) => s.setOcrDraft);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"camera" | "gallery" | null>(null);
  const hospital = sp.get("hospital") ?? "";
  const mine = useMyHospitals();

  const start = (photos: CasePhoto[]) => {
    setDraft({ mode: "scan", hospitalId: hospital, caseDate: DEMO_TODAY, photos });
    router.push("/m/cases/new/review");
  };

  /** No camera: made-up patients and items from the hospital's real stock, shown on the patient pages like a read photo. */
  const startMock = () => {
    const d = useStore.getState().data;
    const stocked = (id: string) => d.stock.some((s) => s.qty > 0 && d.locations.some((l) => l.id === s.locationId && l.hospitalId === id));
    const choices = mine.filter((h) => stocked(h.id));
    const hospitalId = hospital || (choices[Math.floor(Math.random() * choices.length)] ?? mine[0])?.id || "";
    setDraft({ mode: "scan", hospitalId, caseDate: DEMO_TODAY, photos: [], mock: mockExtraction(d, hospitalId, DEMO_TODAY) });
    router.push("/m/cases/new/review");
  };

  const onFiles = async (files: FileList | null, from: "camera" | "gallery") => {
    if (!files?.length) return;
    setBusy(from);
    try {
      start(await toCasePhotos(Array.from(files).slice(0, 8), from === "camera"));
    } catch {
      toast.error(t("m.new.photoError"));
      setBusy(null);
    }
  };

  return (
    <MScreen title={t("m.new.title")} back="/m/home" tabs={false}>
      <div className="space-y-3 p-4">
        <p className="px-1 text-sm text-slate-600">{t("m.new.chooseSub")}</p>
        {draft && (
          <Link
            href={draft.mode === "manual" ? "/m/cases/new/manual" : "/m/cases/new/review"}
            className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200"
          >
            <History className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t("m.new.continueDraft", { mode: t(draft.mode === "manual" ? "m.new.optManual" : "m.new.optScan") })}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
        <div className="grid gap-3 @3xl/app:grid-cols-3">
          <Option icon={<QrCode className="h-7 w-7" />} tone="bg-brand-600 text-white" title={t("m.new.optScan")} desc={t("m.new.optScanDesc")} busy={busy === "camera"} onClick={() => camera.current?.click()} />
          <Option icon={<Images className="h-7 w-7" />} tone="bg-sky-50 text-sky-700" title={t("m.new.optUpload")} desc={t("m.new.optUploadDesc")} busy={busy === "gallery"} onClick={() => gallery.current?.click()} />
          <Option
            icon={<ClipboardPen className="h-7 w-7" />}
            tone="bg-emerald-50 text-emerald-700"
            title={t("m.new.optManual")}
            desc={t("m.new.optManualDesc")}
            onClick={() => router.push(`/m/cases/new/manual${hospital ? `?hospital=${hospital}` : ""}`)}
          />
        </div>
        {/* capture="environment" opens the rear camera on a phone; a desktop browser shows the file picker instead */}
        <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void onFiles(e.target.files, "camera"); e.target.value = ""; }} />
        <input ref={gallery} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void onFiles(e.target.files, "gallery"); e.target.value = ""; }} />

        <div className="rounded-2xl border border-dashed border-slate-300 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <ImagePlus className="h-3.5 w-3.5" /> {t("m.new.samples")}
          </p>
          <button onClick={startMock} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-brand-200 transition hover:ring-brand-400">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Dices className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800">{t("m.new.optMock")}</span>
              <span className="block text-[11px] leading-snug text-slate-500">{t("m.new.optMockDesc")}</span>
            </span>
          </button>
        </div>
      </div>
    </MScreen>
  );
}

function Option({ icon, tone, title, desc, onClick, busy }: { icon: ReactNode; tone: string; title: string; desc: string; onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="group flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-slate-100 transition hover:ring-brand-300 disabled:opacity-70"
    >
      <span className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", tone)}>
        {busy ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-800">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{desc}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
    </button>
  );
}
