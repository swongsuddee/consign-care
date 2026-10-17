"use client";

import { use, useState } from "react";
import { Check, CheckCircle2, FileDown, FileSpreadsheet, PackageCheck, Send, ShoppingCart, XCircle } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Button, Card, CardHeader, EmptyState, cx } from "@/components/ui";
import { ConfirmModal, DecisionModal, DocPreview, KV, LinkButton, PageHeader, openPrint } from "@/components/admin/kit";
import { prDoc } from "@/lib/documents";
import { exportExcel } from "@/lib/excel";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { name } from "@/lib/selectors";
import { useData, useOp, useStore } from "@/lib/store";
import type { PRStatus } from "@/lib/types";

const FLOW: PRStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "RECEIVED"];

export default function PRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const run = useOp();
  const [decide, setDecide] = useState<boolean | null>(null);
  const [confirm, setConfirm] = useState<"order" | "receive" | null>(null);
  const pr = d.purchaseRequests.find((x) => x.id === id);
  const doc = pr ? prDoc(d, pr.id) : null;

  if (!pr || !doc)
    return (
      <Card>
        <EmptyState title={t("a.notFound")} action={<LinkButton href="/admin/purchase-requests">{t("a.nav.prs")}</LinkButton>} />
      </Card>
    );

  const s = d.suppliers.find((x) => x.id === pr.supplierId);
  const total = pr.items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
  const idx = FLOW.indexOf(pr.status);

  const excel = () =>
    exportExcel(`${pr.no}.xlsx`, pr.no, [
      ["ใบขอซื้อ / Purchase Request", pr.no],
      ["Supplier", s?.name ?? ""],
      ["Needed by", pr.neededBy],
      [],
      ["No.", "Code", "Description", "Qty", "Unit", "Unit Price", "Amount"],
      ...pr.items.map((it, i) => {
        const p = d.products.find((x) => x.id === it.productId);
        return [i + 1, p?.ref ?? "", p?.name ?? "", it.qty, p?.unit ?? "", it.unitPrice, it.qty * it.unitPrice];
      }),
      [],
      ["", "", "", "", "", "Total", total],
    ]);

  return (
    <div>
      <PageHeader
        back="/admin/purchase-requests"
        title={`${t("doc.pr")} ${pr.no}`}
        badge={<StatusChip kind="pr" status={pr.status} className="text-xs" />}
        subtitle={`${s?.name ?? ""} · ${date(pr.createdAt)}`}
        actions={
          <>
            <Button variant="outline" onClick={excel}>
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
            </Button>
            <Button className="!bg-rose-600 hover:!bg-rose-700" onClick={() => openPrint("pr", pr.id)}>
              <FileDown className="h-4 w-4" /> {t("doc.downloadPdf")}
            </Button>
          </>
        }
      />

      {/* progress */}
      {pr.status !== "REJECTED" && (
        <Card className="mb-6 px-4 py-4 sm:px-6">
          <ol className="flex items-center gap-2">
            {FLOW.map((st, i) => (
              <li key={st} className="flex flex-1 items-center gap-2 last:flex-none">
                <span className="flex items-center gap-2">
                  <span
                    className={cx(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                      i < idx || pr.status === "RECEIVED" ? "bg-emerald-500 text-white" : i === idx ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {i < idx || pr.status === "RECEIVED" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cx("hidden text-xs font-medium md:block", i <= idx ? "text-slate-700" : "text-slate-400")}>{t(`rs.${st}`)}</span>
                </span>
                {i < FLOW.length - 1 && <span className={cx("h-0.5 flex-1 rounded", i < idx ? "bg-emerald-300" : "bg-slate-200")} />}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden bg-slate-100/70 p-3 sm:p-6">
          <DocPreview doc={doc} />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={<ShoppingCart className="h-5 w-5" />} title={t("a.rq.workflow")} />
            <div className="space-y-3 p-5">
              {pr.status === "DRAFT" && (
                <>
                  <p className="text-sm text-slate-600">{t("a.pr.draftDesc")}</p>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      run(ops.submitPR, pr.id);
                      useStore.getState().mutate((dd) => ops.notify(dd, "u-somchai", "approvalRequested", pr.no, "/admin/approvals"));
                      toast.success(t("a.pr.created", { no: pr.no }), t("a.pr.sentForApproval"));
                    }}
                  >
                    <Send className="h-5 w-5" /> {t("a.pr.submit")}
                  </Button>
                </>
              )}
              {pr.status === "SUBMITTED" && (
                <>
                  <p className="text-sm text-slate-600">{t("a.pr.awaitApproval")}</p>
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
              {pr.status === "APPROVED" && (
                <>
                  <p className="text-sm text-slate-600">{t("a.pr.orderDesc", { s: s?.name ?? "" })}</p>
                  <Button size="lg" className="w-full" onClick={() => setConfirm("order")}>
                    <Send className="h-5 w-5" /> {t("a.pr.order")}
                  </Button>
                </>
              )}
              {pr.status === "ORDERED" && (
                <>
                  <p className="text-sm text-slate-600">{t("a.pr.receiveDesc", { spo: pr.supplierPoNo ?? "" })}</p>
                  <Button size="lg" variant="success" className="w-full" onClick={() => setConfirm("receive")}>
                    <PackageCheck className="h-5 w-5" /> {t("a.pr.receive")}
                  </Button>
                </>
              )}
              {pr.status === "RECEIVED" && (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("a.pr.receivedNote", { gr: pr.grNo ?? "" })}</span>
                </div>
              )}
              {pr.status === "REJECTED" && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-800">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("a.rq.rejectedNote")}</span>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("g.details")} />
            <div className="grid grid-cols-2 gap-4 p-5">
              <KV label={t("a.pr.supplier")} className="col-span-2">
                {s?.name}
              </KV>
              <KV label={t("a.pr.requester")}>{name(d.users.find((u) => u.id === pr.requesterId), lang)}</KV>
              <KV label={t("a.pr.neededBy")}>{date(pr.neededBy)}</KV>
              <KV label={t("a.pr.spo")}>{pr.supplierPoNo ?? "—"}</KV>
              <KV label={t("a.pr.gr")}>{pr.grNo ?? "—"}</KV>
              <KV label={t("a.appr.decidedBy")}>{pr.approvedBy ? name(d.users.find((u) => u.id === pr.approvedBy), lang) : "—"}</KV>
              <KV label={t("g.total")}>{money(total)}</KV>
            </div>
          </Card>
        </div>
      </div>

      {decide !== null && (
        <DecisionModal
          open
          approve={decide}
          refNo={pr.no}
          onClose={() => setDecide(null)}
          onSubmit={(note) => {
            run(ops.decidePR, pr.id, decide, note);
            if (decide) toast.success(t("a.toast.approved", { ref: pr.no }), t("a.pr.readyToOrder"));
            else toast.warning(t("a.toast.rejected", { ref: pr.no }));
          }}
        />
      )}
      <ConfirmModal
        open={confirm === "order"}
        onClose={() => setConfirm(null)}
        title={t("a.pr.order")}
        desc={t("a.pr.orderConfirm", { s: s?.name ?? "", email: s?.email ?? "" })}
        onConfirm={() => {
          run(ops.orderPR, pr.id);
          const no = useStore.getState().data.purchaseRequests.find((x) => x.id === pr.id)?.supplierPoNo ?? "";
          toast.success(t("a.pr.ordered", { no }), t("a.pr.orderedDesc", { email: s?.email ?? "" }));
        }}
      />
      <ConfirmModal
        open={confirm === "receive"}
        onClose={() => setConfirm(null)}
        title={t("a.pr.receive")}
        desc={t("a.pr.receiveConfirm")}
        onConfirm={() => {
          run(ops.receivePR, pr.id);
          const gr = useStore.getState().data.purchaseRequests.find((x) => x.id === pr.id)?.grNo ?? "";
          toast.success(t("a.pr.received", { gr }), t("a.pr.receivedDesc"));
        }}
      />
    </div>
  );
}
