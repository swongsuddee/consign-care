"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Inbox,
  Mail,
  MessageCircle,
  PackageCheck,
  Receipt,
  Sparkles,
  Truck,
  Wallet,
  XCircle,
  FileDown,
} from "lucide-react";
import { CaseTimeline, type StepId } from "@/components/CaseTimeline";
import { HospitalArt, PhotoThumb, ProductArt } from "@/components/art";
import { Avatar } from "@/components/PersonaSwitcher";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, cx, type Tone } from "@/components/ui";
import { viewDoc } from "@/components/DocViewer";
import { ConfirmModal, DecisionModal, KV, LinkButton, PageHeader, TableWrap, Td, Th, openPrint, rowCls } from "@/components/admin/kit";
import { SendQuotationModal } from "@/components/admin/SendQuotationModal";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { caseInvoice, casePo, caseQuotation, caseRequisition, caseUsage, name } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import type { Case, Data } from "@/lib/types";
import { useRouteParam } from "@/lib/route-param";

const SRC_TONE: Record<string, Tone> = { OCR: "violet", SCAN: "sky", MANUAL: "gray" };

export default function CaseDetailPage({ id: idSeg }: { id: string }) {
  const id = useRouteParam("id", idSeg);
  const { t } = useFmt();
  const d = useData();
  const c = d.cases.find((x) => x.id === id || x.no === id);
  if (!c)
    return (
      <Card>
        <EmptyState title={t("a.notFound")} action={<LinkButton href="/admin/cases">{t("a.nav.cases")}</LinkButton>} />
      </Card>
    );
  return <CaseDetail c={c} d={d} />;
}

