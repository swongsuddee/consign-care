"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { AlertTriangle, Info, Package, Plus, Send, Trash2, Truck } from "lucide-react";
import { ProductArt } from "@/components/art";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, PageLoader, Select, Textarea } from "@/components/ui";
import { PageHeader, TableWrap, Td, Th } from "@/components/admin/kit";
import { ProductPicker, type ProductPickerHandle } from "@/components/admin/ProductPicker";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { caseUsage, name, warehouseStock } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import type { RequisitionItem } from "@/lib/types";

export default function NewRequisitionPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewRequisition />
    </Suspense>
  );
}

const DEPT_BY_CATEGORY: Record<string, string> = {
  Arthroscopy: "d-ortho",
  Cardiology: "d-cardio",
  Neurovascular: "d-neuro",
  Pharmaceutical: "d-wh",
};

function NewRequisition() {
  const { t, lang } = useFmt();
  const d = useData();
  const run = useOp();
  const router = useRouter();
  const sp = useSearchParams();
  const picker = useRef<ProductPickerHandle>(null);

  const initCase = d.cases.find((c) => c.id === sp.get("caseId"));
  const initItems: RequisitionItem[] = [];
  if (initCase)
    for (const u of caseUsage(d, initCase.id)) {
      const ex = initItems.find((x) => x.productId === u.productId);
      if (ex) ex.qty += u.qty;
      else initItems.push({ productId: u.productId, qty: u.qty, reason: t("a.rq.usedInCase", { no: initCase.no }) });
    }
  const firstCat = initItems[0] ? d.products.find((p) => p.id === initItems[0].productId)?.category ?? "" : "";
  const initHosp = initCase ? d.hospitals.find((h) => h.id === initCase.hospitalId) : undefined;

  const [caseId, setCaseId] = useState(initCase?.id ?? "");
  const [departmentId, setDepartmentId] = useState(initCase ? DEPT_BY_CATEGORY[firstCat] ?? "d-ortho" : "");
  const [hospitalId, setHospitalId] = useState(initCase?.hospitalId ?? "");
  const [purpose, setPurpose] = useState(initCase ? t("a.rq.purposeCase", { no: initCase.no, h: name(initHosp, lang) }) : "");
  const [items, setItems] = useState<RequisitionItem[]>(initItems);
  const [tried, setTried] = useState(false);

  const linkable = d.cases.filter((c) => ["WAITING_PO", "PO_RECEIVED", "QUOTED", "USAGE_RECORDED"].includes(c.status));
  const shortage = items.some((i) => warehouseStock(d, i.productId) < i.qty);

  const pickCase = (id: string) => {
    setCaseId(id);
    const c = d.cases.find((x) => x.id === id);
    if (!c) return;
    setHospitalId(c.hospitalId);
    const its: RequisitionItem[] = [];
    for (const u of caseUsage(d, c.id)) {
      const ex = its.find((x) => x.productId === u.productId);
      if (ex) ex.qty += u.qty;
      else its.push({ productId: u.productId, qty: u.qty, reason: t("a.rq.usedInCase", { no: c.no }) });
    }
    setItems(its);
    setPurpose(t("a.rq.purposeCase", { no: c.no, h: name(d.hospitals.find((h) => h.id === c.hospitalId), lang) }));
  };

  const add = (productId: string) =>
    setItems((its) => {
      const i = its.findIndex((x) => x.productId === productId);
      if (i >= 0) return its.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x));
      return [...its, { productId, qty: 1, reason: "" }];
    });

  const update = (i: number, patch: Partial<RequisitionItem>) => setItems((its) => its.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const submit = () => {
    setTried(true);
    if (!departmentId || !purpose.trim() || items.length === 0 || items.some((i) => i.qty <= 0)) {
      toast.error(t("a.rq.invalid"));
      return;
    }
    const r = run(ops.createRequisition, {
      departmentId,
      purpose: purpose.trim(),
      caseId: caseId || undefined,
      hospitalId: hospitalId || undefined,
      items,
    });
    toast.success(t("a.rq.submitted", { no: r.no }), t("a.rq.submittedDesc"));
    router.push(`/admin/requisitions/${r.id}`);
  };

  return (
    <div>
      <PageHeader back={initCase ? `/admin/cases/${initCase.id}` : "/admin/requisitions"} title={t("a.rq.new")} subtitle={t("a.rq.newSub")} />

      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader icon={<Truck className="h-5 w-5" />} title={t("a.rq.header")} />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label={t("a.rq.department")} required>
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={tried && !departmentId ? "border-rose-300" : ""}>
                <option value="">{t("g.pleaseSelect")}</option>
                {d.departments.map((x) => (
                  <option key={x.id} value={x.id}>
                    {name(x, lang)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("a.rq.linkCase")} hint={t("g.optional")}>
              <Select value={caseId} onChange={(e) => (e.target.value ? pickCase(e.target.value) : setCaseId(""))}>
                <option value="">{t("a.qt.noCase")}</option>
                {initCase && !linkable.includes(initCase) && <option value={initCase.id}>{initCase.no}</option>}
                {linkable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.no} · {name(d.hospitals.find((x) => x.id === c.hospitalId), lang)} · {t(`cs.${c.status}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("a.rq.destination")} hint={t("a.rq.destinationHint")} className="md:col-span-2">
              <Select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
                <option value="">{t("a.rq.internal")}</option>
                {d.hospitals.map((x) => (
                  <option key={x.id} value={x.id}>
                    {t("a.rq.consignmentAt", { h: name(x, lang) })}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("a.rq.purpose")} required className="md:col-span-2">
              <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={t("a.rq.purposePh")} className={tried && !purpose.trim() ? "border-rose-300" : ""} />
            </Field>
          </div>
          {initCase && caseId === initCase.id && (
            <div className="mx-5 mb-5 flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" /> {t("a.rq.prefilled", { no: initCase.no })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader icon={<Package className="h-5 w-5" />} title={t("g.items")} subtitle={t("a.rq.itemsSub")} />
          <div className="border-b border-slate-100 p-4">
            <ProductPicker ref={picker} onPick={(p) => add(p.productId)} showStock />
          </div>
          {items.length === 0 ? (
            <EmptyState icon={<Package className="h-6 w-6" />} title={t("a.qt.noItems")} desc={t("a.qt.noItemsDesc")} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t("a.itemName")}</Th>
                  <Th right>{t("a.rq.whStock")}</Th>
                  <Th right>{t("g.qty")}</Th>
                  <Th>{t("g.reason")}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const p = d.products.find((x) => x.id === it.productId);
                  const stock = warehouseStock(d, it.productId);
                  const short = stock < it.qty;
                  return (
                    <tr key={it.productId}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <ProductArt category={p?.category ?? ""} className="h-8 w-8 rounded-lg" />
                          <div>
                            <p className="font-medium text-slate-800">{p?.name}</p>
                            <p className="font-mono text-[11px] text-slate-400">{p?.ref}</p>
                          </div>
                        </div>
                      </Td>
                      <Td right>
                        <Badge tone={short ? "red" : stock <= (p?.reorderPoint ?? 0) ? "amber" : "green"}>
                          {stock} {t(`unit.${p?.unit}`)}
                        </Badge>
                      </Td>
                      <Td right>
                        <Input type="number" min={1} value={it.qty} onChange={(e) => update(i, { qty: Math.max(0, Number(e.target.value)) })} className="h-9 w-20 text-right" />
                      </Td>
                      <Td>
                        <Input value={it.reason} onChange={(e) => update(i, { reason: e.target.value })} placeholder={t("a.rq.reasonPh")} className="h-9 min-w-[220px]" />
                      </Td>
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
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={() => picker.current?.focus()} className="border-dashed text-brand-700">
              <Plus className="h-4 w-4" /> {t("g.addItem")}
            </Button>
            {shortage && (
              <p className="flex items-center gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="h-4 w-4" /> {t("a.rq.shortage")}
              </p>
            )}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" onClick={submit} className="w-full sm:w-auto">
            <Send className="h-4 w-4" /> {t("a.rq.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
