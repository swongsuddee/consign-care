"use client";

import { AlertTriangle, Camera, ChevronRight, History, Image as ImageIcon, Search, XCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ProductArt } from "@/components/art";
import { useMe } from "@/components/mobile/bits";
import { MScreen } from "@/components/mobile/MScreen";
import { ScannerView } from "@/components/Scanner";
import { toast } from "@/components/toast";
import { decodeBarcodes } from "@/lib/extract";
import { Badge, Button, EmptyState, Input, Tabs } from "@/components/ui";
import { useFmt } from "@/lib/format";
import { DEMO_TODAY, daysBetween } from "@/lib/ops";
import { productSamples } from "@/lib/samples";
import { consignmentStock, parseBarcode } from "@/lib/selectors";
import { useData } from "@/lib/store";

export default function ScanPage() {
  const { t, date } = useFmt();
  const d = useData();
  const me = useMe();
  const [tab, setTab] = useState<"scan" | "search">("scan");
  const [result, setResult] = useState<ReturnType<typeof parseBarcode> & { code: string }>();
  const [q, setQ] = useState("");
  const [camOn, setCamOn] = useState(0); // bump to remount the scanner with the camera on
  const [found, setFound] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const gallery = useRef<HTMLInputElement>(null);

  // a scanned / decoded code (sticker "REF LOT SN", GS1, GTIN) finds its product directly
  const hit = q.trim() ? parseBarcode(d, q).product : undefined;
  const products = hit ? [hit] : d.products.filter((p) => `${p.name} ${p.ref} ${p.gtin}`.toLowerCase().includes(q.toLowerCase()));

  const fromGallery = async (file?: File) => {
    if (!file) return;
    setReading(true);
    setFound([]);
    try {
      const codes = (await decodeBarcodes(file)).map((r) => r.text);
      if (!codes.length) toast.warning(t("scan.galleryNone"), t("scan.galleryNoneDesc"));
      else {
        setQ(codes[0]);
        if (codes.length > 1) setFound(codes);
      }
    } catch {
      toast.error(t("scan.galleryError"));
    } finally {
      setReading(false);
    }
  };

  return (
    <MScreen title={t("scan.title")} back="/m/home">
      <div className="sticky top-0 z-10 bg-white px-2">
        <Tabs
          value={tab}
          onChange={setTab}
          className="[&>button]:flex-1"
          tabs={[
            { id: "scan", label: t("m.tab.scan") },
            { id: "search", label: t("g.search") },
          ]}
        />
      </div>
      {tab === "scan" ? (
        <div className="space-y-4 p-4">
          {result && (
            <div className="animate-slide-up">
              {result.product ? (
                <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-emerald-100">
                  <div className="flex gap-3">
                    <ProductArt category={result.product.category} className="h-16 w-16" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">{result.product.name}</p>
                      <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                        <p>
                          <Badge tone="gray" className="mr-1">REF</Badge>
                          {result.product.ref}
                        </p>
                        {result.lot && (
                          <p>
                            <Badge tone="gray" className="mr-1">LOT</Badge>
                            {result.lot.lotNo}
                          </p>
                        )}
                        {result.exp && (
                          <p>
                            <Badge tone={daysBetween(DEMO_TODAY, result.exp) < 90 ? "amber" : "gray"} className="mr-1">EXP</Badge>
                            {date(result.exp)}
                            {daysBetween(DEMO_TODAY, result.exp) < 90 && (
                              <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600">
                                <AlertTriangle className="h-3 w-3" /> {t("m.scan.expiring")}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs">
                    {d.hospitals
                      .filter((h) => me.hospitalIds.includes(h.id))
                      .slice(0, 4)
                      .map((h) => (
                        <div key={h.id}>
                          <p className="truncate text-slate-500">{h.code}</p>
                          <p className="font-semibold text-slate-800">{consignmentStock(d, h.id, result.product!.id)}</p>
                        </div>
                      ))}
                  </div>
                  <p className="mt-1 text-center text-[10px] text-slate-400">{t("m.scan.consignStock")}</p>
                  <Link href={`/m/products/${result.product.id}${result.lot ? `?lot=${result.lot.id}` : ""}`} className="mt-3 block">
                    <Button className="w-full" size="lg">
                      <History className="h-4 w-4" /> {t("m.scan.viewHistory")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
                  <XCircle className="h-6 w-6 shrink-0 text-rose-500" />
                  <div>
                    <p className="font-semibold text-rose-700">{t("scan.notFound")}</p>
                    <p className="font-mono text-xs text-rose-600/80">{result.code}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <ScannerView key={camOn} autoStart={camOn > 0} samples={productSamples(d)} onResult={(code) => setResult({ ...parseBarcode(d, code), code })} />
        </div>
      ) : (
        <div className="space-y-2 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setFound([]); }} placeholder={t("m.scan.searchPh")} className="h-11 pl-9" autoFocus />
            </div>
            <Button
              variant="outline"
              className="h-11 w-11 shrink-0 px-0"
              aria-label={t("scan.startCamera")}
              title={t("scan.startCamera")}
              onClick={() => {
                setTab("scan");
                setCamOn((n) => n + 1);
              }}
            >
              <Camera className="h-5 w-5 min-w-5 shrink-0 text-brand-600" />
            </Button>
            <Button variant="outline" className="h-11 w-11 shrink-0 px-0" aria-label={t("scan.gallery")} title={t("scan.gallery")} loading={reading} onClick={() => gallery.current?.click()}>
              {!reading && <ImageIcon className="h-5 w-5 min-w-5 shrink-0 text-brand-600" />}
            </Button>
            <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(e) => { void fromGallery(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          {found.length > 1 && (
            <div className="rounded-xl bg-brand-50/70 p-2.5 ring-1 ring-brand-100">
              <p className="mb-1.5 text-[11px] font-semibold text-brand-800">{t("scan.galleryPick", { n: found.length })}</p>
              <div className="flex flex-wrap gap-1.5">
                {found.map((c, i) => (
                  <button
                    key={`${c}-${i}`}
                    onClick={() => setQ(c)}
                    className={`rounded-lg px-2 py-1 font-mono text-[11px] ring-1 ${q === c ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          {products.length === 0 && <EmptyState title={t("g.noResults")} />}
          {products.map((p) => (
            <Link key={p.id} href={`/m/products/${p.id}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card">
              <ProductArt category={p.category} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                <p className="text-[11px] text-slate-500">
                  REF {p.ref} · {p.category}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </MScreen>
  );
}
