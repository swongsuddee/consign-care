"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FolderKanban,
  Inbox,
  Mail,
  MessageCircle,
  PenLine,
  RotateCcw,
  ScanLine,
  Search,
  XCircle,
} from "lucide-react";
import { ScannerModal } from "@/components/Scanner";
import { Avatar } from "@/components/PersonaSwitcher";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, PageLoader, Select } from "@/components/ui";
import { KV, LinkButton, PageHeader, TableWrap, Td, rowCls, useTable } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { poSamples } from "@/lib/samples";
import { name } from "@/lib/selectors";
import { useData, useOp, useStore } from "@/lib/store";
import type { CustomerPO, Data, IncomingPO } from "@/lib/types";

export default function PosPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PosInner />
    </Suspense>
  );
}

type Result = { kind: "found"; po: IncomingPO } | { kind: "notfound"; code: string } | { kind: "saved"; po: CustomerPO } | null;

function lookup(d: Data, code: string): Result {
  const k = code.trim();
  if (!k) return null;
  const po = ops.findIncomingPo(d, k);
  return po ? { kind: "found", po } : { kind: "notfound", code: k };
}

function PosInner() {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const run = useOp();
  const sp = useSearchParams();

  const qParam = d.quotations.find((x) => x.id === sp.get("quotation"));
  const initCode = sp.get("po") ?? (qParam ? d.incomingPos.find((p) => p.quotationNo === qParam.no)?.poNo ?? "" : "");

  const [code, setCode] = useState(initCode);
  const [method, setMethod] = useState<"SCAN" | "TYPED">("TYPED");
  const [scan, setScan] = useState(false);
  const [result, setResult] = useState<Result>(() => lookup(d, initCode));
  const [manual, setManual] = useState(!!qParam && !initCode);
  const [mQuotation, setMQuotation] = useState(qParam?.id ?? "");
  const [mAmount, setMAmount] = useState<number>(qParam?.total ?? 0);
  const [mNo, setMNo] = useState("");

  // react to ?po= changes while already on this page (e.g. from a notification)
  const poParam = sp.get("po");
  useEffect(() => {
    if (!poParam) return;
    setCode(poParam);
    setResult(lookup(useStore.getState().data, poParam));
  }, [poParam]);

  const openQuotations = d.quotations.filter((q) => ["SENT", "APPROVED"].includes(q.status) && !d.customerPos.some((p) => p.quotationId === q.id));

  const check = (c: string, m: "SCAN" | "TYPED") => {
    setCode(c);
    setMethod(m);
    const r = lookup(d, c);
    setResult(r);
    if (r?.kind === "found") toast.success(t("a.pos.foundToast"), r.po.poNo);
    if (r?.kind === "notfound") {
      toast.error(t("a.pos.notFound"), r.code);
      setMNo(r.code);
    }
  };

  const save = (po: IncomingPO, m: "SCAN" | "TYPED") => {
    const q = d.quotations.find((x) => x.no === po.quotationNo);
    if (!q) {
      toast.error(t("a.pos.noQuotation"));
      return;
    }
    const saved = run(ops.recordPo, { poNo: po.poNo, quotationId: q.id, amount: po.amount, date: ops.DEMO_TODAY, method: m });
    if (saved) {
      setResult({ kind: "saved", po: saved });
      setCode("");
      toast.success(t("a.pos.saved"), saved.poNo);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const saveManual = () => {
    const no = mNo.trim();
    if (!no || !mQuotation) {
      toast.error(t("a.pos.manualInvalid"));
      return;
    }
    if (d.customerPos.some((p) => p.poNo.toUpperCase() === no.toUpperCase())) {
      toast.error(t("a.pos.duplicate", { po: no }));
      return;
    }
    const saved = run(ops.recordPo, { poNo: no, quotationId: mQuotation, amount: mAmount, date: ops.DEMO_TODAY, method: "TYPED" });
    if (saved) {
      setResult({ kind: "saved", po: saved });
      setManual(false);
      setMNo("");
      setCode("");
      toast.success(t("a.pos.saved"), saved.poNo);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const hosp = (p: CustomerPO) => d.hospitals.find((x) => x.id === p.hospitalId);
  const qNo = (p: CustomerPO) => d.quotations.find((x) => x.id === p.quotationId)?.no ?? "";
  const caseNo = (p: CustomerPO) => d.cases.find((x) => x.id === p.caseId)?.no ?? "";
  const recorders = [...new Set(d.customerPos.map((p) => p.recordedBy))].map((id) => d.users.find((u) => u.id === id)).filter((u) => !!u);
  const table = useTable(
    d.customerPos,
    [
      { key: "po", label: t("a.pos.poNo"), sort: (p) => p.poNo, text: (p) => p.poNo },
      { key: "hospital", label: t("g.hospital"), sort: (p) => name(hosp(p), lang), text: (p) => `${hosp(p)?.name ?? ""} ${hosp(p)?.nameTh ?? ""}` },
      { key: "quotation", label: t("a.pos.quotation"), sort: qNo, text: qNo },
      { key: "case", label: t("g.case"), sort: caseNo, text: caseNo },
      { key: "date", label: t("g.date"), sort: (p) => p.date, range: { type: "date", get: (p) => p.date } },
      { key: "amount", label: t("g.amount"), right: true, sort: (p) => p.amount, range: { type: "number", get: (p) => p.amount, format: (n) => money(n, 0) } },
      {
        key: "method",
        label: t("a.pos.method"),
        sort: (p) => p.method,
        options: [
          { value: "SCAN", label: t("src.SCAN") },
          { value: "TYPED", label: t("a.pos.typed") },
        ],
        value: (p) => p.method,
      },
      { key: "by", label: t("a.pos.recordedBy"), sort: (p) => name(d.users.find((u) => u.id === p.recordedBy), lang), options: recorders.map((u) => ({ value: u.id, label: name(u, lang) })), value: (p) => p.recordedBy, multi: true },
    ],
    { key: "date", dir: "desc" },
  );
  const recorded = table.rows;

  return (
    <div>
      <PageHeader title={t("a.pos.title")} subtitle={t("a.pos.subtitle")} />

      <div className="grid gap-6 xl:grid-cols-5">
        {/* record card */}
        <div className="space-y-6 xl:col-span-3">
          {result?.kind === "saved" ? (
            <SavedCard po={result.po} onAgain={() => setResult(null)} />
          ) : (
            <Card>
              <CardHeader icon={<ClipboardCheck className="h-5 w-5" />} title={t("a.pos.record")} subtitle={t("a.pos.recordSub")} />
              <form
                className="flex flex-col gap-2 p-5 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  check(code, "TYPED");
                }}
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("a.pos.poPh")} className="h-12 pl-9 font-mono text-base" />
                </div>
                <Button type="button" variant="secondary" size="lg" onClick={() => setScan(true)}>
                  <ScanLine className="h-5 w-5" /> {t("a.pos.scan")}
                </Button>
                <Button type="submit" size="lg" disabled={!code.trim()}>
                  <FileSearch className="h-5 w-5" /> {t("a.pos.check")}
                </Button>
              </form>

              {result?.kind === "found" && (
                <FoundCard po={result.po} method={method} onSave={() => save(result.po, method)} />
              )}

              {result?.kind === "notfound" && (
                <div className="mx-5 mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-6 w-6 shrink-0 text-rose-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-rose-800">{t("a.pos.notFound")}</p>
                      <p className="text-sm text-rose-700">{t("a.pos.notFoundDesc", { po: result.code })}</p>
                      {!manual && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setManual(true)}>
                          <PenLine className="h-3.5 w-3.5" /> {t("a.pos.manual")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!manual && result?.kind !== "notfound" && (
                <div className="px-5 pb-5">
                  <button onClick={() => setManual(true)} className="text-xs font-medium text-brand-700 hover:underline">
                    + {t("a.pos.addNew")}
                  </button>
                </div>
              )}

              {manual && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <PenLine className="h-4 w-4" /> {t("a.pos.manualTitle")}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("a.pos.poNo")} required>
                      <Input value={mNo} onChange={(e) => setMNo(e.target.value)} placeholder="BKH-PO-26-XXXX" className="font-mono" />
                    </Field>
                    <Field label={t("a.pos.quotation")} required>
                      <Select
                        value={mQuotation}
                        onChange={(e) => {
                          setMQuotation(e.target.value);
                          setMAmount(d.quotations.find((x) => x.id === e.target.value)?.total ?? 0);
                        }}
                      >
                        <option value="">{t("g.pleaseSelect")}</option>
                        {openQuotations.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.no} · {name(d.hospitals.find((h) => h.id === q.hospitalId), lang)} · {money(q.total, 0)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={t("g.amount")} required>
                      <Input type="number" value={mAmount} onChange={(e) => setMAmount(Number(e.target.value))} min={0} step="0.01" />
                    </Field>
                    <Field label={t("g.date")}>
                      <Input value={date(ops.DEMO_TODAY)} readOnly className="bg-white" />
                    </Field>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setManual(false)}>
                      {t("g.cancel")}
                    </Button>
                    <Button onClick={saveManual}>
                      <ClipboardCheck className="h-4 w-4" /> {t("a.pos.savePo")}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* incoming inbox */}
        <Card className="xl:col-span-2">
          <CardHeader
            icon={<Inbox className="h-5 w-5" />}
            title={t("a.pos.inbox")}
            subtitle={t("a.pos.inboxSub")}
            action={<Badge tone={d.incomingPos.length ? "amber" : "gray"}>{d.incomingPos.length}</Badge>}
          />
          {d.incomingPos.length === 0 ? (
            <EmptyState icon={<Inbox className="h-6 w-6" />} title={t("a.pos.inboxEmpty")} desc={t("a.pos.inboxEmptyDesc")} />
          ) : (
            <ul className="divide-y divide-slate-50">
              {d.incomingPos.map((p) => {
                const h = d.hospitals.find((x) => x.id === p.hospitalId);
                return (
                  <li key={p.poNo} className="flex items-center gap-3 px-5 py-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${p.channel === "EMAIL" ? "bg-brand-50 text-brand-600" : "bg-emerald-50 text-[#06C755]"}`}>
                      {p.channel === "EMAIL" ? <Mail className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-semibold text-slate-800">{p.poNo}</p>
                      <p className="truncate text-xs text-slate-500">
                        {name(h, lang)} · {p.quotationNo} · {money(p.amount, 0)}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => save(p, "TYPED")}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t("a.pos.matchSave")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* recorded */}
      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">{t("a.pos.recorded")}</h3>
            <p className="text-xs text-slate-500">{t("a.pos.recordedSub", { n: d.customerPos.length })}</p>
          </div>
        </div>
        {table.summary}
        <TableWrap maxH="520px" dense>
            <thead>{table.head}</thead>
            <tbody>
              {recorded.map((p) => {
                const q = d.quotations.find((x) => x.id === p.quotationId);
                const c = d.cases.find((x) => x.id === p.caseId);
                const u = d.users.find((x) => x.id === p.recordedBy);
                return (
                  <tr key={p.id} className={rowCls}>
                    <Td className="font-mono text-xs font-semibold text-slate-800">{p.poNo}</Td>
                    <Td className="max-w-[200px] truncate">{name(d.hospitals.find((x) => x.id === p.hospitalId), lang)}</Td>
                    <Td>
                      {q ? (
                        <Link href={`/admin/quotations/${q.id}`} className="text-brand-700 hover:underline">
                          {q.no}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      {c ? (
                        <Link href={`/admin/cases/${c.id}`} className="text-brand-700 hover:underline">
                          {c.no}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{date(p.date)}</Td>
                    <Td right className="font-medium">{money(p.amount)}</Td>
                    <Td>
                      <Badge tone={p.method === "SCAN" ? "sky" : "gray"}>{p.method === "SCAN" ? t("src.SCAN") : t("a.pos.typed")}</Badge>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Avatar user={u} size={22} /> {name(u, lang)}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
          {recorded.length === 0 && <EmptyState title={t("g.noResults")} />}
      </Card>

      <ScannerModal
        open={scan}
        onClose={() => setScan(false)}
        title={t("a.pos.scanTitle")}
        samples={poSamples(d)}
        onResult={(c, m) => {
          setScan(false);
          check(c, m);
        }}
      />
    </div>
  );
}

function FoundCard({ po, method, onSave }: { po: IncomingPO; method: "SCAN" | "TYPED"; onSave: () => void }) {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const h = d.hospitals.find((x) => x.id === po.hospitalId);
  const q = d.quotations.find((x) => x.no === po.quotationNo);
  const c = d.cases.find((x) => x.id === q?.caseId);
  return (
    <div className="mx-5 mb-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 animate-slide-up">
      <div className="flex items-center gap-2 border-b border-emerald-100 px-4 py-3 text-emerald-800">
        <CheckCircle2 className="h-5 w-5" />
        <p className="font-semibold">{t("a.pos.found")}</p>
        <Badge tone={po.channel === "EMAIL" ? "blue" : "green"} className="ml-auto">
          {po.channel === "EMAIL" ? "Email" : "LINE"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
        <KV label={t("a.pos.poNo")}>
          <span className="font-mono">{po.poNo}</span>
        </KV>
        <KV label={t("g.hospital")}>{name(h, lang)}</KV>
        <KV label={t("a.pos.quotation")}>{po.quotationNo}</KV>
        <KV label={t("g.case")}>{c?.no ?? "—"}</KV>
        <KV label={t("g.date")}>{date(po.date)}</KV>
        <KV label={t("g.amount")}>
          <span className="text-emerald-800">{money(po.amount)}</span>
        </KV>
      </div>
      {q && Math.abs(q.total - po.amount) > 0.01 && <p className="px-4 pb-2 text-xs text-amber-700">{t("a.pos.amountMismatch", { amount: money(q.total) })}</p>}
      <div className="flex items-center justify-between gap-2 border-t border-emerald-100 bg-white/60 px-4 py-3">
        <span className="text-xs text-slate-500">
          {t("a.pos.method")}: {method === "SCAN" ? t("src.SCAN") : t("a.pos.typed")}
        </span>
        <Button variant="success" size="lg" onClick={onSave}>
          <ClipboardCheck className="h-5 w-5" /> {t("a.pos.savePo")}
        </Button>
      </div>
    </div>
  );
}

function SavedCard({ po, onAgain }: { po: CustomerPO; onAgain: () => void }) {
  const { t, lang, money } = useFmt();
  const d = useData();
  const c = d.cases.find((x) => x.id === po.caseId);
  const h = d.hospitals.find((x) => x.id === po.hospitalId);
  return (
    <Card className="overflow-hidden animate-slide-up">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-8 text-center text-white">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/20 ring-8 ring-white/10">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <p className="mt-4 text-2xl font-bold">{t("a.pos.saved")}</p>
        <p className="mt-1 font-mono text-white/90">{po.poNo}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
        <KV label={t("g.hospital")}>{name(h, lang)}</KV>
        <KV label={t("g.case")}>{c?.no ?? "—"}</KV>
        <KV label={t("g.amount")}>{money(po.amount)}</KV>
      </div>
      {c && <p className="px-5 text-sm text-emerald-700">{t("a.pos.caseMoved", { no: c.no })}</p>}
      <div className="flex flex-col gap-2 p-5 sm:flex-row">
        {c && (
          <LinkButton href={`/admin/cases/${c.id}`} size="lg" className="flex-1">
            <FolderKanban className="h-5 w-5" /> {t("a.pos.openCase", { no: c.no })}
          </LinkButton>
        )}
        <Button variant="outline" size="lg" className="flex-1" onClick={onAgain}>
          <RotateCcw className="h-4 w-4" /> {t("a.pos.another")}
        </Button>
      </div>
    </Card>
  );
}
