"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle, Ban, CheckCircle2, Eye, Receipt, Wallet, Clock } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Button, Card, EmptyState, PageLoader, StatTile, Tabs } from "@/components/ui";
import { ConfirmModal, PageHeader, TableWrap, Td, openPrint, rowCls, useTable } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { casePo, caseQuotation, caseRequisition, caseValue, inMonth, name, WAITING_BILLING } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import type { Invoice } from "@/lib/types";

export default function BillingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <BillingInner />
    </Suspense>
  );
}

/** ISSUED invoices past due date are displayed as overdue */
function effStatus(i: Invoice) {
  return i.status === "ISSUED" && i.dueDate < ops.DEMO_TODAY ? "OVERDUE" : i.status;
}

function BillingInner() {
  const { t, lang, money, date, num } = useFmt();
  const d = useData();
  const run = useOp();
  const sp = useSearchParams();
  const [tab, setTab] = useState<"ready" | "invoices">(sp.get("tab") === "invoices" ? "invoices" : "ready");
  const [confirm, setConfirm] = useState<{ kind: "paid" | "void"; inv: Invoice } | null>(null);

  const ready = d.cases.filter((c) => WAITING_BILLING.includes(c.status));
  const amountFor = (caseId: string) => casePo(d, caseId)?.amount ?? caseQuotation(d, caseId)?.total ?? caseValue(d, caseId);

  const open = d.invoices.filter((i) => ["ISSUED", "OVERDUE"].includes(i.status));
  const overdue = open.filter((i) => effStatus(i) === "OVERDUE");
  const paidMonth = d.invoices.filter((i) => i.status === "PAID" && i.paidAt && inMonth(i.paidAt.slice(0, 10)));
  const sum = (xs: Invoice[]) => xs.reduce((a, i) => a + i.amount, 0);

  const hospOf = (id?: string) => d.hospitals.find((x) => x.id === id);
  const hospText = (id?: string) => `${hospOf(id)?.name ?? ""} ${hospOf(id)?.nameTh ?? ""}`;
  const caseNo = (id: string) => d.cases.find((x) => x.id === id)?.no ?? "";

  const readyTable = useTable(
    ready,
    [
      { key: "case", label: t("g.case"), sort: (c) => c.no, text: (c) => c.no },
      { key: "date", label: t("g.date"), sort: (c) => c.caseDate, range: { type: "date", get: (c) => c.caseDate } },
      { key: "hospital", label: t("g.hospital"), sort: (c) => name(hospOf(c.hospitalId), lang), text: (c) => hospText(c.hospitalId) },
      { key: "po", label: t("doc.po"), sort: (c) => casePo(d, c.id)?.poNo ?? "", text: (c) => casePo(d, c.id)?.poNo ?? "" },
      {
        key: "rq",
        label: t("doc.requisition"),
        sort: (c) => caseRequisition(d, c.id)?.status ?? "",
        options: [...["DRAFT", "SUBMITTED", "APPROVED", "ISSUED", "REJECTED"].map((s) => ({ value: s, label: t(`rs.${s}`) })), { value: "NONE", label: t("a.bill.noRequisition") }],
        value: (c) => caseRequisition(d, c.id)?.status ?? "NONE",
        multi: true,
      },
      { key: "status", label: t("g.status"), sort: (c) => t(`cs.${c.status}`), options: WAITING_BILLING.map((s) => ({ value: s, label: t(`cs.${s}`) })), value: (c) => c.status, multi: true },
      { key: "amount", label: t("g.amount"), right: true, sort: (c) => amountFor(c.id), range: { type: "number", get: (c) => amountFor(c.id), format: (n) => money(n, 0) } },
      { key: "action", label: "" },
    ],
    { key: "date", dir: "desc" },
  );

  const invTable = useTable(
    d.invoices,
    [
      { key: "no", label: t("a.bill.invNo"), sort: (i) => i.no, text: (i) => i.no },
      { key: "hospital", label: t("g.hospital"), sort: (i) => name(hospOf(i.hospitalId), lang), text: (i) => hospText(i.hospitalId) },
      { key: "case", label: t("g.case"), sort: (i) => caseNo(i.caseId), text: (i) => caseNo(i.caseId) },
      { key: "amount", label: t("g.amount"), right: true, sort: (i) => i.amount, range: { type: "number", get: (i) => i.amount, format: (n) => money(n, 0) } },
      { key: "issued", label: t("a.bill.issueDate"), sort: (i) => i.issueDate, range: { type: "date", get: (i) => i.issueDate } },
      { key: "due", label: t("a.bill.due"), sort: (i) => i.dueDate, range: { type: "date", get: (i) => i.dueDate } },
      { key: "status", label: t("g.status"), sort: (i) => effStatus(i), options: (["ISSUED", "OVERDUE", "PAID", "VOID"] as const).map((s) => ({ value: s, label: t(`is.${s}`) })), value: (i) => effStatus(i), multi: true },
      { key: "actions", label: "" },
    ],
    { key: "issued", dir: "desc" },
  );

  const issue = (caseId: string) => {
    const inv = run(ops.issueInvoice, caseId);
    const c = d.cases.find((x) => x.id === caseId);
    if (inv) toast.success(t("a.toast.invoiceIssued", { no: inv.no }), t("a.toast.caseBilled", { no: c?.no ?? "" }));
    else toast.error(t("a.toast.failed"));
  };

  return (
    <div>
      <PageHeader title={t("a.bill.title")} subtitle={t("a.bill.subtitle")} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile tone="purple" icon={<Receipt className="h-5 w-5" />} value={money(ready.reduce((a, c) => a + amountFor(c.id), 0), 0)} label={t("a.bill.readyTile", { n: ready.length })} onClick={() => setTab("ready")} />
        <StatTile tone="blue" icon={<Clock className="h-5 w-5" />} value={money(sum(open), 0)} label={t("a.bill.outstanding", { n: open.length })} onClick={() => setTab("invoices")} />
        <StatTile tone="rose" icon={<AlertCircle className="h-5 w-5" />} value={money(sum(overdue), 0)} label={t("a.bill.overdue", { n: overdue.length })} onClick={() => setTab("invoices")} />
        <StatTile tone="green" icon={<Wallet className="h-5 w-5" />} value={money(sum(paidMonth), 0)} label={t("a.bill.paidMonth", { n: paidMonth.length })} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-3 lg:flex-row lg:items-end lg:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            className="border-b-0"
            tabs={[
              { id: "ready", label: t("a.bill.ready"), count: ready.length },
              { id: "invoices", label: t("a.bill.invoices"), count: d.invoices.length },
            ]}
          />
        </div>

        {tab === "ready" && (
          <>
            {readyTable.summary}
            <TableWrap maxH="560px" dense>
              <thead>{readyTable.head}</thead>
              <tbody>
                {readyTable.rows.map((c) => {
                    const po = casePo(d, c.id);
                    const rq = caseRequisition(d, c.id);
                    return (
                      <tr key={c.id} className={rowCls}>
                        <Td>
                          <Link href={`/admin/cases/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                            {c.no}
                          </Link>
                        </Td>
                        <Td className="whitespace-nowrap">{date(c.caseDate)}</Td>
                        <Td className="max-w-[200px] truncate">{name(d.hospitals.find((h) => h.id === c.hospitalId), lang)}</Td>
                        <Td className="font-mono text-xs">{po?.poNo ?? "—"}</Td>
                        <Td>{rq ? <StatusChip kind="requisition" status={rq.status} /> : <span className="text-slate-300">—</span>}</Td>
                        <Td>
                          <StatusChip kind="case" status={c.status} />
                        </Td>
                        <Td right className="font-semibold">{money(amountFor(c.id))}</Td>
                        <Td right>
                          <Button size="sm" onClick={() => issue(c.id)}>
                            <Receipt className="h-3.5 w-3.5" /> {t("a.next.issueInvoice")}
                          </Button>
                        </Td>
                      </tr>
                    );
                  })}
              </tbody>
            </TableWrap>
            {readyTable.rows.length === 0 && <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title={ready.length ? t("g.noResults") : t("a.bill.readyEmpty")} />}
          </>
        )}

        {tab === "invoices" && (
          <>
            {invTable.summary}
            <TableWrap maxH="560px" dense>
              <thead>{invTable.head}</thead>
              <tbody>
                {invTable.rows.map((i) => {
                    const c = d.cases.find((x) => x.id === i.caseId);
                    const st = effStatus(i);
                    return (
                      <tr key={i.id} className={rowCls}>
                        <Td className="font-mono text-xs font-semibold text-slate-800">{i.no}</Td>
                        <Td className="max-w-[200px] truncate">{name(d.hospitals.find((h) => h.id === i.hospitalId), lang)}</Td>
                        <Td>
                          {c ? (
                            <Link href={`/admin/cases/${c.id}`} className="text-brand-700 hover:underline">
                              {c.no}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td right className="font-medium">{money(i.amount)}</Td>
                        <Td className="whitespace-nowrap">{date(i.issueDate)}</Td>
                        <Td className={`whitespace-nowrap ${st === "OVERDUE" ? "font-medium text-rose-600" : ""}`}>{date(i.dueDate)}</Td>
                        <Td>
                          <StatusChip kind="invoice" status={st} />
                        </Td>
                        <Td right>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openPrint("invoice", i.id, false)} title={t("g.view")} aria-label={t("g.view")}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {["ISSUED", "OVERDUE"].includes(i.status) && (
                              <>
                                <Button size="sm" variant="success" onClick={() => setConfirm({ kind: "paid", inv: i })}>
                                  <Wallet className="h-3.5 w-3.5" /> {t("a.bill.markPaidShort")}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setConfirm({ kind: "void", inv: i })} title={t("a.bill.void")}>
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
              </tbody>
            </TableWrap>
            {invTable.rows.length === 0 && <EmptyState title={t("g.noResults")} />}
          </>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-400">{t("a.bill.totalNote", { n: num(d.invoices.length) })}</p>

      <ConfirmModal
        open={confirm?.kind === "paid"}
        onClose={() => setConfirm(null)}
        title={t("a.bill.markPaid")}
        desc={confirm ? t("a.bill.markPaidConfirm", { no: confirm.inv.no, amount: money(confirm.inv.amount) }) : null}
        confirmLabel={t("a.bill.markPaid")}
        onConfirm={() => {
          if (!confirm) return;
          run(ops.markPaid, confirm.inv.id);
          const c = d.cases.find((x) => x.id === confirm.inv.caseId);
          toast.success(t("a.toast.paid", { no: confirm.inv.no }), c ? t("act.caseClosed", { ref: c.no }) : undefined);
        }}
      />
      <ConfirmModal
        open={confirm?.kind === "void"}
        onClose={() => setConfirm(null)}
        danger
        title={t("a.bill.void")}
        desc={confirm ? t("a.bill.voidConfirm", { no: confirm.inv.no }) : null}
        confirmLabel={t("a.bill.void")}
        onConfirm={() => {
          if (!confirm) return;
          run(ops.voidInvoice, confirm.inv.id);
          toast.warning(t("act.invoiceVoided", { ref: confirm.inv.no }));
        }}
      />
    </div>
  );
}
