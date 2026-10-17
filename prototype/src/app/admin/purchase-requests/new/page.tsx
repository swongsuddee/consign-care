"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Package, Plus, Save, Send, ShoppingCart, Trash2 } from "lucide-react";
import { ProductArt } from "@/components/art";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { PageHeader, TableWrap, Td, Th } from "@/components/admin/kit";
import { ProductPicker, type ProductPickerHandle } from "@/components/admin/ProductPicker";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { warehouseStock } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import type { PRItem } from "@/lib/types";

export default function NewPRPage() {
  const { t, money } = useFmt();
  const d = useData();
  const run = useOp();
  const router = useRouter();
  const picker = useRef<ProductPickerHandle>(null);
  const [supplierId, setSupplierId] = useState("");
  const [neededBy, setNeededBy] = useState(ops.addDays(ops.DEMO_TODAY, 14));
  const [items, setItems] = useState<PRItem[]>([]);
  const [note, setNote] = useState("");

  const total = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);

  const add = (productId: string) => {
    const p = d.products.find((x) => x.id === productId);
    if (!p) return;
    if (!supplierId) setSupplierId(p.supplierId);
    setItems((its) => {
      const i = its.findIndex((x) => x.productId === productId);
      if (i >= 0) return its.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x));
      return [...its, { productId, qty: Math.max(1, p.reorderPoint), unitPrice: Math.round(p.listPrice * 0.6 * 100) / 100 }];
    });
  };
  const update = (i: number, patch: Partial<PRItem>) => setItems((its) => its.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = (submit: boolean) => {
    if (!supplierId || items.length === 0 || items.some((i) => i.qty <= 0)) {
      toast.error(t("a.pr.invalid"));
      return;
    }
    const pr = run(ops.createPR, { supplierId, items, neededBy, note: note.trim() || undefined, submit });
    if (submit) toast.success(t("a.pr.created", { no: pr.no }), t("a.pr.sentForApproval"));
    else toast.info(t("a.pr.draftSaved", { no: pr.no }));
    router.push(`/admin/purchase-requests/${pr.id}`);
  };

  return (
    <div>
      <PageHeader back="/admin/purchase-requests" title={t("a.pr.new")} subtitle={t("a.pr.newSub")} />
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader icon={<ShoppingCart className="h-5 w-5" />} title={t("a.pr.header")} />
          <div className="grid gap-4 p-5 md:grid-cols-3">
            <Field label={t("a.docNo")}>
              <Input value={ops.nextPRNo(d)} readOnly className="bg-slate-50 font-mono font-semibold text-navy-800" />
            </Field>
            <Field label={t("a.pr.supplier")} required>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t("g.pleaseSelect")}</option>
                {d.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("a.pr.neededBy")} required>
              <Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Package className="h-5 w-5" />} title={t("g.items")} subtitle={t("a.pr.itemsSub")} />
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
                  <Th right>{t("a.pr.stockRop")}</Th>
                  <Th right>{t("g.qty")}</Th>
                  <Th right>{t("a.unitPrice")}</Th>
                  <Th right>{t("g.amount")}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const p = d.products.find((x) => x.id === it.productId);
                  const stock = warehouseStock(d, it.productId);
                  const otherSupplier = p && supplierId && p.supplierId !== supplierId;
                  return (
                    <tr key={it.productId}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <ProductArt category={p?.category ?? ""} className="h-8 w-8 rounded-lg" />
                          <div>
                            <p className="font-medium text-slate-800">{p?.name}</p>
                            <p className="font-mono text-[11px] text-slate-400">{p?.ref}</p>
                            {otherSupplier && <p className="text-[11px] text-amber-600">{t("a.pr.otherSupplier")}</p>}
                          </div>
                        </div>
                      </Td>
                      <Td right>
                        <Badge tone={stock < (p?.reorderPoint ?? 0) ? "amber" : "green"}>
                          {stock} / {p?.reorderPoint}
                        </Badge>
                      </Td>
                      <Td right>
                        <Input type="number" min={1} value={it.qty} onChange={(e) => update(i, { qty: Math.max(0, Number(e.target.value)) })} className="h-9 w-24 text-right" />
                      </Td>
                      <Td right>
                        <Input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => update(i, { unitPrice: Math.max(0, Number(e.target.value)) })} className="h-9 w-32 text-right" />
                      </Td>
                      <Td right className="font-semibold">{money(it.qty * it.unitPrice)}</Td>
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
          <div className="flex items-center justify-between gap-3 p-4">
            <Button variant="outline" onClick={() => picker.current?.focus()} className="border-dashed text-brand-700">
              <Plus className="h-4 w-4" /> {t("g.addItem")}
            </Button>
            <p className="text-sm">
              <span className="text-slate-500">{t("a.pr.estTotal")} </span>
              <b className="text-lg tabular-nums text-navy-800">{money(total)}</b>
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <Field label={t("g.note")} hint={t("g.optional")}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </Card>

        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <Button variant="outline" size="lg" onClick={() => save(false)}>
            <Save className="h-4 w-4" /> {t("a.pr.saveDraft")}
          </Button>
          <Button size="lg" onClick={() => save(true)}>
            <Send className="h-4 w-4" /> {t("a.pr.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
