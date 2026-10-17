"use client";

import { ScanLine, Search } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ProductArt } from "@/components/art";
import { ScannerModal } from "@/components/Scanner";
import { toast } from "@/components/toast";
import { Button, cx } from "@/components/ui";
import { useT } from "@/i18n";
import { productSamples } from "@/lib/samples";
import { parseBarcode, warehouseStock } from "@/lib/selectors";
import { useData } from "@/lib/store";

export interface PickedProduct {
  productId: string;
  lotId?: string;
  exp?: string;
  method: "SEARCH" | "SCAN" | "TYPED";
}

export interface ProductPickerHandle {
  focus: () => void;
}

/** "Search or scan item" – typeahead over products plus a barcode scanner button */
export const ProductPicker = forwardRef<ProductPickerHandle, { onPick: (p: PickedProduct) => void; showStock?: boolean; className?: string }>(
  function ProductPicker({ onPick, showStock, className }, ref) {
    const { t } = useT();
    const d = useData();
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const [scan, setScan] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const box = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        input.current?.focus();
        setOpen(true);
      },
    }));

    useEffect(() => {
      const h = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);

    const results = useMemo(() => {
      const k = q.trim().toLowerCase();
      return d.products
        .filter((p) => !k || [p.name, p.ref, p.gtin, p.category].some((x) => x.toLowerCase().includes(k)))
        .slice(0, 8);
    }, [d.products, q]);

    const pick = (productId: string) => {
      onPick({ productId, method: "SEARCH" });
      setQ("");
      setOpen(false);
    };

    const onScan = (code: string, method: "SCAN" | "TYPED") => {
      const r = parseBarcode(d, code);
      if (!r.product) {
        toast.error(t("scan.notFound"), code);
        return;
      }
      onPick({ productId: r.product.id, lotId: r.lot?.id, exp: r.exp, method });
      toast.success(`${t("scan.found")} · ${r.product.name}`, `REF ${r.product.ref}${r.lot ? ` · LOT ${r.lot.lotNo}` : ""}${r.exp ? ` · EXP ${r.exp}` : ""}`);
      setScan(false);
    };

    return (
      <div ref={box} className={cx("relative flex gap-2", className)}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={input}
            value={q}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const exact = parseBarcode(d, q);
                if (exact.product && q.trim().length >= 6) {
                  onScan(q, "TYPED");
                  setQ("");
                } else if (results[0]) pick(results[0].id);
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={t("a.picker.ph")}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {open && (
            <div className="absolute left-0 right-0 top-11 z-30 max-h-72 overflow-y-auto rounded-xl border border-slate-100 bg-white py-1 shadow-2xl animate-slide-down">
              {results.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">{t("g.noResults")}</p>}
              {results.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => pick(p.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-50/60"
                >
                  <ProductArt category={p.category} className="h-9 w-9 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{p.name}</span>
                    <span className="block truncate font-mono text-[11px] text-slate-500">
                      {p.ref} · {p.gtin}
                    </span>
                  </span>
                  {showStock && (
                    <span className="shrink-0 text-[11px] text-slate-500">
                      {t("a.picker.wh")} {warehouseStock(d, p.id)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="button" variant="secondary" onClick={() => setScan(true)} aria-label={t("scan.title")}>
          <ScanLine className="h-4 w-4" />
          <span className="hidden sm:inline">{t("a.picker.scan")}</span>
        </Button>
        <ScannerModal open={scan} onClose={() => setScan(false)} onResult={onScan} samples={productSamples(d)} />
      </div>
    );
  },
);
