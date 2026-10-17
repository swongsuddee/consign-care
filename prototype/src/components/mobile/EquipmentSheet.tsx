"use client";

import { Check, Minus, Plus, ScanLine, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductArt } from "@/components/art";
import { useMyHospitals } from "@/components/mobile/bits";
import { Button, cx } from "@/components/ui";
import { useT } from "@/i18n";
import { name } from "@/lib/selectors";
import { useData } from "@/lib/store";
import type { Data, PickedItem } from "@/lib/types";

/** Units on the shelf per lot, across the given hospitals' consignment locations. */
export function onHandByLot(d: Data, hospitalIds: string[]) {
  const hs = new Set(hospitalIds);
  const locs = new Set(d.locations.filter((l) => l.hospitalId && hs.has(l.hospitalId)).map((l) => l.id));
  const onHand = new Map<string, number>();
  for (const b of d.stock) if (locs.has(b.locationId) && b.qty > 0) onHand.set(b.lotId, (onHand.get(b.lotId) ?? 0) + b.qty);
  return onHand;
}

export function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label="remove">
      <X className="h-4 w-4" />
    </button>
  );
}

/** − qty + ; going below 1 removes the line. */
export function Stepper({ value, onChange, max }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <div className={cx("flex shrink-0 items-center rounded-full", value > 0 ? "bg-brand-50 ring-1 ring-brand-200" : "bg-slate-100")}>
      <button onClick={() => onChange(value - 1)} disabled={value <= 0} className="grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent" aria-label="−">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={cx("w-6 text-center text-xs font-semibold tabular-nums", value > 0 ? "text-brand-700" : "text-slate-400")}>{value}</span>
      <button onClick={() => onChange(value + 1)} disabled={max != null && value >= max} className="grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent" aria-label="+">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Bottom sheet of the consignment stock the rep can use: every lot on the shelf at the chosen hospital
 * (or at all of the rep's hospitals until one is chosen), each with − qty + up to what is on hand.
 */
export function EquipmentSheet({
  open,
  onClose,
  hospitalId,
  picked,
  onQty,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  hospitalId: string;
  picked: PickedItem[];
  onQty: (productId: string, lotId: string, qty: number) => void;
  onScan: () => void;
}) {
  const { t, lang } = useT();
  const d = useData();
  const mine = useMyHospitals();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const hospital = d.hospitals.find((h) => h.id === hospitalId);
  const lots = useMemo(() => {
    const onHand = onHandByLot(d, hospital ? [hospital.id] : mine.map((h) => h.id));
    const needle = q.trim().toLowerCase();
    return [...onHand]
      .map(([lotId, qty]) => {
        const lot = d.lots.find((l) => l.id === lotId)!;
        return { lot, qty, product: d.products.find((p) => p.id === lot?.productId)! };
      })
      .filter((x) => x.lot && x.product)
      .filter((x) => !needle || [x.product.name, x.product.ref, x.lot.lotNo, x.product.category].some((s) => s.toLowerCase().includes(needle)))
      .sort((a, b) => a.product.name.localeCompare(b.product.name) || a.lot.expiryDate.localeCompare(b.lot.expiryDate));
  }, [d, hospital, mine, q]);

  if (!open) return null;
  const total = picked.reduce((a, x) => a + x.qty, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose}>
      <div className="flex max-h-[85%] w-full flex-col rounded-t-3xl bg-white @3xl/app:max-w-[640px] shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t("m.new.sheetTitle")}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300" />
        <div className="flex items-center justify-between px-4 pb-2 pt-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-800">{t("m.new.sheetTitle")}</h3>
            <p className="truncate text-[11px] text-slate-500">{hospital ? t("m.new.sheetStockAt", { h: name(hospital, lang) }) : t("m.new.sheetStockMine")}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100" aria-label={t("g.close")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2 px-4 pb-3">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("m.new.sheetSearch")} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          <Button variant="outline" className="h-10 shrink-0" onClick={onScan}>
            <ScanLine className="h-4 w-4" /> {t("m.new.sheetScan")}
          </Button>
        </div>
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
          {lots.length === 0 && <li className="px-4 py-10 text-center text-xs text-slate-400">{t("m.new.sheetNone")}</li>}
          {lots.map(({ lot, qty, product }) => {
            const sel = picked.find((x) => x.lotId === lot.id)?.qty ?? 0;
            return (
              <li key={lot.id} className={cx("flex items-center gap-3 px-4 py-2.5 transition", sel > 0 && "bg-brand-50/60")}>
                <ProductArt category={product.category} className="h-10 w-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{product.name}</span>
                  <span className="block truncate font-mono text-[10px] text-slate-500">
                    {product.ref} · LOT {lot.lotNo}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {t("g.exp")} {lot.expiryDate} · {t("m.new.onHand", { n: qty })}
                  </span>
                </span>
                <Stepper value={sel} max={qty} onChange={(n) => onQty(product.id, lot.id, n)} />
              </li>
            );
          })}
        </ul>
        <div className="border-t border-slate-100 p-3">
          <Button size="lg" className="w-full" onClick={onClose}>
            <Check className="h-4 w-4" /> {t("g.done")}
            {total > 0 && ` · ${t("m.new.selectedN", { n: total })}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
