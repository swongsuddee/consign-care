"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, FolderKanban, PackageCheck, Printer, Warehouse, XCircle } from "lucide-react";
import { ProductArt } from "@/components/art";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui";
import { DecisionModal, DocPreview, KV, LinkButton, PageHeader, TableWrap, Td, Th, openPrint } from "@/components/admin/kit";
import { requisitionDoc } from "@/lib/documents";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { name, productQty, warehouseStock } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import { useRouteParam } from "@/lib/route-param";

export default function RequisitionDetailPage({ id: idSeg }: { id: string }) {
  const id = useRouteParam("id", idSeg);
  const { t, lang, date, dateTime } = useFmt();
  const d = useData();
  const run = useOp();
  const [decide, setDecide] = useState<boolean | null>(null);
  const r = d.requisitions.find((x) => x.id === id);
  const doc = r ? requisitionDoc(d, r.id) : null;

  if (!r)
    return (
      <Card>
        <EmptyState title={t("a.notFound")} action={<LinkButton href="/admin/requisitions">{t("a.nav.requisitions")}</LinkButton>} />
      </Card>
    );

  const c = d.cases.find((x) => x.id === r.caseId);
  const h = d.hospitals.find((x) => x.id === r.hospitalId);
  const requester = d.users.find((u) => u.id === r.requesterId);
  const approver = d.users.find((u) => u.id === r.approvedBy);
  const moves = d.movements.filter((m) => m.refDocType === "REQUISITION" && m.refDocNo === r.no);

  const issue = () => {
    run(ops.issueRequisition, r.id);
    toast.success(t("a.toast.stockIssued", { no: r.no }), c ? t("a.rq.caseRequisitioned", { no: c.no }) : t("a.toast.stockIssuedDesc"));
  };

  return (
    <div>
      <PageHeader
        back={c ? `/admin/cases/${c.id}` : "/admin/requisitions"}
        title={`${t("doc.requisition")} ${r.no}`}
        badge={<StatusChip kind="requisition" status={r.status} className="text-xs" />}
        subtitle={`${name(d.departments.find((x) => x.id === r.departmentId), lang)} · ${dateTime(r.createdAt)}`}
        actions={
          <Button variant="outline" onClick={() => openPrint("requisition", r.id, false)}>
            <Printer className="h-4 w-4" /> {t("doc.print")}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("g.details")} />
            <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
              <KV label={t("a.rq.department")}>{name(d.departments.find((x) => x.id === r.departmentId), lang)}</KV>
              <KV label={t("a.rq.destination")}>{h ? name(h, lang) : t("a.rq.internal")}</KV>
              <KV label={t("a.rq.requester")}>{name(requester, lang)}</KV>
              <KV label={t("g.case")}>
                {c ? (
                  <Link href={`/admin/cases/${c.id}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                    <FolderKanban className="h-3.5 w-3.5" /> {c.no}
                  </Link>
                ) : (
                  "—"
                )}
              </KV>
              <KV label={t("a.rq.purpose")} className="col-span-2 md:col-span-4">
                <span className="whitespace-normal font-normal text-slate-700">{r.purpose}</span>
              </KV>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("g.items")} />
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t("a.itemName")}</Th>
                  <Th right>{t("g.qty")}</Th>
                  <Th>{t("g.reason")}</Th>
                  <Th right>{t("a.rq.whStock")}</Th>
                  {h && <Th right>{t("a.rq.atHospital")}</Th>}
                </tr>
              </thead>
              <tbody>
                {r.items.map((it) => {
                  const p = d.products.find((x) => x.id === it.productId);
                  const stock = warehouseStock(d, it.productId);
                  const short = r.status !== "ISSUED" && stock < it.qty;
                  return (
                    <tr key={it.productId}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <ProductArt category={p?.category ?? ""} className="h-8 w-8 rounded-lg" />
                          <div>
                            <Link href={`/admin/inventory?q=${encodeURIComponent(p?.ref ?? "")}`} className="font-medium text-slate-800 hover:text-brand-700">
                              {p?.name}
                            </Link>
                            <p className="font-mono text-[11px] text-slate-400">{p?.ref}</p>
                          </div>
                        </div>
                      </Td>
                      <Td right className="font-semibold">
                        {it.qty} <span className="text-xs font-normal text-slate-400">{t(`unit.${p?.unit}`)}</span>
                      </Td>
                      <Td className="text-slate-600">{it.reason || "—"}</Td>
                      <Td right>
                        <Badge tone={short ? "red" : "green"}>{stock}</Badge>
                      </Td>
                      {h && <Td right>{productQty(d, it.productId, ops.hospitalLoc(h.id))}</Td>}
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </Card>

          {moves.length > 0 && (
            <Card>
              <CardHeader icon={<Warehouse className="h-5 w-5" />} title={t("a.rq.movements")} subtitle={r.issuedAt ? dateTime(r.issuedAt) : undefined} />
              <TableWrap>
                <thead>
                  <tr>
                    <Th>{t("g.product")}</Th>
                    <Th>{t("g.lot")}</Th>
                    <Th>{t("a.inv.type")}</Th>
                    <Th right>{t("g.qty")}</Th>
                    <Th>{t("a.inv.fromTo")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {moves.map((m) => (
                    <tr key={m.id}>
                      <Td className="font-medium">{d.products.find((p) => p.id === m.productId)?.name}</Td>
                      <Td className="font-mono text-xs">{d.lots.find((l) => l.id === m.lotId)?.lotNo}</Td>
                      <Td>
                        <Badge tone={m.type === "TRANSFER" ? "violet" : "orange"}>{t(`mv.${m.type}`)}</Badge>
                      </Td>
                      <Td right>{m.qty}</Td>
                      <Td className="text-xs">
                        <span className="inline-flex items-center gap-1">
                          {name(d.locations.find((l) => l.id === m.fromLocationId), lang)}
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          {m.toLocationId ? name(d.locations.find((l) => l.id === m.toLocationId), lang) : t("a.inv.consumed")}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("a.rq.workflow")} />
            <div className="space-y-3 p-5">
              {r.status === "SUBMITTED" && (
                <>
                  <p className="text-sm text-slate-600">{t("a.rq.awaitApproval")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="success" size="lg" onClick={() => setDecide(true)}>
                      <CheckCircle2 className="h-5 w-5" /> {t("a.dec.approve")}
                    </Button>
                    <Button variant="outline" size="lg" className="text-rose-600" onClick={() => setDecide(false)}>
                      <XCircle className="h-5 w-5" /> {t("a.dec.reject")}
                    </Button>
                  </div>
                </>
              )}
              {r.status === "APPROVED" && (
                <>
                  <p className="text-sm text-slate-600">{h ? t("a.rq.issueDescHosp", { h: name(h, lang) }) : t("a.rq.issueDesc")}</p>
                  <Button size="lg" className="w-full" onClick={issue}>
                    <PackageCheck className="h-5 w-5" /> {t("a.rq.issue")}
                  </Button>
                </>
              )}
              {r.status === "ISSUED" && (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("a.rq.issuedOn", { date: date(r.issuedAt) })}</span>
                </div>
              )}
              {r.status === "REJECTED" && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-800">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("a.rq.rejectedNote")}</span>
                </div>
              )}
              {approver && (
                <p className="text-xs text-slate-500">
                  {t("a.appr.decidedBy")}: {name(approver, lang)}
                </p>
              )}
              {c && r.status === "ISSUED" && (
                <LinkButton href={`/admin/cases/${c.id}`} variant="outline" className="w-full">
                  <FolderKanban className="h-4 w-4" /> {t("a.pos.openCase", { no: c.no })}
                </LinkButton>
              )}
            </div>
          </Card>
          {doc && (
            <Card className="overflow-hidden bg-slate-100/70 p-3">
              <DocPreview doc={doc} />
            </Card>
          )}
        </div>
      </div>

      {decide !== null && (
        <DecisionModal
          open
          approve={decide}
          refNo={r.no}
          onClose={() => setDecide(null)}
          onSubmit={(note) => {
            run(ops.decideRequisition, r.id, decide, note);
            if (decide) toast.success(t("a.toast.approved", { ref: r.no }), t("a.rq.readyToIssue"));
            else toast.warning(t("a.toast.rejected", { ref: r.no }));
          }}
        />
      )}
    </div>
  );
}
