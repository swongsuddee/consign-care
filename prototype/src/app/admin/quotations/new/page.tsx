"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { AlertTriangle, FileText, Info, Package, Plus, Save, Trash2 } from "lucide-react";
import { HospitalArt, ProductArt } from "@/components/art";
import { toast } from "@/components/toast";
import { Button, Card, CardHeader, EmptyState, Field, Input, PageLoader, Select, Textarea } from "@/components/ui";
import { PageHeader, TableWrap, Td, Th } from "@/components/admin/kit";
import { ProductPicker, type ProductPickerHandle } from "@/components/admin/ProductPicker";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { caseQuotation, caseUsage, name } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import type { Data, DocItem } from "@/lib/types";

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewQuotation />
    </Suspense>
  );
}

function itemsFromCase(d: Data, caseId: string, hospitalId: string): DocItem[] {
  const out: DocItem[] = [];
  for (const u of caseUsage(d, caseId)) {
    const ex = out.find((x) => x.productId === u.productId);
    if (ex) ex.qty += u.qty;
    else {
      const p = d.products.find((x) => x.id === u.productId);
      out.push({ productId: u.productId, unit: p?.unit ?? "piece", qty: u.qty, unitPrice: ops.priceFor(d, hospitalId, u.productId) });
    }
  }
  return out;
}

