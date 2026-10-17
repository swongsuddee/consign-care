"use client";

import { CheckCircle2, FileText, PartyPopper, Pencil, Send, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PhotoThumb, ProductArt } from "@/components/art";
import { CaseTimeline } from "@/components/CaseTimeline";
import { viewDoc } from "@/components/DocViewer";
import { maskHn } from "@/components/mobile/bits";
import { MScreen } from "@/components/mobile/MScreen";
import { ScannerView } from "@/components/Scanner";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Button, EmptyState, Field, Input, Modal, PageLoader, Select, Tabs } from "@/components/ui";
import { useT } from "@/i18n";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { poSamples } from "@/lib/samples";
import { caseInvoice, casePo, caseQuotation, caseRequisition, caseUsage, name } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import type { Case } from "@/lib/types";
import { useRouteParam } from "@/lib/route-param";

export default function CasePage({ id: idSeg }: { id: string }) {
  const id = useRouteParam("id", idSeg);
  return (
    <Suspense fallback={<PageLoader />}>
      <CaseTracking id={id} />
    </Suspense>
  );
}

function CaseTracking({ id }: { id: string }) {
  const { t, lang, date } = useFmt();
  const sp = useSearchParams();
  const d = useData();
  const run = useOp();
  const [showPo, setShowPo] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [created, setCreated] = useState(sp.get("created") === "1");
  const c = d.cases.find((x) => x.id === id);

  if (!c)
    return (
      <MScreen title={t("g.case")} back="/m/cases">
        <EmptyState title={t("g.noResults")} />
      </MScreen>
    );

  const h = d.hospitals.find((x) => x.id === c.hospitalId);
  const q = caseQuotation(d, c.id);
  const rq = caseRequisition(d, c.id);
  const inv = caseInvoice(d, c.id);
  const rep = d.users.find((u) => u.id === c.repId);

  const info: [string, string][] = [
    [t("g.hospital"), name(h, lang)],
    [t("m.new.caseDate"), date(c.caseDate)],
    [t("g.doctor"), name(d.doctors.find((x) => x.id === c.doctorId), lang)],
    [t("g.procedure"), name(d.procedures.find((x) => x.id === c.procedure), lang)],
    [t("g.patientHn"), maskHn(c.patientHn)],
    ...(c.patientAn ? [["AN", maskHn(c.patientAn)] as [string, string]] : []),
    [t("g.rep"), name(rep, lang)],
  ];

  return (
    <MScreen
      title={`${t("g.case")} ${c.no}`}
      back="/m/cases"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setShowEdit(true)} disabled={["BILLED", "CLOSED", "CANCELLED"].includes(c.status)}>
            <Pencil className="h-4 w-4" /> {t("m.case.edit")}
          </Button>
          <Button onClick={() => setShowDetails(true)}>{t("m.case.viewDetails")}</Button>
        </div>
      }
    >
      <div className="space-y-4 p-4">
        {created && (
          <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-lg shadow-emerald-500/20 animate-slide-down">
            <PartyPopper className="h-6 w-6 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{t("m.case.createdTitle", { no: c.no })}</p>
              <p className="text-xs text-white/85">{t("m.case.createdDesc")}</p>
            </div>
            <button onClick={() => setCreated(false)} className="text-white/70" aria-label="dismiss">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-2 flex justify-end">
            <StatusChip kind="case" status={c.status} />
          </div>
          <dl className="space-y-1.5">
            {info.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[96px_1fr] gap-2 text-sm">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">{t("m.case.journey")}</h3>
          {c.status === "CANCELLED" && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{t("cs.CANCELLED")}</p>}
          <CaseTimeline
            c={c}
            d={d}
            action={(step) => {
              if (step === "quotation" && q)
                return (
                  <Button size="sm" variant="outline" onClick={() => viewDoc("quotation", q.id)} className="border-brand-200 text-brand-700">
                    <FileText className="h-3.5 w-3.5" /> {t("g.view")}
                  </Button>
                );
              if (step === "requisition" && rq)
                return (
                  <Button size="sm" variant="outline" onClick={() => viewDoc("requisition", rq.id)} className="border-violet-200 text-violet-700">
                    <FileText className="h-3.5 w-3.5" /> {t("doc.viewReq")}
                  </Button>
                );
              if (step === "billing" && inv)
                return (
                  <Button size="sm" variant="outline" onClick={() => viewDoc("invoice", inv.id)} className="border-navy-200 text-navy-700">
                    <FileText className="h-3.5 w-3.5" /> {t("doc.viewBill")}
                  </Button>
                );
              if (step === "quotation" && !q && c.status === "USAGE_RECORDED")
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-brand-200 text-brand-700"
                    onClick={() => {
                      run((dd, actor) => {
                        ops.log(dd, actor, "quotationRequested", "CASE", c.id, c.no, c.hospitalId);
                        ops.notify(dd, "*", "quotationRequested", c.no, `/admin/cases/${c.id}`, c.hospitalId);
                      });
                      toast.success(t("m.case.qtRequested"), t("m.case.qtRequestedDesc"));
                    }}
                  >
                    <Send className="h-3.5 w-3.5" /> {t("m.case.requestQt")}
                  </Button>
                );
              if (step === "po" && (c.status === "WAITING_PO" || c.status === "QUOTED") && q)
                return (
                  <Button size="sm" onClick={() => setShowPo(true)}>
                    <Upload className="h-3.5 w-3.5" /> {t("m.case.uploadPo")}
                  </Button>
                );
              return null;
            }}
          />
        </div>

        <UsageCard c={c} />
      </div>

      <UploadPoModal open={showPo} onClose={() => setShowPo(false)} c={c} />
      <EditCaseModal open={showEdit} onClose={() => setShowEdit(false)} c={c} />
      <DetailsModal open={showDetails} onClose={() => setShowDetails(false)} c={c} />
    </MScreen>
  );
}

