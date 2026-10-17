"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle, Ban, CheckCircle2, Eye, Receipt, Search, Wallet, Clock } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Button, Card, EmptyState, PageLoader, StatTile, Tabs } from "@/components/ui";
import { ConfirmModal, PageHeader, SearchBox, TableWrap, Td, Th, openPrint, rowCls } from "@/components/admin/kit";
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
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "paid" | "void"; inv: Invoice } | null>(null);

  const ready = d.cases.filter((c) => WAITING_BILLING.includes(c.status));
  const amountFor = (caseId: string) => casePo(d, caseId)?.amount ?? caseQuotation(d, caseId)?.total ?? caseValue(d, caseId);

  const open = d.invoices.filter((i) => ["ISSUED", "OVERDUE"].includes(i.status));
  const overdue = open.filter((i) => effStatus(i) === "OVERDUE");
  const paidMonth = d.invoices.filter((i) => i.status === "PAID" && i.paidAt && inMonth(i.paidAt.slice(0, 10)));
  const sum = (xs: Invoice[]) => xs.reduce((a, i) => a + i.amount, 0);

  const k = q.trim().toLowerCase();
  const match = (caseId: string, extra: string[] = []) => {
    if (!k) return true;
    const c = d.cases.find((x) => x.id === caseId);
    const h = d.hospitals.find((x) => x.id === c?.hospitalId);
    return [c?.no ?? "", h?.name ?? "", h?.nameTh ?? "", ...extra].some((s) => s.toLowerCase().includes(k));
  };

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
          <SearchBox value={q} onChange={setQ} placeholder={t("g.search")} icon={<Search className="h-4 w-4" />} className="mb-3 lg:w-72" />
        </div>

        {tab === "ready" &&
          (ready.filter((c) => match(c.id)).length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title={t("a.bill.readyEmpty")} />
          ) : (
            <TableWrap maxH="560px">
              <thead>
                <tr>
                  <Th>{t("g.case")}</Th>
                  <Th>{t("g.hospital")}</Th>
                  <Th>{t("doc.po")}</Th>
                  <Th>{t("doc.requisition")}</Th>
                  <Th>{t("g.status")}</Th>
                  <Th right>{t("g.amount")}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {ready
                  .filter((c) => match(c.id))
                  .map((c) => {
                    const po = casePo(d, c.id);
                    const rq = caseRequisition(d, c.id);
                    return (
                      <tr key={c.id} className={rowCls}>
                        <Td>
                          <Link href={`/admin/cases/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                            {c.no}
                          </Link>
                          <p className="text-xs text-slate-400">{date(c.caseDate)}</p>
                        </Td>
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
          ))}

        {tab === "invoices" &&
          (d.invoices.filter((i) => match(i.caseId, [i.no])).length === 0 ? (
            <EmptyState title={t("g.noResults")} />
          ) : (
            <TableWrap maxH="560px">
              <thead>
                <tr>
                  <Th>{t("a.bill.invNo")}</Th>
                  <Th>{t("g.hospital")}</Th>
                  <Th>{t("g.case")}</Th>
                  <Th right>{t("g.amount")}</Th>
                  <Th>{t("a.bill.issueDate")}</Th>
                  <Th>{t("a.bill.due")}</Th>
                  <Th>{t("g.status")}</Th>
                  <Th right>{t("g.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {d.invoices
                  .filter((i) => match(i.caseId, [i.no]))
                  .map((i) => {
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
                            <Button size="sm" variant="ghost" onClick={() => openPrint("invoice", i.id, false)} title={t("g.view")}>
                              <Eye className="h-3.5 w-3.5" /> <span className="hidden xl:inline">{t("g.view")}</span>
                            </Button>
                            {["ISSUED", "OVERDUE"].includes(i.status) && (
                              <>
                                <Button size="sm" variant="success" onClick={() => setConfirm({ kind: "paid", inv: i })}>
                                  <Wallet className="h-3.5 w-3.5" /> {t("a.bill.markPaid")}
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
          ))}
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
