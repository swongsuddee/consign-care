"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowRight, Boxes, ScanLine, Search } from "lucide-react";
import { ProductArt, BarcodeArt } from "@/components/art";
import { Avatar } from "@/components/PersonaSwitcher";
import { ScannerModal } from "@/components/Scanner";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, PageLoader, Tabs, cx, type Tone } from "@/components/ui";
import { KV, PageHeader, TableWrap, Td, Th, rowCls } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { productSamples } from "@/lib/samples";
import { name, parseBarcode, productQty, usageRows } from "@/lib/selectors";
import { useData, useStore } from "@/lib/store";
import type { Data, Product } from "@/lib/types";

export default function InventoryPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <InventoryInner />
    </Suspense>
  );
}

const MV_TONE: Record<string, Tone> = { IN: "green", OUT: "orange", TRANSFER: "violet", ADJUST: "gray" };

function matches(d: Data, p: Product, k: string) {
  if (!k) return true;
  const lots = d.lots.filter((l) => l.productId === p.id).map((l) => l.lotNo.toLowerCase());
  return [p.name, p.ref, p.gtin, p.category].some((x) => x.toLowerCase().includes(k)) || lots.some((l) => l.includes(k));
}

function InventoryInner() {
  const { t, num } = useFmt();
  const d = useData();
  const sp = useSearchParams();
  const initQ = sp.get("q") ?? "";
  const [q, setQ] = useState(initQ);
  const [scan, setScan] = useState(false);
  const [selected, setSelected] = useState<string>(() => {
    const k = initQ.trim().toLowerCase();
    const parsed = initQ ? parseBarcode(d, initQ).product : undefined;
    return parsed?.id ?? d.products.find((p) => matches(d, p, k))?.id ?? d.products[0]?.id ?? "";
  });

  // follow ?q= changes while already on this page (top-bar search)
  useEffect(() => {
    if (!initQ) return;
    const dd = useStore.getState().data;
    setQ(initQ);
    const hit = parseBarcode(dd, initQ).product ?? dd.products.find((p) => matches(dd, p, initQ.trim().toLowerCase()));
    if (hit) setSelected(hit.id);
  }, [initQ]);

  const k = q.trim().toLowerCase();
  const list = useMemo(() => {
    const byCode = q.trim().length >= 6 ? parseBarcode(d, q).product : undefined;
    return d.products.filter((p) => matches(d, p, k) || p.id === byCode?.id);
  }, [d, q, k]);

  const product = d.products.find((p) => p.id === selected);

  const onScan = (code: string) => {
    const r = parseBarcode(d, code);
    setScan(false);
    if (!r.product) {
      toast.error(t("scan.notFound"), code);
      return;
    }
    setQ(r.product.ref);
    setSelected(r.product.id);
    toast.success(`${t("scan.found")} · ${r.product.name}`, r.lot ? `LOT ${r.lot.lotNo}` : r.product.ref);
  };

  return (
    <div>
      <PageHeader title={t("a.inv.title")} subtitle={t("a.inv.subtitle")} />

      <Card className="mb-6 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                const kk = e.target.value.trim().toLowerCase();
                const code = e.target.value.trim().length >= 6 ? parseBarcode(d, e.target.value).product : undefined;
                const first = code ?? d.products.find((p) => matches(d, p, kk));
                if (first) setSelected(first.id);
              }}
              placeholder={t("a.inv.searchPh")}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-base placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <Button size="lg" variant="secondary" onClick={() => setScan(true)}>
            <ScanLine className="h-5 w-5" /> <span className="hidden sm:inline">{t("a.picker.scan")}</span>
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("a.inv.products")} · {list.length}
          </div>
          {list.length === 0 ? (
            <EmptyState icon={<Boxes className="h-6 w-6" />} title={t("g.noResults")} />
          ) : (
            <ul className="thin-scrollbar max-h-[70vh] divide-y divide-slate-50 overflow-y-auto">
              {list.map((p) => {
                const total = productQty(d, p.id);
                const wh = productQty(d, p.id, ops.WAREHOUSE);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelected(p.id)}
                      className={cx("flex w-full items-center gap-3 px-4 py-3 text-left transition", selected === p.id ? "bg-brand-50" : "hover:bg-slate-50")}
                    >
                      <ProductArt category={p.category} className="h-10 w-10 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className={cx("block truncate text-sm font-medium", selected === p.id ? "text-brand-700" : "text-slate-800")}>{p.name}</span>
                        <span className="block truncate font-mono text-[11px] text-slate-500">{p.ref}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-semibold tabular-nums text-slate-800">{num(total)}</span>
                        {wh < p.reorderPoint && <Badge tone="amber">{t("a.inv.low")}</Badge>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {product ? <ProductDetail p={product} /> : <Card><EmptyState title={t("g.noResults")} /></Card>}
      </div>

      <ScannerModal open={scan} onClose={() => setScan(false)} onResult={onScan} samples={productSamples(d)} />
    </div>
  );
}

function ProductDetail({ p }: { p: Product }) {
  const { t, lang, money, num, date, dateTime } = useFmt();
  const d = useData();
  const [tab, setTab] = useState<"tx" | "stock" | "usage">("tx");

  const total = productQty(d, p.id);
  const wh = productQty(d, p.id, ops.WAREHOUSE);
  const supplier = d.suppliers.find((s) => s.id === p.supplierId);
  const balances = d.stock
    .filter((s) => s.qty !== 0)
    .map((s) => ({ s, lot: d.lots.find((l) => l.id === s.lotId)!, loc: d.locations.find((l) => l.id === s.locationId) }))
    .filter((x) => x.lot && x.lot.productId === p.id)
    .sort((a, b) => a.lot.expiryDate.localeCompare(b.lot.expiryDate));
  const positive = balances.filter((b) => b.s.qty > 0);
  const nearest = positive[0]?.lot;
  const locNames = Array.from(new Set(positive.map((b) => name(b.loc, lang))));
  const lotNos = Array.from(new Set(positive.map((b) => b.lot.lotNo)));
  const moves = d.movements.filter((m) => m.productId === p.id).sort((a, b) => b.at.localeCompare(a.at));
  const usage = usageRows(d).filter((r) => r.u.productId === p.id);
  const daysLeft = nearest ? ops.daysBetween(ops.DEMO_TODAY, nearest.expiryDate) : undefined;

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-slate-100 p-5 md:flex-row">
        <ProductArt category={p.category} className="h-24 w-24 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-navy-800">{p.name}</h2>
            <Badge tone="blue">{p.category}</Badge>
            {wh < p.reorderPoint && <Badge tone="amber">{t("a.inv.belowRop", { n: p.reorderPoint })}</Badge>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <KV label={t("a.inv.code")}>
              <span className="font-mono">{p.ref}</span>
            </KV>
            <KV label={t("a.inv.barcode")}>
              <span className="font-mono">{p.gtin}</span>
            </KV>
            <KV label={t("a.inv.currentStock")}>
              <span className="text-lg font-bold text-navy-800">
                {num(total)} <span className="text-xs font-medium text-slate-500">{t(`unit.${p.unit}`)}</span>
              </span>
            </KV>
            <KV label={t("g.unit")}>{t(`unit.${p.unit}`)}</KV>
            <KV label={t("a.inv.nearestExp")}>
              {nearest ? (
                <span className={cx(daysLeft !== undefined && daysLeft <= 90 && "text-amber-700")}>
                  {date(nearest.expiryDate)}
                  {daysLeft !== undefined && daysLeft <= 90 && <span className="ml-1 text-xs">({t("a.inv.daysLeft", { n: daysLeft })})</span>}
                </span>
              ) : (
                "—"
              )}
            </KV>
            <KV label={t("a.inv.location")} className="col-span-2 sm:col-span-3">
              <span className="flex flex-wrap gap-1.5 whitespace-normal">
                {locNames.length
                  ? locNames.map((l) => (
                      <span key={l} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {l}
                      </span>
                    ))
                  : "—"}
              </span>
            </KV>
            <KV label={t("a.inv.batch")}>
              <span className="whitespace-normal font-mono text-xs">{lotNos.join(", ") || "—"}</span>
            </KV>
            <KV label={t("a.pr.supplier")}>{supplier?.name ?? "—"}</KV>
            <KV label={t("a.unitPrice")}>{money(p.listPrice)}</KV>
          </div>
        </div>
        <div className="hidden w-48 shrink-0 xl:block">
          <div className="rounded-xl border border-slate-100 bg-white p-3">
            <BarcodeArt value={p.gtin} />
            <p className="mt-1 text-center font-mono text-[11px] text-slate-500">{p.gtin}</p>
          </div>
        </div>
      </div>

      {/* split */}
      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-5 sm:grid-cols-3">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-800 ring-1 ring-blue-100">
          <p className="text-xs font-medium opacity-80">{t("a.inv.warehouse")}</p>
          <p className="text-xl font-bold tabular-nums">{num(wh)}</p>
        </div>
        <div className="rounded-xl bg-violet-50 p-3 text-violet-800 ring-1 ring-violet-100">
          <p className="text-xs font-medium opacity-80">{t("a.inv.consignment")}</p>
          <p className="text-xl font-bold tabular-nums">{num(total - wh)}</p>
        </div>
        <div className="col-span-2 rounded-xl bg-slate-50 p-3 text-slate-700 ring-1 ring-slate-100 sm:col-span-1">
          <p className="text-xs font-medium opacity-80">{t("a.inv.rop")}</p>
          <p className="text-xl font-bold tabular-nums">{num(p.reorderPoint)}</p>
        </div>
      </div>

      <Tabs
        className="px-3"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "tx", label: t("a.inv.txHistory"), count: moves.length },
          { id: "stock", label: t("a.inv.stockDetails"), count: positive.length },
          { id: "usage", label: t("a.inv.usageHistory"), count: usage.length },
        ]}
      />

      {tab === "tx" &&
        (moves.length === 0 ? (
          <EmptyState title={t("g.noData")} />
        ) : (
          <TableWrap maxH="480px">
            <thead>
              <tr>
                <Th>{t("g.date")}</Th>
                <Th>{t("a.inv.type")}</Th>
                <Th right>{t("g.qty")}</Th>
                <Th>{t("g.lot")}</Th>
                <Th>{t("a.inv.fromTo")}</Th>
                <Th>{t("a.inv.refNo")}</Th>
                <Th>{t("g.by")}</Th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => {
                const u = d.users.find((x) => x.id === m.by);
                const sign = m.type === "IN" || (m.type === "ADJUST" && !m.fromLocationId) ? "+" : m.type === "OUT" ? "−" : "";
                return (
                  <tr key={m.id} className={rowCls}>
                    <Td className="whitespace-nowrap text-xs">{dateTime(m.at)}</Td>
                    <Td>
                      <Badge tone={MV_TONE[m.type]}>{t(`mv.${m.type}`)}</Badge>
                    </Td>
                    <Td right className={cx("font-semibold", sign === "+" ? "text-emerald-700" : sign === "−" ? "text-orange-700" : "text-violet-700")}>
                      {sign}
                      {num(m.qty)}
                    </Td>
                    <Td className="font-mono text-xs">{d.lots.find((l) => l.id === m.lotId)?.lotNo}</Td>
                    <Td className="text-xs">
                      <span className="inline-flex items-center gap-1">
                        {m.fromLocationId ? name(d.locations.find((l) => l.id === m.fromLocationId), lang) : t("a.inv.external")}
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        {m.toLocationId ? name(d.locations.find((l) => l.id === m.toLocationId), lang) : t("a.inv.consumed")}
                      </span>
                    </Td>
                    <Td className="font-mono text-xs font-medium text-slate-800">{m.refDocNo}</Td>
                    <Td>
                      <span className="flex items-center gap-1.5 text-xs">
                        <Avatar user={u} size={20} /> {name(u, lang)}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        ))}

      {tab === "stock" &&
        (balances.length === 0 ? (
          <EmptyState title={t("g.noData")} />
        ) : (
          <TableWrap maxH="480px">
            <thead>
              <tr>
                <Th>{t("a.inv.location")}</Th>
                <Th>{t("g.lot")}</Th>
                <Th>{t("g.exp")}</Th>
                <Th right>{t("a.inv.balance")}</Th>
                <Th>{t("a.inv.expiry")}</Th>
              </tr>
            </thead>
            <tbody>
              {balances.map(({ s, lot, loc }) => {
                const dl = ops.daysBetween(ops.DEMO_TODAY, lot.expiryDate);
                return (
                  <tr key={s.locationId + s.lotId} className={rowCls}>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Badge tone={loc?.type === "WAREHOUSE" ? "blue" : "violet"}>{loc?.type === "WAREHOUSE" ? t("a.inv.wh") : t("a.inv.cons")}</Badge>
                        {name(loc, lang)}
                      </span>
                    </Td>
                    <Td className="font-mono text-xs">{lot.lotNo}</Td>
                    <Td className="whitespace-nowrap">{date(lot.expiryDate)}</Td>
                    <Td right className={cx("font-semibold", s.qty < 0 && "text-rose-600")}>{num(s.qty)}</Td>
                    <Td>
                      <Badge tone={dl < 0 ? "red" : dl <= 30 ? "red" : dl <= 90 ? "amber" : "green"}>
                        {dl < 0 ? t("a.inv.expired") : t("a.inv.daysLeft", { n: dl })}
                      </Badge>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        ))}

      {tab === "usage" &&
        (usage.length === 0 ? (
          <EmptyState title={t("a.inv.noUsage")} />
        ) : (
          <TableWrap maxH="480px">
            <thead>
              <tr>
                <Th>{t("g.date")}</Th>
                <Th>{t("g.hospital")}</Th>
                <Th>{t("g.case")}</Th>
                <Th>{t("g.lot")}</Th>
                <Th right>{t("g.qty")}</Th>
                <Th>{t("g.rep")}</Th>
                <Th>{t("g.status")}</Th>
              </tr>
            </thead>
            <tbody>
              {usage.map(({ u, c, lot }) => {
                const rep = d.users.find((x) => x.id === c.repId);
                return (
                  <tr key={u.id} className={rowCls}>
                    <Td className="whitespace-nowrap">{date(c.caseDate)}</Td>
                    <Td className="max-w-[200px] truncate">{name(d.hospitals.find((h) => h.id === c.hospitalId), lang)}</Td>
                    <Td>
                      <Link href={`/admin/cases/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                        {c.no}
                      </Link>
                    </Td>
                    <Td className="font-mono text-xs">{lot?.lotNo ?? "—"}</Td>
                    <Td right>{u.qty}</Td>
                    <Td>{name(rep, lang)}</Td>
                    <Td>
                      <StatusChip kind="case" status={c.status} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        ))}
    </Card>
  );
}
