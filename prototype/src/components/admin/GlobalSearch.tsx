"use client";

import { Boxes, FileText, FolderKanban, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { useT } from "@/i18n";
import { name } from "@/lib/selectors";
import { useData } from "@/lib/store";

interface Hit {
  href: string;
  title: string;
  sub: string;
  kind: "case" | "product" | "doc";
}

/** Top-bar search across cases, products and documents */
export function GlobalSearch({ className }: { className?: string }) {
  const { t, lang } = useT();
  const d = useData();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const k = q.trim().toLowerCase();
    if (k.length < 2) return [];
    const hosp = (id: string) => name(d.hospitals.find((h) => h.id === id), lang);
    const cases: Hit[] = d.cases
      .filter((c) => [c.no, c.patientHn ?? "", hosp(c.hospitalId)].some((x) => x.toLowerCase().includes(k)))
      .slice(0, 5)
      .map((c) => ({ href: `/admin/cases/${c.id}`, title: c.no, sub: `${hosp(c.hospitalId)} · ${t(`cs.${c.status}`)}`, kind: "case" }));
    const products: Hit[] = d.products
      .filter((p) => [p.name, p.ref, p.gtin].some((x) => x.toLowerCase().includes(k)))
      .slice(0, 4)
      .map((p) => ({ href: `/admin/inventory?q=${encodeURIComponent(p.ref)}`, title: p.name, sub: `${p.ref} · ${p.gtin}`, kind: "product" }));
    const docs: Hit[] = [
      ...d.quotations.map((x) => ({ href: `/admin/quotations/${x.id}`, title: x.no, sub: t("doc.quotation"), kind: "doc" as const })),
      ...d.requisitions.map((x) => ({ href: `/admin/requisitions/${x.id}`, title: x.no, sub: t("doc.requisition"), kind: "doc" as const })),
      ...d.purchaseRequests.map((x) => ({ href: `/admin/purchase-requests/${x.id}`, title: x.no, sub: t("doc.pr"), kind: "doc" as const })),
      ...d.customerPos.map((x) => ({ href: `/admin/pos`, title: x.poNo, sub: t("doc.po"), kind: "doc" as const })),
      ...d.incomingPos.map((x) => ({ href: `/admin/pos?po=${encodeURIComponent(x.poNo)}`, title: x.poNo, sub: t("a.pos.incoming"), kind: "doc" as const })),
      ...d.invoices.map((x) => ({ href: `/admin/billing?tab=invoices`, title: x.no, sub: t("doc.invoice"), kind: "doc" as const })),
    ]
      .filter((x) => x.title.toLowerCase().includes(k))
      .slice(0, 4);
    return [...cases, ...products, ...docs];
  }, [q, d, lang, t]);

  const go = (h?: Hit) => {
    const k = q.trim();
    if (h) router.push(h.href);
    else if (k) router.push(`/admin/cases?q=${encodeURIComponent(k)}`);
    setOpen(false);
    setQ("");
  };

  const icon = { case: FolderKanban, product: Boxes, doc: FileText };

  return (
    <div ref={box} className={cx("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setSel(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setSel((s) => Math.min(s + 1, hits.length - 1));
          if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, 0));
          if (e.key === "Enter") go(hits[sel]);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={t("a.search.ph")}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 min-w-[280px] overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-2xl animate-slide-down">
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">{t("g.noResults")}</p>
          ) : (
            hits.map((h, i) => {
              const Icon = icon[h.kind];
              return (
                <button
                  key={h.href + h.title}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(h)}
                  className={cx("flex w-full items-center gap-3 px-4 py-2 text-left", i === sel && "bg-brand-50/70")}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{h.title}</span>
                    <span className="block truncate text-xs text-slate-500">{h.sub}</span>
                  </span>
                </button>
              );
            })
          )}
          <button onClick={() => go()} className="w-full border-t border-slate-100 px-4 py-2 text-left text-xs font-medium text-brand-700 hover:bg-slate-50">
            {t("a.search.allCases", { q: q.trim() })}
          </button>
        </div>
      )}
    </div>
  );
}