function CaseDetail({ c, d }: { c: Case; d: Data }) {
  const { t, lang, money, date, dateTime, rel } = useFmt();
  const h = d.hospitals.find((x) => x.id === c.hospitalId);
  const rep = d.users.find((u) => u.id === c.repId);
  const doctor = d.doctors.find((x) => x.id === c.doctorId);
  const proc = d.procedures.find((p) => p.id === c.procedure);
  const usage = caseUsage(d, c.id);
  const sum = ops.totals(
    usage.map((u) => ({ productId: u.productId, unit: "", qty: u.qty, unitPrice: u.unitPrice })),
    0,
  );
  const q = caseQuotation(d, c.id);
  const po = casePo(d, c.id);
  const rq = caseRequisition(d, c.id);
  const inv = caseInvoice(d, c.id);
  const relatedIds = [c.id, q?.id, po?.id, rq?.id, inv?.id].filter(Boolean);
  const activity = d.activity.filter((a) => relatedIds.includes(a.entityId) || a.ref === c.no);

  return (
    <div>
      <PageHeader
        back="/admin/cases"
        title={`${t("g.case")} ${c.no}`}
        badge={<StatusChip kind="case" status={c.status} className="text-xs" />}
        subtitle={`${name(h, lang)} · ${date(c.caseDate)}`}
      />

      {/* header card */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
          {h && (
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl">
              <HospitalArt palette={h.palette} className="h-full" />
            </div>
          )}
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
            <KV label={t("g.hospital")}>{name(h, lang)}</KV>
            <KV label={t("g.date")}>{date(c.caseDate)}</KV>
            <KV label={t("g.doctor")}>{name(doctor, lang)}</KV>
            <KV label={t("g.procedure")}>{proc ? name(proc, lang) : c.procedure ?? "-"}</KV>
            <KV label={t("g.patientHn")}>{c.patientHn ?? "-"}{c.patientAn ? ` · AN ${c.patientAn}` : ""}</KV>
            <KV label={t("g.rep")}>
              <span className="flex items-center gap-1.5">
                <Avatar user={rep} size={20} /> {name(rep, lang)}
              </span>
            </KV>
          </div>
        </div>
        {c.note && <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2 text-xs text-slate-600">{t("g.note")}: {c.note}</div>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* usage */}
          <Card>
            <CardHeader title={t("a.case.usage")} subtitle={t("a.case.usageSub", { n: usage.length })} />
            {usage.length === 0 ? (
              <EmptyState title={t("a.case.noUsage")} />
            ) : (
              <>
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>{t("g.product")}</Th>
                      <Th>{t("g.ref")}</Th>
                      <Th>{t("g.lot")}</Th>
                      <Th right>{t("g.qty")}</Th>
                      <Th right>{t("a.unitPrice")}</Th>
                      <Th right>{t("g.amount")}</Th>
                      <Th>{t("a.source")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((u) => {
                      const p = d.products.find((x) => x.id === u.productId);
                      const lot = d.lots.find((l) => l.id === u.lotId);
                      return (
                        <tr key={u.id} className={rowCls}>
                          <Td>
                            <div className="flex items-center gap-2.5">
                              <ProductArt category={p?.category ?? ""} className="h-8 w-8 rounded-lg" />
                              <Link href={`/admin/inventory?q=${encodeURIComponent(p?.ref ?? "")}`} className="font-medium text-slate-800 hover:text-brand-700">
                                {p?.name}
                              </Link>
                            </div>
                          </Td>
                          <Td className="font-mono text-xs">{p?.ref}</Td>
                          <Td>
                            <p className="font-mono text-xs">{lot?.lotNo ?? "-"}{u.serialNo ? ` · SN ${u.serialNo}` : ""}</p>
                            {lot && <p className="text-[11px] text-slate-400">EXP {date(lot.expiryDate)}</p>}
                          </Td>
                          <Td right>
                            {u.qty} <span className="text-xs text-slate-400">{t(`unit.${p?.unit}`)}</span>
                          </Td>
                          <Td right>{money(u.unitPrice)}</Td>
                          <Td right className="font-medium">{money(u.qty * u.unitPrice)}</Td>
                          <Td>
                            <Badge tone={SRC_TONE[u.source]}>{t(`src.${u.source}`)}</Badge>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableWrap>
                <div className="flex flex-col items-end gap-1 border-t border-slate-100 px-5 py-3 text-sm">
                  <div className="flex w-64 justify-between text-slate-500">
                    <span>{t("g.subtotal")}</span>
                    <span className="tabular-nums">{money(sum.subtotal)}</span>
                  </div>
                  <div className="flex w-64 justify-between text-slate-500">
                    <span>{t("g.vat")}</span>
                    <span className="tabular-nums">{money(sum.vat)}</span>
                  </div>
                  <div className="flex w-64 justify-between font-semibold text-navy-800">
                    <span>{t("g.grandTotal")}</span>
                    <span className="tabular-nums">{money(sum.total)}</span>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* documents + photos */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title={t("a.case.docs")} icon={<FileText className="h-5 w-5" />} />
              <ul className="divide-y divide-slate-50">
                <DocRow
                  label={t("doc.quotation")}
                  no={q?.no}
                  chip={q && <StatusChip kind="quotation" status={q.status} />}
                  href={q ? `/admin/quotations/${q.id}` : undefined}
                  sub={q ? money(q.total) : undefined}
                />
                <DocRow label={t("doc.po")} no={po?.poNo} href={po ? `/admin/pos` : undefined} sub={po ? `${date(po.date)} · ${money(po.amount)}` : undefined} />
                <DocRow
                  label={t("doc.requisition")}
                  no={rq?.no}
                  chip={rq && <StatusChip kind="requisition" status={rq.status} />}
                  href={rq ? `/admin/requisitions/${rq.id}` : undefined}
                  onView={rq ? () => viewDoc("requisition", rq.id) : undefined}
                />
                <DocRow
                  label={t("doc.invoice")}
                  no={inv?.no}
                  chip={inv && <StatusChip kind="invoice" status={inv.status} />}
                  onView={inv ? () => viewDoc("invoice", inv.id) : undefined}
                  sub={inv ? `${money(inv.amount)} · ${t("a.bill.due")} ${date(inv.dueDate)}` : undefined}
                />
              </ul>
            </Card>
            <Card>
              <CardHeader title={t("a.case.photos")} icon={<ImageIcon className="h-5 w-5" />} subtitle={t("a.case.photosSub", { n: c.photos.length })} />
              {c.photos.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">{t("a.case.noPhotos")}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 p-4">
                  {c.photos.map((p) => (
                    <a key={p.id} href={p.url.startsWith("data:") ? p.url : undefined} target="_blank" rel="noreferrer" className="block">
                      <PhotoThumb url={p.url} className="aspect-[3/4] w-full ring-1 ring-slate-100" />
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* activity */}
          <Card>
            <CardHeader title={t("a.case.activity")} />
            {activity.length === 0 ? (
              <EmptyState title={t("g.noData")} />
            ) : (
              <ul className="divide-y divide-slate-50">
                {activity.map((a) => {
                  const u = d.users.find((x) => x.id === a.actorId);
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                      <Avatar user={u} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-800">{t(`act.${a.action}`, { ref: a.ref })}</p>
                        <p className="text-xs text-slate-500">
                          {name(u, lang)} · {dateTime(a.at)}
                        </p>
                      </div>
                      <span className="hidden text-xs text-slate-400 sm:block">{rel(a.at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <NextStep c={c} d={d} />
          <Card>
            <CardHeader title={t("a.case.journey")} />
            <div className="p-5">
              <CaseTimeline c={c} d={d} action={(s) => <StepLink step={s} c={c} d={d} />} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StepLink({ step, c, d }: { step: StepId; c: Case; d: Data }) {
  const { t } = useFmt();
  const q = caseQuotation(d, c.id);
  const rq = caseRequisition(d, c.id);
  const inv = caseInvoice(d, c.id);
  if (step === "billing" && inv)
    return (
      <button onClick={() => viewDoc("invoice", inv.id)} className="text-xs font-medium text-brand-700 hover:underline">
        {t("g.view")}
      </button>
    );
  const href = step === "quotation" ? (q ? `/admin/quotations/${q.id}` : undefined) : step === "requisition" ? (rq ? `/admin/requisitions/${rq.id}` : undefined) : undefined;
  if (!href) return null;
  return (
    <Link href={href} className="text-xs font-medium text-brand-700 hover:underline">
      {t("g.view")}
    </Link>
  );
}

function DocRow({ label, no, chip, href, sub, external, onView }: { label: string; no?: string; chip?: ReactNode; href?: string; sub?: string; external?: boolean; onView?: () => void }) {
  const { t } = useFmt();
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        {no ? (
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
            {href ? (
              <Link href={href} target={external ? "_blank" : undefined} className="text-brand-700 hover:underline">
                {no}
              </Link>
            ) : onView ? (
              <button onClick={onView} className="text-brand-700 hover:underline">
                {no}
              </button>
            ) : (
              no
            )}
            {chip}
          </p>
        ) : (
          <p className="text-sm text-slate-300">{t("a.case.notYet")}</p>
        )}
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      {href && external && <ExternalLink className="h-4 w-4 text-slate-300" />}
      {onView && (
        <Button size="sm" variant="outline" onClick={onView} className="shrink-0">
          <FileDown className="h-3.5 w-3.5 text-rose-600" /> PDF
        </Button>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ next step panel */

function NextStep({ c, d }: { c: Case; d: Data }) {
  const { t, money } = useFmt();
  const run = useOp();
  const [send, setSend] = useState<"EMAIL" | "LINE" | null>(null);
  const [decide, setDecide] = useState<{ kind: "q" | "rq"; approve: boolean } | null>(null);
  const [confirm, setConfirm] = useState<"cancel" | "paid" | null>(null);
  const q = caseQuotation(d, c.id);
  const rq = caseRequisition(d, c.id);
  const inv = caseInvoice(d, c.id);
  const incoming = q ? d.incomingPos.find((p) => p.quotationNo === q.no) : undefined;

  const issueInvoice = () => {
    const r = run(ops.issueInvoice, c.id);
    if (r) toast.success(t("a.toast.invoiceIssued", { no: r.no }), t("a.toast.caseBilled", { no: c.no }));
    else toast.error(t("a.toast.failed"));
  };
  const issueStock = () => {
    if (!rq) return;
    run(ops.issueRequisition, rq.id);
    toast.success(t("a.toast.stockIssued", { no: rq.no }), t("a.toast.stockIssuedDesc"));
  };

  let tone: "blue" | "amber" | "green" | "red" = "blue";
  let title = "";
  let desc: ReactNode = null;
  let actions: ReactNode = null;

  const createQt = (
    <LinkButton href={`/admin/quotations/new?caseId=${c.id}`} size="lg" className="w-full">
      <FileText className="h-5 w-5" /> {t("a.next.createQt")}
    </LinkButton>
  );

  switch (c.status) {
    case "DRAFT":
    case "USAGE_RECORDED":
      title = t("a.next.createQtTitle");
      desc = t("a.next.createQtDesc");
      actions = createQt;
      break;
    case "QUOTED":
      if (!q) {
        title = t("a.next.createQtTitle");
        desc = t("a.next.qtRejectedDesc");
        actions = createQt;
      } else if (q.status === "PENDING_APPROVAL") {
        tone = "amber";
        title = t("a.next.awaitApproval");
        desc = t("a.next.awaitApprovalDesc", { no: q.no, pct: q.discountPct });
        actions = (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="success" onClick={() => setDecide({ kind: "q", approve: true })}>
                <CheckCircle2 className="h-4 w-4" /> {t("a.dec.approve")}
              </Button>
              <Button variant="outline" className="text-rose-600" onClick={() => setDecide({ kind: "q", approve: false })}>
                <XCircle className="h-4 w-4" /> {t("a.dec.reject")}
              </Button>
            </div>
            <LinkButton href={`/admin/quotations/${q.id}`} variant="ghost" className="w-full">
              {t("a.next.viewQt", { no: q.no })}
            </LinkButton>
          </>
        );
      } else {
        title = t("a.next.sendQt");
        desc = t("a.next.sendQtDesc", { no: q.no, total: money(q.total) });
        actions = (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" onClick={() => setSend("EMAIL")}>
                <Mail className="h-5 w-5" /> {t("doc.sendEmail")}
              </Button>
              <Button size="lg" className="!bg-[#06C755] hover:!bg-[#05b14c]" onClick={() => setSend("LINE")}>
                <MessageCircle className="h-5 w-5" /> LINE
              </Button>
            </div>
            <LinkButton href={`/admin/quotations/${q.id}`} variant="ghost" className="w-full">
              {t("a.next.viewQt", { no: q.no })}
            </LinkButton>
          </>
        );
      }
      break;
    case "WAITING_PO":
      tone = "amber";
      title = t("a.next.recordPo");
      if (incoming) {
        desc = (
          <span className="flex items-start gap-2">
            <Inbox className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("a.next.poArrived", { po: incoming.poNo, ch: incoming.channel === "EMAIL" ? "Email" : "LINE" })}</span>
          </span>
        );
        actions = (
          <LinkButton href={`/admin/pos?po=${encodeURIComponent(incoming.poNo)}`} size="lg" className="w-full">
            <ClipboardCheck className="h-5 w-5" /> {t("a.next.recordPoNo", { po: incoming.poNo })}
          </LinkButton>
        );
      } else {
        desc = t("a.next.recordPoDesc");
        actions = (
          <LinkButton href={`/admin/pos${q ? `?quotation=${q.id}` : ""}`} size="lg" className="w-full">
            <ClipboardCheck className="h-5 w-5" /> {t("a.next.recordPo")}
          </LinkButton>
        );
      }
      break;
    case "PO_RECEIVED":
      if (!rq || rq.status === "ISSUED") {
        title = rq ? t("a.next.issueInvoice") : t("a.next.createRq");
        desc = rq ? t("a.next.issueInvoiceDesc") : t("a.next.createRqDesc");
        actions = rq ? (
          <Button size="lg" className="w-full" onClick={issueInvoice}>
            <Receipt className="h-5 w-5" /> {t("a.next.issueInvoice")}
          </Button>
        ) : (
          <>
            <LinkButton href={`/admin/requisitions/new?caseId=${c.id}`} size="lg" className="w-full">
              <Truck className="h-5 w-5" /> {t("a.next.createRq")}
            </LinkButton>
            <Button variant="ghost" className="w-full" onClick={issueInvoice}>
              <Receipt className="h-4 w-4" /> {t("a.next.skipToInvoice")}
            </Button>
          </>
        );
      } else if (rq.status === "SUBMITTED") {
        tone = "amber";
        title = t("a.next.approveRq");
        desc = t("a.next.approveRqDesc", { no: rq.no });
        actions = (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="success" size="lg" onClick={() => setDecide({ kind: "rq", approve: true })}>
                <CheckCircle2 className="h-5 w-5" /> {t("a.dec.approve")}
              </Button>
              <Button variant="outline" size="lg" className="text-rose-600" onClick={() => setDecide({ kind: "rq", approve: false })}>
                <XCircle className="h-5 w-5" /> {t("a.dec.reject")}
              </Button>
            </div>
            <LinkButton href={`/admin/requisitions/${rq.id}`} variant="ghost" className="w-full">
              {t("a.next.viewRq", { no: rq.no })}
            </LinkButton>
          </>
        );
      } else {
        title = t("a.next.issueStock");
        desc = t("a.next.issueStockDesc", { no: rq.no });
        actions = (
          <>
            <Button size="lg" className="w-full" onClick={issueStock}>
              <PackageCheck className="h-5 w-5" /> {t("a.rq.issue")}
            </Button>
            <LinkButton href={`/admin/requisitions/${rq.id}`} variant="ghost" className="w-full">
              {t("a.next.viewRq", { no: rq.no })}
            </LinkButton>
          </>
        );
      }
      break;
    case "REQUISITIONED":
      title = t("a.next.issueInvoice");
      desc = t("a.next.issueInvoiceDesc");
      actions = (
        <Button size="lg" className="w-full" onClick={issueInvoice}>
          <Receipt className="h-5 w-5" /> {t("a.next.issueInvoice")}
        </Button>
      );
      break;
    case "BILLED":
      title = t("a.next.markPaid");
      desc = inv ? t("a.next.markPaidDesc", { no: inv.no, amount: money(inv.amount) }) : null;
      actions = inv && (
        <>
          <Button variant="success" size="lg" className="w-full" onClick={() => setConfirm("paid")}>
            <Wallet className="h-5 w-5" /> {t("a.bill.markPaid")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => openPrint("invoice", inv.id, false)}>
            <FileText className="h-4 w-4" /> {t("a.next.viewInvoice", { no: inv.no })}
          </Button>
        </>
      );
      break;
    case "CLOSED":
      tone = "green";
      title = t("a.next.closed");
      desc = t("a.next.closedDesc");
      break;
    case "CANCELLED":
      tone = "red";
      title = t("a.next.cancelled");
      desc = t("a.next.cancelledDesc");
      break;
  }

  const toneCls = {
    blue: "from-brand-600 to-navy-800",
    amber: "from-amber-500 to-orange-600",
    green: "from-emerald-500 to-teal-600",
    red: "from-rose-500 to-rose-700",
  }[tone];
  const Icon = tone === "green" ? CheckCircle2 : tone === "red" ? Ban : tone === "amber" ? AlertTriangle : Sparkles;
  const canCancel = !["BILLED", "CLOSED", "CANCELLED"].includes(c.status);

  return (
    <Card className="overflow-hidden lg:sticky lg:top-24">
      <div className={cx("bg-gradient-to-br px-5 py-4 text-white", toneCls)}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80">
          <Icon className="h-3.5 w-3.5" /> {t("a.next.label")}
        </p>
        <p className="mt-1 text-lg font-bold leading-snug">{title}</p>
      </div>
      <div className="space-y-3 p-5">
        {desc && <div className="text-sm text-slate-600">{desc}</div>}
        {actions && <div className="space-y-2">{actions}</div>}
        {canCancel && (
          <button onClick={() => setConfirm("cancel")} className="mx-auto block pt-1 text-xs font-medium text-slate-400 hover:text-rose-600">
            {t("a.next.cancelCase")}
          </button>
        )}
      </div>

      {q && <SendQuotationModal quotationId={q.id} channel={send} onClose={() => setSend(null)} />}
      {decide && (
        <DecisionModal
          open
          onClose={() => setDecide(null)}
          approve={decide.approve}
          refNo={decide.kind === "q" ? q?.no ?? "" : rq?.no ?? ""}
          onSubmit={(note) => {
            if (decide.kind === "q" && q) run(ops.decideQuotation, q.id, decide.approve, note);
            if (decide.kind === "rq" && rq) run(ops.decideRequisition, rq.id, decide.approve, note);
            const ref = decide.kind === "q" ? q?.no ?? "" : rq?.no ?? "";
            if (decide.approve) toast.success(t("a.toast.approved", { ref }));
            else toast.warning(t("a.toast.rejected", { ref }));
          }}
        />
      )}
      <ConfirmModal
        open={confirm === "cancel"}
        onClose={() => setConfirm(null)}
        danger
        title={t("a.next.cancelCase")}
        desc={t("a.next.cancelConfirm", { no: c.no })}
        confirmLabel={t("a.next.cancelCase")}
        onConfirm={() => {
          run(ops.cancelCase, c.id);
          toast.warning(t("act.caseCancelled", { ref: c.no }));
        }}
      />
      <ConfirmModal
        open={confirm === "paid"}
        onClose={() => setConfirm(null)}
        title={t("a.bill.markPaid")}
        desc={inv ? t("a.bill.markPaidConfirm", { no: inv.no, amount: money(inv.amount) }) : null}
        confirmLabel={t("a.bill.markPaid")}
        onConfirm={() => {
          if (!inv) return;
          run(ops.markPaid, inv.id);
          toast.success(t("a.toast.paid", { no: inv.no }), t("act.caseClosed", { ref: c.no }));
        }}
      />
    </Card>
  );
}
