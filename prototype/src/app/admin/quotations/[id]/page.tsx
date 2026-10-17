"use client";

import Link from "next/link";
import { use, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileDown, FileSpreadsheet, FolderKanban, Inbox, Lock, Mail, MessageCircle, Printer, XCircle } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui";
import { DecisionModal, DocPreview, KV, LinkButton, PageHeader, openPrint } from "@/components/admin/kit";
import { SendQuotationModal } from "@/components/admin/SendQuotationModal";
import { quotationDoc } from "@/lib/documents";
import { downloadDocExcel, downloadDocPdf } from "@/lib/exportDoc";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { name } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";

export default function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const run = useOp();
  const [send, setSend] = useState<"EMAIL" | "LINE" | null>(null);
  const [decide, setDecide] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const q = d.quotations.find((x) => x.id === id);
  const doc = q ? quotationDoc(d, q.id) : null;

  if (!q || !doc)
    return (
      <Card>
        <EmptyState title={t("a.notFound")} action={<LinkButton href="/admin/quotations">{t("a.nav.quotations")}</LinkButton>} />
      </Card>
    );

  const h = d.hospitals.find((x) => x.id === q.hospitalId);
  const c = d.cases.find((x) => x.id === q.caseId);
  const creator = d.users.find((u) => u.id === q.createdBy);
  const incoming = d.incomingPos.find((p) => p.quotationNo === q.no);
  const po = d.customerPos.find((p) => p.quotationId === q.id);
  const pending = q.status === "PENDING_APPROVAL";
  const canSend = ["DRAFT", "APPROVED", "SENT"].includes(q.status);
  const exportFile = async (kind: "pdf" | "xlsx") => {
    setBusy(kind);
    try {
      if (kind === "pdf") await downloadDocPdf(doc);
      else await downloadDocExcel(doc);
      toast.success(t("doc.downloaded", { file: `${q.no}.${kind}` }));
    } catch {
      toast.error(t("doc.downloadFailed"));
    } finally {
      setBusy(null);
    }
  };
  const approval = d.approvals.find((a) => a.entity === "QUOTATION" && a.entityId === q.id);

  return (
    <div>
      <PageHeader
        back={c ? `/admin/cases/${c.id}` : "/admin/quotations"}
        title={`${t("doc.quotation")} ${q.no}`}
        badge={<StatusChip kind="quotation" status={q.status} className="text-xs" />}
        subtitle={`${name(h, lang)} · ${date(q.date)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void exportFile("pdf")} loading={busy === "pdf"}>
              <FileDown className="h-4 w-4 text-rose-600" /> {t("doc.downloadPdf")}
            </Button>
            <Button variant="outline" onClick={() => void exportFile("xlsx")} loading={busy === "xlsx"}>
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {t("doc.downloadExcel")}
            </Button>
            <Button variant="ghost" onClick={() => openPrint("quotation", q.id)}>
              <Printer className="h-4 w-4" /> {t("doc.print")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden bg-slate-100/70 p-3 sm:p-6">
          <DocPreview doc={doc} />
        </Card>

        <div className="space-y-6">
          {/* actions */}
          <Card>
            <CardHeader title={t("a.qt.actions")} />
            <div className="space-y-3 p-5">
              {pending && (
                <>
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <b>{t("a.qt.pendingBannerTitle")}</b>
                      <br />
                      <span className="text-xs">{t("a.qt.pendingDetail", { pct: q.discountPct, limit: ops.DISCOUNT_APPROVAL_LIMIT })}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="success" onClick={() => setDecide(true)}>
                      <CheckCircle2 className="h-4 w-4" /> {t("a.dec.approve")}
                    </Button>
                    <Button variant="outline" className="text-rose-600" onClick={() => setDecide(false)}>
                      <XCircle className="h-4 w-4" /> {t("a.dec.reject")}
                    </Button>
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-2">
                <ActionTile icon={<FileDown className="h-5 w-5" />} label={t("doc.exportPdf")} cls="text-rose-600 bg-rose-50" onClick={() => void exportFile("pdf")} />
                <ActionTile icon={<Mail className="h-5 w-5" />} label={t("doc.sendEmail")} cls="text-brand-700 bg-brand-50" disabled={!canSend} onClick={() => setSend("EMAIL")} />
                <ActionTile icon={<MessageCircle className="h-5 w-5" />} label={t("doc.sendLine")} cls="text-[#06C755] bg-emerald-50" disabled={!canSend} onClick={() => setSend("LINE")} />
              </div>
              {!canSend && (
                <p className="flex items-start gap-1.5 text-xs text-slate-500">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {pending ? t("a.qt.lockedPending") : q.status === "REJECTED" ? t("a.qt.lockedRejected") : t("a.qt.lockedAccepted")}
                </p>
              )}
              {q.sentVia?.length ? (
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  {t("a.qt.sentVia")}:
                  {q.sentVia.map((s) => (
                    <Badge key={s} tone={s === "EMAIL" ? "blue" : "green"}>
                      {s === "EMAIL" ? "Email" : "LINE"}
                    </Badge>
                  ))}
                </p>
              ) : null}
            </div>
          </Card>

          {incoming && (
            <Card className="border-emerald-200 bg-emerald-50/60 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Inbox className="h-4 w-4" /> {t("a.qt.poReplied")}
              </p>
              <p className="mt-1 text-sm text-emerald-700">{t("a.next.poArrived", { po: incoming.poNo, ch: incoming.channel === "EMAIL" ? "Email" : "LINE" })}</p>
              <LinkButton href={`/admin/pos?po=${encodeURIComponent(incoming.poNo)}`} variant="success" className="mt-3 w-full">
                <ClipboardCheck className="h-4 w-4" /> {t("a.next.recordPoNo", { po: incoming.poNo })}
              </LinkButton>
            </Card>
          )}
          {po && (
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" /> {t("a.qt.poLinked")}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {po.poNo} · {date(po.date)} · {money(po.amount)}
              </p>
            </Card>
          )}

          {/* summary */}
          <Card>
            <CardHeader title={t("g.details")} />
            <div className="grid grid-cols-2 gap-4 p-5">
              <KV label={t("a.customer")}>{name(h, lang)}</KV>
              <KV label={t("g.case")}>
                {c ? (
                  <Link href={`/admin/cases/${c.id}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                    <FolderKanban className="h-3.5 w-3.5" /> {c.no}
                  </Link>
                ) : (
                  "—"
                )}
              </KV>
              <KV label={t("g.date")}>{date(q.date)}</KV>
              <KV label={t("a.qt.validUntil")}>{date(q.validUntil)}</KV>
              <KV label={t("a.createdBy")}>{name(creator, lang)}</KV>
              <KV label={t("g.discount")}>{q.discountPct}%</KV>
              {approval && (
                <KV label={t("a.appr.decidedBy")} className="col-span-2">
                  {name(d.users.find((u) => u.id === approval.approverId), lang)} · {t(`qs.${approval.decision}`)}
                  {approval.note ? ` · “${approval.note}”` : ""}
                </KV>
              )}
            </div>
            <dl className="space-y-1.5 border-t border-slate-100 px-5 py-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>{t("g.subtotal")}</dt>
                <dd className="tabular-nums">{money(q.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>{t("g.discount")}</dt>
                <dd className="tabular-nums">-{money(q.discount)}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>{t("g.vat")}</dt>
                <dd className="tabular-nums">{money(q.vat)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold text-navy-800">
                <dt>{t("g.grandTotal")}</dt>
                <dd className="tabular-nums">{money(q.total)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <SendQuotationModal quotationId={q.id} channel={send} onClose={() => setSend(null)} />
      {decide !== null && (
        <DecisionModal
          open
          approve={decide}
          refNo={q.no}
          onClose={() => setDecide(null)}
          onSubmit={(note) => {
            run(ops.decideQuotation, q.id, decide, note);
            if (decide) toast.success(t("a.toast.approved", { ref: q.no }), t("a.qt.nowSendable"));
            else toast.warning(t("a.toast.rejected", { ref: q.no }));
          }}
        />
      )}
    </div>
  );
}

function ActionTile({ icon, label, cls, onClick, disabled }: { icon: React.ReactNode; label: string; cls: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 px-2 py-3 text-xs font-medium text-slate-700 transition hover:border-brand-200 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${cls}`}>{icon}</span>
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}