function NewQuotation() {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const run = useOp();
  const router = useRouter();
  const sp = useSearchParams();
  const picker = useRef<ProductPickerHandle>(null);

  const initCase = d.cases.find((c) => c.id === sp.get("caseId"));
  const [caseId, setCaseId] = useState(initCase?.id ?? "");
  const existingQ = caseId ? caseQuotation(d, caseId) : undefined;
  const [hospitalId, setHospitalId] = useState(initCase?.hospitalId ?? sp.get("hospital") ?? "");
  const [docDate, setDocDate] = useState(ops.DEMO_TODAY);
  const [validUntil, setValidUntil] = useState(ops.addDays(ops.DEMO_TODAY, 30));
  const [items, setItems] = useState<DocItem[]>(() => (initCase ? itemsFromCase(d, initCase.id, initCase.hospitalId) : []));
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  const docNo = ops.nextQuotationNo(d);
  const h = d.hospitals.find((x) => x.id === hospitalId);
  const sum = ops.totals(items, discount);

  const candidateCases = d.cases.filter(
    (c) => ["DRAFT", "USAGE_RECORDED", "QUOTED"].includes(c.status) && !caseQuotation(d, c.id) && (!hospitalId || c.hospitalId === hospitalId || c.id === caseId),
  );

  const pickCase = (id: string) => {
    setCaseId(id);
    const c = d.cases.find((x) => x.id === id);
    if (c) {
      setHospitalId(c.hospitalId);
      setItems(itemsFromCase(d, c.id, c.hospitalId));
    }
  };

  const pickHospital = (id: string) => {
    setHospitalId(id);
    const c = d.cases.find((x) => x.id === caseId);
    if (c && c.hospitalId !== id) setCaseId("");
    // re-price at the new hospital's contract price
    setItems((its) => its.map((it) => ({ ...it, unitPrice: id ? ops.priceFor(d, id, it.productId) : it.unitPrice })));
  };

  const addProduct = (productId: string) => {
    const p = d.products.find((x) => x.id === productId);
    if (!p) return;
    setItems((its) => {
      const i = its.findIndex((x) => x.productId === productId);
      if (i >= 0) return its.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x));
      return [...its, { productId, unit: p.unit, qty: 1, unitPrice: hospitalId ? ops.priceFor(d, hospitalId, productId) : p.listPrice }];
    });
  };

  const update = (i: number, patch: Partial<DocItem>) => setItems((its) => its.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = () => {
    setTried(true);
    if (!hospitalId || items.length === 0 || items.some((i) => i.qty <= 0)) {
      toast.error(t("a.qt.invalid"), !hospitalId ? t("a.qt.needHospital") : t("a.qt.needItems"));
      return;
    }
    if (existingQ) {
      toast.error(t("a.qt.alreadyQuoted", { no: existingQ.no }));
      return;
    }
    const q = run(ops.createQuotation, {
      caseId: caseId || undefined,
      hospitalId,
      date: docDate,
      validUntil,
      items,
      discountPct: discount,
      note: note.trim() || undefined,
    });
    toast.success(t("a.qt.saved", { no: q.no }));
    router.push(`/admin/quotations/${q.id}`);
  };

  return (
    <div>
      <PageHeader
        back={initCase ? `/admin/cases/${initCase.id}` : "/admin/quotations"}
        title={t("a.qt.new")}
        subtitle={t("a.qt.newSub")}
        actions={
          <Button onClick={save} size="lg">
            <Save className="h-4 w-4" /> {t("a.qt.save")}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader icon={<FileText className="h-5 w-5" />} title={t("a.qt.header")} />
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t("a.docNo")}>
                <Input value={docNo} readOnly className="bg-slate-50 font-mono font-semibold text-navy-800" />
              </Field>
              <Field label={t("g.date")} required>
                <Input
                  type="date"
                  value={docDate}
                  onChange={(e) => {
                    setDocDate(e.target.value);
                    if (e.target.value) setValidUntil(ops.addDays(e.target.value, 30));
                  }}
                />
              </Field>
              <Field label={t("a.qt.validUntil")}>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </Field>
              <Field label={t("a.qt.linkCase")} hint={t("g.optional")}>
                <Select value={caseId} onChange={(e) => (e.target.value ? pickCase(e.target.value) : setCaseId(""))}>
                  <option value="">{t("a.qt.noCase")}</option>
                  {candidateCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.no} · {name(d.hospitals.find((x) => x.id === c.hospitalId), lang)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("a.customer")} required className="sm:col-span-2 lg:col-span-4">
                <Select value={hospitalId} onChange={(e) => pickHospital(e.target.value)} className={tried && !hospitalId ? "border-rose-300" : ""}>
                  <option value="">{t("g.pleaseSelect")}</option>
                  {d.hospitals.map((x) => (
                    <option key={x.id} value={x.id}>
                      {name(x, lang)} ({x.code})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {existingQ && (
              <div className="mx-5 mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {t("a.qt.alreadyQuoted", { no: existingQ.no })}{" "}
                  <Link href={`/admin/quotations/${existingQ.id}`} className="font-semibold underline">
                    {t("a.next.viewQt", { no: existingQ.no })}
                  </Link>
                </span>
              </div>
            )}
            {initCase && caseId === initCase.id && (
              <div className="mx-5 mb-5 flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
                <Info className="mt-0.5 h-4 w-4 shrink-0" /> {t("a.qt.prefilled", { no: initCase.no })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader icon={<Package className="h-5 w-5" />} title={t("g.items")} subtitle={t("a.qt.itemsSub")} />
            <div className="border-b border-slate-100 p-4">
              <ProductPicker ref={picker} onPick={(p) => addProduct(p.productId)} />
            </div>
            {items.length === 0 ? (
              <EmptyState icon={<Package className="h-6 w-6" />} title={t("a.qt.noItems")} desc={t("a.qt.noItemsDesc")} />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>{t("a.itemName")}</Th>
                    <Th>{t("g.unit")}</Th>
                    <Th right>{t("g.qty")}</Th>
                    <Th right>{t("g.contractPrice")}</Th>
                    <Th right>{t("g.amount")}</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const p = d.products.find((x) => x.id === it.productId);
                    return (
                      <tr key={it.productId}>
                        <Td className="text-slate-400">{i + 1}</Td>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <ProductArt category={p?.category ?? ""} className="h-8 w-8 rounded-lg" />
                            <div>
                              <p className="font-medium text-slate-800">{p?.name}</p>
                              <p className="font-mono text-[11px] text-slate-400">{p?.ref}</p>
                            </div>
                          </div>
                        </Td>
                        <Td>{t(`unit.${it.unit}`)}</Td>
                        <Td right>
                          <Input type="number" min={1} value={it.qty} onChange={(e) => update(i, { qty: Math.max(0, Number(e.target.value)) })} className="h-9 w-20 text-right" />
                        </Td>
                        <Td right>
                          <Input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => update(i, { unitPrice: Math.max(0, Number(e.target.value)) })} className="h-9 w-32 text-right" />
                        </Td>
                        <Td right className="font-semibold text-slate-800">{money(it.qty * it.unitPrice)}</Td>
                        <Td>
                          <button onClick={() => setItems((its) => its.filter((_, j) => j !== i))} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={t("g.delete")}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            )}
            <div className="p-4">
              <Button variant="outline" onClick={() => picker.current?.focus()} className="border-dashed text-brand-700">
                <Plus className="h-4 w-4" /> {t("g.addItem")}
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <Field label={t("g.note")} hint={t("g.optional")}>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("a.qt.notePh")} />
            </Field>
          </Card>
        </div>

        {/* summary */}
        <div className="space-y-6">
          <Card className="overflow-hidden xl:sticky xl:top-24">
            {h && (
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <HospitalArt palette={h.palette} className="h-12 w-16 rounded-lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{name(h, lang)}</p>
                  <p className="truncate text-xs text-slate-500">{h.contactEmail}</p>
                </div>
              </div>
            )}
            <div className="space-y-3 p-5">
              <Field label={`${t("g.discount")} (%)`}>
                <Input type="number" min={0} max={100} step="0.5" value={discount} onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))} />
              </Field>
              <dl className="space-y-2 border-t border-slate-100 pt-3 text-sm">
                <Row label={t("g.subtotal")} value={money(sum.subtotal)} />
                <Row label={`${t("g.discount")} ${discount ? `(${discount}%)` : ""}`} value={`-${money(sum.discount)}`} />
                <Row label={t("g.afterDiscount")} value={money(sum.net)} />
                <Row label={t("g.vat")} value={money(sum.vat)} />
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <dt className="font-semibold text-navy-800">{t("g.grandTotal")}</dt>
                  <dd className="text-xl font-bold tabular-nums text-navy-800">{money(sum.total)}</dd>
                </div>
              </dl>
              <p className="text-xs text-slate-400">
                {t("a.qt.validNote", { date: date(validUntil) })}
              </p>
              <Button onClick={save} size="lg" className="w-full">
                <Save className="h-4 w-4" /> {t("a.qt.save")}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
