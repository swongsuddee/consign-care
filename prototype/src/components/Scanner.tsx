"use client";

import { Camera, CameraOff, Image as ImageIcon, ScanLine, Keyboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { decodeBarcodes } from "@/lib/extract";
import { toast } from "./toast";
import { Button, Input, Modal, cx } from "./ui";

export interface SampleCode {
  label: string;
  code: string;
  hint?: string;
}

type Controls = { stop: () => void };

/**
 * Camera barcode scanner (@zxing/browser) with an always-available
 * "Simulate scan" list – presentation laptops often have no camera.
 */
export function ScannerView({
  onResult,
  samples,
  compact,
  autoStart = false,
  multi = false,
}: {
  onResult: (code: string, method: "SCAN" | "TYPED") => void;
  samples: SampleCode[];
  compact?: boolean;
  autoStart?: boolean;
  /** A gallery image with several barcodes adds them all, instead of asking which one. */
  multi?: boolean;
}) {
  const { t } = useT();
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<Controls | null>(null);
  const [state, setState] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [manual, setManual] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [picked, setPicked] = useState<string[] | null>(null);

  const fromGallery = async (file?: File) => {
    if (!file) return;
    stop();
    setState("idle");
    setReading(true);
    setPicked(null);
    try {
      const codes = (await decodeBarcodes(file)).map((r) => r.text);
      if (!codes.length) toast.warning(t("scan.galleryNone"), t("scan.galleryNoneDesc"));
      else if (codes.length === 1) emit(codes[0], "SCAN");
      else if (multi) {
        codes.forEach((c) => onResult(c, "SCAN"));
        toast.success(t("scan.galleryAdded", { n: codes.length }));
      } else setPicked(codes);
    } catch {
      toast.error(t("scan.galleryError"));
    } finally {
      setReading(false);
    }
  };

  const stop = () => {
    controls.current?.stop();
    controls.current = null;
  };

  const start = async () => {
    setState("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const c = await reader.decodeFromVideoDevice(undefined, video.current!, (result) => {
        if (result) {
          stop();
          setState("idle");
          emit(result.getText(), "SCAN");
        }
      });
      controls.current = c;
      setState("live");
    } catch {
      setState("error");
    }
  };

  const emit = (code: string, method: "SCAN" | "TYPED") => {
    setFlash(code);
    setTimeout(() => setFlash(null), 600);
    onResult(code, method);
  };

  useEffect(() => {
    if (autoStart) void start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className={cx("relative overflow-hidden rounded-2xl bg-slate-900", compact ? "h-44" : "h-56")}>
        <video ref={video} className={cx("absolute inset-0 h-full w-full object-cover", state === "live" ? "opacity-100" : "opacity-0")} muted playsInline />
        {state !== "live" && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#334155,#0f172a)]" />
        )}
        {/* frame */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative h-24 w-48">
            {["left-0 top-0 border-l-2 border-t-2 rounded-tl-lg", "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg", "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg", "right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg"].map((c) => (
              <span key={c} className={cx("absolute h-6 w-6 border-sky-300", c)} />
            ))}
            <span className="absolute inset-x-2 top-1/2 h-0.5 rounded bg-rose-400/90 shadow-[0_0_12px_rgba(251,113,133,0.9)] animate-scanline" />
            {state !== "live" && (
              <div className="absolute inset-3 grid place-items-center rounded-md bg-white/90">
                <div className="flex h-10 items-end gap-[2px]">
                  {Array.from({ length: 26 }).map((_, i) => (
                    <span key={i} className="bg-slate-800" style={{ width: i % 3 ? 2 : 3, height: 30 + (i % 4) * 2 }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {flash && <div className="absolute inset-0 bg-emerald-400/30 animate-fade-in" />}
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2 text-xs text-white/80">
          {state === "error" ? (
            <span className="flex items-center gap-1 px-4 text-center text-amber-200">
              <CameraOff className="h-3.5 w-3.5 shrink-0" />
              {t("scan.noCamera")}
            </span>
          ) : (
            t("scan.align")
          )}
        </div>
        {reading && (
          <div className="absolute inset-0 grid place-items-center bg-slate-900/60 text-sm font-medium text-white">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> {t("scan.galleryReading")}
            </span>
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Button size="sm" variant="outline" onClick={() => gallery.current?.click()} className="bg-white/90" disabled={reading}>
            <ImageIcon className="h-3.5 w-3.5" /> {t("scan.gallery")}
          </Button>
          <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(e) => { void fromGallery(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <div className="absolute right-2 top-2">
          {state === "live" ? (
            <Button size="sm" variant="outline" onClick={() => { stop(); setState("idle"); }}>
              <CameraOff className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={start} loading={state === "starting"} className="bg-white/90">
              <Camera className="h-3.5 w-3.5" /> {t("scan.startCamera")}
            </Button>
          )}
        </div>
      </div>

      {picked && (
        <div className="rounded-xl bg-brand-50/70 p-3 ring-1 ring-brand-100">
          <p className="mb-2 text-xs font-semibold text-brand-800">{t("scan.galleryPick", { n: picked.length })}</p>
          <div className="grid gap-1.5">
            {picked.map((c, i) => (
              <button
                key={`${c}-${i}`}
                onClick={() => {
                  setPicked(null);
                  emit(c, "SCAN");
                }}
                className="truncate rounded-lg bg-white px-3 py-2 text-left font-mono text-xs text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <ScanLine className="h-3.5 w-3.5" /> {t("scan.simulate")} · {t("scan.samples")}
        </p>
        <div className="grid gap-2">
          {samples.map((s) => (
            <button
              key={s.code}
              onClick={() => emit(s.code, "SCAN")}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{s.label}</p>
                <p className="truncate font-mono text-[11px] text-slate-500">{s.code}</p>
              </div>
              {s.hint && <span className="shrink-0 text-[11px] text-slate-400">{s.hint}</span>}
            </button>
          ))}
        </div>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) emit(manual.trim(), "TYPED");
          setManual("");
        }}
      >
        <div className="relative flex-1">
          <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t("scan.manual")} className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">
          {t("g.confirm")}
        </Button>
      </form>
    </div>
  );
}

export function ScannerModal({
  open,
  onClose,
  onResult,
  samples,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (code: string, method: "SCAN" | "TYPED") => void;
  samples: SampleCode[];
  title?: string;
}) {
  const { t } = useT();
  return (
    <Modal open={open} onClose={onClose} title={title ?? t("scan.title")}>
      {open && <ScannerView onResult={onResult} samples={samples} compact />}
    </Modal>
  );
}
