"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ClipboardList, FileText, Minus, Plus, ScanLine, Trash2 } from "lucide-react";
import { HospitalArt, ProductArt } from "@/components/art";
import { ScannerView } from "@/components/Scanner";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, cx } from "@/components/ui";
import { KV, LinkButton, PageHeader, TableWrap, Td, Th } from "@/components/admin/kit";
import { ProductPicker } from "@/components/admin/ProductPicker";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { productSamples } from "@/lib/samples";
import { consignmentStock, name, parseBarcode } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import type { Case, UsageSource } from "@/lib/types";

interface Line {
  key: string;
  productId: string;
  lotId?: string;
  exp?: string;
  qty: number;
  source: UsageSource;
}

const STEPS = ["a.usage.s1", "a.usage.s2", "a.usage.s3", "a.usage.s4"];

export default function NewUsagePage() {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const run = useOp();
  const [step, setStep] = useState(0);
  const [hospitalId, setHospitalId] = useState("");
  const [repId, setRepId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [procedure, setProcedure] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [poNo, setPoNo] = useState("");
  const [done, setDone] = useState<Case | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const h = d.hospitals.find((x) => x.id === hospitalId);
  const reps = d.users.filter((u) => u.role === "SALES_REP" && (!hospitalId || u.hospitalIds.includes(hospitalId)));
  const doctors = d.doctors.filter((x) => !hospitalId || x.hospitalIds.includes(hospitalId));

  const addLine = (productId: string, lotId: string | undefined, exp: string | undefined, source: UsageSource) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.productId === productId && l.lotId === lotId);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { key: `${productId}-${lotId ?? "x"}-${Date.now()}`, productId, lotId, exp, qty: 1, source }];
    });
  };

  const onScan = (code: string) => {
    const r = parseBarcode(d, code);
    if (!r.product) {
      toast.error(t("scan.notFound"), code);
      return;
    }
    addLine(r.product.id, r.lot?.id, r.exp, "SCAN");
    setLastScan(r.product.id + (r.lot?.id ?? ""));
    toast.success(`${t("scan.found")} · ${r.product.name}`, `REF ${r.product.ref}${r.lot ? ` · LOT ${r.lot.lotNo}` : ""}${r.exp ? ` · EXP ${r.exp}` : ""}`);
  };

  const items = lines.map((l) => ({ ...l, product: d.products.find((p) => p.id === l.productId)!, price: hospitalId ? ops.priceFor(d, hospitalId, l.productId) : 0 }));
  const sum = ops.totals(items.map((i) => ({ productId: i.productId, unit: "", qty: i.qty, unitPrice: i.price })), 0);

  const canNext = step === 0 ? !!hospitalId && !!repId : step === 1 ? lines.length > 0 : true;

  const confirm = () => {
    const c = run(ops.createCase, {
      hospitalId,
      caseDate: ops.DEMO_TODAY,
      photos: [],
      doctorId: doctorId || undefined,
      procedure: procedure || undefined,
      repId,
      poNo: poNo.trim() || undefined,
      items: lines.map((l) => ({ productId: l.productId, qty: l.qty, lotId: l.lotId, source: l.source })),
    });
    toast.success(t("a.usage.created", { no: c.no }), t("act.usageRecorded", { ref: c.no }));
    setDone(c);
  };

  const reset = () => {
    setStep(0);
    setLines([]);
    setPoNo("");
    setDone(null);
    setDoctorId("");
    setProcedure("");
  };

  if (done)
    return (
      <div className="mx-auto max-w-xl">
        <Card className="overflow-hidden text-center">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-10 text-white">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/20 ring-8 ring-white/10">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="mt-4 text-2xl font-bold">{t("a.usage.doneTitle")}</p>
            <p className="mt-1 text-white/85">{t("a.usage.doneDesc", { no: done.no, n: lines.length })}</p>
          </div>
          <div className="space-y-3 p-6">
            <div className="grid grid-cols-3 gap-3 text-left">
              <KV label={t("a.cases.no")}>{done.no}</KV>
              <KV label={t("g.hospital")}>{name(h, lang)}</KV>
              <KV label={t("a.cases.value")}>{money(sum.total)}</KV>
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <LinkButton href={`/admin/cases/${done.id}`} size="lg" className="flex-1">
                <ClipboardList className="h-5 w-5" /> {t("a.usage.openCase")}
              </LinkButton>
              <LinkButton href={`/admin/quotations/new?caseId=${done.id}`} size="lg" variant="outline" className="flex-1">
                <FileText className="h-5 w-5" /> {t("a.next.createQt")}
              </LinkButton>
            </div>
            <Button variant="ghost" onClick={reset} className="w-full">
              <Plus className="h-4 w-4" /> {t("a.usage.another")}
            </Button>
          </div>
        </Card>
      </div>
    );

  return (
    <div>
      <PageHeader title={t("a.usage.title")} subtitle={t("a.usage.subtitle")} />

      {/* stepper */}
      <Card className="mb-6 px-4 py-4 sm:px-6">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={cx("flex min-w-0 items-center gap-2", i < step && "cursor-pointer")}
                disabled={i > step}
              >
                <span
                  className={cx(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                    i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-slate-100 text-slate-400",
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cx("hidden truncate text-sm font-medium md:block", i === step ? "text-navy-800" : "text-slate-500")}>{t(s)}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cx("h-0.5 flex-1 rounded", i < step ? "bg-emerald-300" : "bg-slate-200")} />}
            </li>
          ))}
        </ol>
      </Card>

      {step === 0 && (
        <Card>
          <CardHeader icon={<Building2 className="h-5 w-5" />} title={t("a.usage.s1")} subtitle={t("a.usage.s1Sub")} />
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {d.hospitals.map((x) => (
              <button
                key={x.id}
                onClick={() => {
                  setHospitalId(x.id);
                  const r = d.users.find((u) => u.role === "SALES_REP" && u.hospitalIds.includes(x.id));
                  setRepId(r?.id ?? "");
                }}
                className={cx(
                  "overflow-hidden rounded-2xl border-2 text-left transition",
                  hospitalId === x.id ? "border-brand-600 shadow-lg shadow-brand-600/10" : "border-slate-100 hover:border-brand-200",
                )}
              >
                <HospitalArt palette={x.palette} className="h-24 w-full" />
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{name(x, lang)}</p>
                    <p className="text-xs text-slate-400">{x.code}</p>
                  </div>
                  {hospitalId === x.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />}
                </div>
              </button>
            ))}
          </div>
          <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-3">
            <Field label={t("g.rep")} required>
              <Select value={repId} onChange={(e) => setRepId(e.target.value)} disabled={!hospitalId}>
                <option value="">{t("g.pleaseSelect")}</option>
                {reps.map((u) => (
                  <option key={u.id} value={u.id}>
                    {name(u, lang)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("g.doctor")} hint={t("g.optional")}>
              <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">{t("g.pleaseSelect")}</option>
                {doctors.map((x) => (
                  <option key={x.id} value={x.id}>
                    {name(x, lang)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("g.procedure")} hint={t("g.optional")}>
              <Select value={procedure} onChange={(e) => setProcedure(e.target.value)}>
                <option value="">{t("g.pleaseSelect")}</option>
                {d.procedures.map((x) => (
                  <option key={x.id} value={x.id}>
                    {name(x, lang)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      )}

      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader icon={<ScanLine className="h-5 w-5" />} title={t("a.usage.s2")} subtitle={t("a.usage.s2Sub")} />
            <div className="p-5">
              <ScannerView onResult={onScan} samples={productSamples(d)} />
            </div>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader title={t("a.usage.scanned")} subtitle={`${name(h, lang)} · ${t("a.usage.scannedSub", { n: lines.reduce((a, l) => a + l.qty, 0) })}`} />
            <div className="border-b border-slate-100 p-4">
              <ProductPicker
                onPick={(p) => {
                  addLine(p.productId, p.lotId, p.exp, p.method === "SEARCH" ? "MANUAL" : "SCAN");
                }}
              />
              <p className="mt-2 text-xs text-slate-400">{t("a.usage.manualHint")}</p>
            </div>
            {lines.length === 0 ? (
              <EmptyState icon={<ScanLine className="h-6 w-6" />} title={t("a.usage.emptyTitle")} desc={t("a.usage.emptyDesc")} />
            ) : (
              <ul className="divide-y divide-slate-50">
                {items.map((l) => {
                  const lot = d.lots.find((x) => x.id === l.lotId);
                  const cons = consignmentStock(d, hospitalId, l.productId);
                  return (
                    <li key={l.key} className={cx("flex items-center gap-3 px-4 py-3 transition", lastScan === l.productId + (l.lotId ?? "") && "bg-emerald-50/60")}>
                      <ProductArt category={l.product.category} className="h-11 w-11 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{l.product.name}</p>
                        <p className="flex flex-wrap gap-x-3 font-mono text-[11px] text-slate-500">
                          <span>REF {l.product.ref}</span>
                          {lot && <span>LOT {lot.lotNo}</span>}
                          {l.exp && <span>EXP {date(l.exp)}</span>}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge tone={l.source === "SCAN" ? "sky" : "gray"}>{t(`src.${l.source}`)}</Badge>
                          {cons < l.qty && <Badge tone="amber">{t("a.usage.lowConsignment", { n: cons })}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg ring-1 ring-slate-200 hover:bg-slate-50"
                          onClick={() => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))}
                          aria-label="-"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-semibold tabular-nums">{l.qty}</span>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg ring-1 ring-slate-200 hover:bg-slate-50"
                          onClick={() => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))}
                          aria-label="+"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label={t("g.delete")}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card className="mx-auto max-w-xl">
          <CardHeader icon={<ClipboardList className="h-5 w-5" />} title={t("a.usage.s3")} subtitle={t("a.usage.s3Sub")} />
          <div className="space-y-3 p-5">
            <Field label={t("a.pos.poNo")} hint={t("g.optional")}>
              <Input value={poNo} onChange={(e) => setPoNo(e.target.value)} placeholder="BKH-PO-26-XXXX" autoFocus />
            </Field>
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">{t("a.usage.poHint")}</p>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader title={t("a.usage.s4")} subtitle={t("a.usage.s4Sub")} />
          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 p-5 md:grid-cols-5">
            <KV label={t("g.hospital")}>{name(h, lang)}</KV>
            <KV label={t("g.rep")}>{name(d.users.find((u) => u.id === repId), lang)}</KV>
            <KV label={t("g.doctor")}>{name(d.doctors.find((x) => x.id === doctorId), lang)}</KV>
            <KV label={t("g.date")}>{date(ops.DEMO_TODAY)}</KV>
            <KV label={t("a.pos.poNo")}>{poNo || "-"}</KV>
          </div>
          <TableWrap>
            <thead>
              <tr>
                <Th>{t("g.product")}</Th>
                <Th>{t("g.ref")}</Th>
                <Th>{t("g.lot")}</Th>
                <Th right>{t("g.qty")}</Th>
                <Th right>{t("g.contractPrice")}</Th>
                <Th right>{t("g.amount")}</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.key}>
                  <Td className="font-medium text-slate-800">{l.product.name}</Td>
                  <Td className="font-mono text-xs">{l.product.ref}</Td>
                  <Td className="font-mono text-xs">{d.lots.find((x) => x.id === l.lotId)?.lotNo ?? t("a.usage.fefo")}</Td>
                  <Td right>{l.qty}</Td>
                  <Td right>{money(l.price)}</Td>
                  <Td right className="font-medium">{money(l.price * l.qty)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <div className="flex flex-col items-end gap-1 px-5 py-4 text-sm">
            <div className="flex w-64 justify-between text-slate-500">
              <span>{t("g.subtotal")}</span>
              <span className="tabular-nums">{money(sum.subtotal)}</span>
            </div>
            <div className="flex w-64 justify-between text-slate-500">
              <span>{t("g.vat")}</span>
              <span className="tabular-nums">{money(sum.vat)}</span>
            </div>
            <div className="flex w-64 justify-between text-base font-bold text-navy-800">
              <span>{t("g.grandTotal")}</span>
              <span className="tabular-nums">{money(sum.total)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* footer nav */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> {t("g.back")}
        </Button>
        {step < 3 ? (
          <Button size="lg" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            {step === 2 && !poNo ? t("a.usage.skip") : t("g.next")} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" variant="success" onClick={confirm}>
            <CheckCircle2 className="h-5 w-5" /> {t("a.usage.confirm")}
          </Button>
        )}
      </div>
    </div>
  );
}