function UsageCard({ c }: { c: Case }) {
  const { t, money } = useFmt();
  const d = useData();
  const items = caseUsage(d, c.id);
  const total = items.reduce((s, u) => s + u.qty * u.unitPrice, 0);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          {t("m.case.usedItems")} ({items.length})
        </h3>
        <span className="text-xs font-semibold text-slate-600">{money(total, 0)}</span>
      </div>
      {items.length === 0 && <EmptyState title={t("g.noData")} />}
      {items.map((u) => {
        const p = d.products.find((x) => x.id === u.productId)!;
        const lot = d.lots.find((l) => l.id === u.lotId);
        return (
          <Link key={u.id} href={`/m/products/${p.id}${lot ? `?lot=${lot.id}` : ""}`} className="flex items-center gap-3 border-b border-slate-50 py-2 last:border-0">
            <ProductArt category={p.category} className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
              <p className="text-[11px] text-slate-500">
                REF {p.ref}
                {lot && ` · LOT ${lot.lotNo}`}
                {u.serialNo && ` · SN ${u.serialNo}`}
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {t("g.qty")} <b className="text-slate-800">{u.qty}</b>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function UploadPoModal({ open, onClose, c }: { open: boolean; onClose: () => void; c: Case }) {
  const { t, money } = useFmt();
  const d = useData();
  const run = useOp();
  const [tab, setTab] = useState<"scan" | "type">("scan");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; poNo: string; msg?: string } | null>(null);
  const q = caseQuotation(d, c.id);

  const submit = (raw: string, method: "SCAN" | "TYPED") => {
    const inc = ops.findIncomingPo(d, raw);
    if (!inc) return setResult({ ok: false, poNo: raw.trim().toUpperCase() });
    const qt = d.quotations.find((x) => x.no === inc.quotationNo);
    if (!qt || (q && qt.id !== q.id)) return setResult({ ok: false, poNo: inc.poNo, msg: t("m.po.otherQt", { qt: inc.quotationNo }) });
    run(ops.recordPo, { poNo: inc.poNo, quotationId: qt.id, amount: inc.amount, date: ops.DEMO_TODAY, method });
    setResult({ ok: true, poNo: inc.poNo, msg: money(inc.amount) });
    toast.success(t("m.po.saved"), inc.poNo);
  };

  const close = () => {
    setResult(null);
    setCode("");
    onClose();
  };

  const mine = poSamples(d).filter((s) => s.hint === q?.no || s.hint === "✕");
  const others = poSamples(d).filter((s) => !mine.includes(s)).slice(0, 2);

  return (
    <Modal open={open} onClose={close} title={t("m.case.uploadPo")}>
      {result ? (
        <div className="py-6 text-center animate-slide-up">
          {result.ok ? <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" /> : <XCircle className="mx-auto h-16 w-16 text-rose-500" />}
          <p className={result.ok ? "mt-3 text-xl font-bold text-emerald-700" : "mt-3 text-xl font-bold text-rose-700"}>{result.ok ? t("m.po.saved") : t("m.po.notFound")}</p>
          <p className="mt-1 font-mono text-sm text-slate-600">{result.poNo}</p>
          {result.msg && <p className="mt-1 text-sm text-slate-500">{result.msg}</p>}
          {!result.ok && <p className="mx-auto mt-2 max-w-xs text-xs text-slate-500">{t("m.po.notFoundDesc")}</p>}
          <div className="mt-5 flex justify-center gap-2">
            {result.ok ? (
              <Button onClick={close}>{t("g.close")}</Button>
            ) : (
              <Button variant="outline" onClick={() => setResult(null)}>
                {t("m.po.tryAgain")}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">{t("m.po.hint", { qt: q?.no ?? "-" })}</p>
          <Tabs variant="pill" className="mb-3 w-full [&>button]:flex-1" value={tab} onChange={setTab} tabs={[{ id: "scan", label: t("m.po.scan") }, { id: "type", label: t("m.po.type") }]} />
          {tab === "scan" ? (
            <ScannerView compact samples={[...mine, ...others]} onResult={(v, m) => submit(v, m)} />
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) submit(code, "TYPED");
              }}
            >
              <Field label={t("m.po.number")}>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BKH-PO-26-0000" className="h-11 font-mono uppercase" autoFocus />
              </Field>
              <Button type="submit" className="w-full" size="lg">
                {t("g.save")}
              </Button>
            </form>
          )}
        </>
      )}
    </Modal>
  );
}

function EditCaseModal({ open, onClose, c }: { open: boolean; onClose: () => void; c: Case }) {
  const { t, lang } = useT();
  const d = useData();
  const run = useOp();
  const [doctorId, setDoctorId] = useState(c.doctorId ?? "");
  const [procedure, setProcedure] = useState(c.procedure ?? "");
  const [patientHn, setPatientHn] = useState(c.patientHn ?? "");
  const [caseDate, setCaseDate] = useState(c.caseDate);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const save = () => {
    run(ops.updateCase, c.id, { doctorId: doctorId || undefined, procedure: procedure || undefined, patientHn: patientHn || undefined, caseDate });
    toast.success(t("m.case.updated", { no: c.no }));
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("m.case.edit")} ${c.no}`}
      footer={
        <>
          <Button variant="ghost" className="mr-auto text-rose-600" onClick={() => setConfirmCancel(true)}>
            {t("m.case.cancelCase")}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t("g.cancel")}
          </Button>
          <Button onClick={save}>{t("g.save")}</Button>
        </>
      }
    >
      {confirmCancel ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-600">{t("m.case.cancelConfirm", { no: c.no })}</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>
              {t("g.no")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                run(ops.cancelCase, c.id);
                toast.info(t("act.caseCancelled", { ref: c.no }));
                setConfirmCancel(false);
                onClose();
              }}
            >
              {t("g.yes")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label={t("m.new.caseDate")}>
            <Input type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} />
          </Field>
          <Field label={t("g.doctor")}>
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">-</option>
              {d.doctors.map((x) => (
                <option key={x.id} value={x.id}>
                  {name(x, lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("g.procedure")}>
            <Select value={procedure} onChange={(e) => setProcedure(e.target.value)}>
              <option value="">-</option>
              {d.procedures.map((x) => (
                <option key={x.id} value={x.id}>
                  {name(x, lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("g.patientHn")}>
            <Input value={patientHn} onChange={(e) => setPatientHn(e.target.value)} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

function DetailsModal({ open, onClose, c }: { open: boolean; onClose: () => void; c: Case }) {
  const { t, money, date } = useFmt();
  const d = useData();
  const items = caseUsage(d, c.id);
  const q = caseQuotation(d, c.id);
  const po = casePo(d, c.id);
  const rq = caseRequisition(d, c.id);
  const inv = caseInvoice(d, c.id);
  const t0 = ops.totals(items.map((u) => ({ productId: u.productId, unit: "", qty: u.qty, unitPrice: u.unitPrice })), 0);
  return (
    <Modal open={open} onClose={onClose} title={`${t("g.details")} · ${c.no}`}>
      <div className="space-y-4">
        {c.photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {c.photos.map((p) => (
              <PhotoThumb key={p.id} url={p.url} className="aspect-square w-full" />
            ))}
          </div>
        )}
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="py-1.5 text-left font-medium">{t("g.item")}</th>
              <th className="py-1.5 text-right font-medium">{t("g.qty")}</th>
              <th className="py-1.5 text-right font-medium">{t("g.contractPrice")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const p = d.products.find((x) => x.id === u.productId)!;
              return (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-1.5">
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {p.ref} · {t(`src.${u.source}`)}
                    </p>
                  </td>
                  <td className="py-1.5 text-right">{u.qty}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(u.unitPrice, 0)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-2 text-right text-slate-500">
                {t("g.grandTotal")} ({t("g.vat")})
              </td>
              <td className="pt-2 text-right font-bold text-navy-800">{money(t0.total)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-700">{t("m.case.documents")}</p>
          {[
            q && { k: t("doc.quotation"), no: q.no, s: <StatusChip kind="quotation" status={q.status} />, at: q.date },
            po && { k: "PO", no: po.poNo, s: null, at: po.date },
            rq && { k: t("doc.requisition"), no: rq.no, s: <StatusChip kind="requisition" status={rq.status} />, at: rq.createdAt },
            inv && { k: t("doc.invoice"), no: inv.no, s: <StatusChip kind="invoice" status={inv.status} />, at: inv.issueDate },
          ]
            .filter(Boolean)
            .map((x) => {
              const r = x as { k: string; no: string; s: React.ReactNode; at: string };
              return (
                <div key={r.no} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                  <div>
                    <p className="text-slate-500">{r.k}</p>
                    <p className="font-semibold text-slate-800">{r.no}</p>
                  </div>
                  <div className="text-right">
                    {r.s}
                    <p className="mt-0.5 text-[10px] text-slate-400">{date(r.at.slice(0, 10))}</p>
                  </div>
                </div>
              );
            })}
          {!q && !po && <p className="text-xs text-slate-400">{t("g.noData")}</p>}
        </div>
      </div>
    </Modal>
  );
}
