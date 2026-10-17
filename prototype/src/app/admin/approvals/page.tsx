"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CheckCircle2, ExternalLink, FileText, History, ShoppingCart, Truck, XCircle } from "lucide-react";
import { Avatar } from "@/components/PersonaSwitcher";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, Tabs } from "@/components/ui";
import { DecisionModal, PageHeader } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { name, pendingApprovals } from "@/lib/selectors";
import { useCurrentUser, useData, useOp } from "@/lib/store";

type Kind = "q" | "rq" | "pr";

export default function ApprovalsPage() {
  const { t, lang, money, rel, date, dateTime } = useFmt();
  const d = useData();
  const run = useOp();
  const me = useCurrentUser();
  const pa = pendingApprovals(d);
  const [tab, setTab] = useState<Kind>("q");
  const [decide, setDecide] = useState<{ kind: Kind; id: string; no: string; approve: boolean } | null>(null);

  const submit = (note?: string) => {
    if (!decide) return;
    const { kind, id, no, approve } = decide;
    if (kind === "q") run(ops.decideQuotation, id, approve, note);
    if (kind === "rq") run(ops.decideRequisition, id, approve, note);
    if (kind === "pr") run(ops.decidePR, id, approve, note);
    if (approve) toast.success(t("a.toast.approved", { ref: no }));
    else toast.warning(t("a.toast.rejected", { ref: no }));
  };

  const actions = (kind: Kind, id: string, no: string, href: string) => (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Link href={href} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
        <ExternalLink className="h-3.5 w-3.5" /> {t("g.details")}
      </Link>
      <Button size="sm" variant="outline" className="text-rose-600" onClick={() => setDecide({ kind, id, no, approve: false })}>
        <XCircle className="h-3.5 w-3.5" /> {t("a.dec.reject")}
      </Button>
      <Button size="sm" variant="success" onClick={() => setDecide({ kind, id, no, approve: true })}>
        <CheckCircle2 className="h-3.5 w-3.5" /> {t("a.dec.approve")}
      </Button>
    </div>
  );

  const total = pa.quotations.length + pa.requisitions.length + pa.prs.length;

  return (
    <div>
      <PageHeader
        title={t("a.appr.title")}
        subtitle={t("a.appr.subtitle", { n: total })}
        badge={me.role !== "MANAGER" ? <Badge tone="amber">{t("a.appr.demoNote")}</Badge> : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <Tabs
            className="px-3"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "q", label: t("a.nav.quotations"), count: pa.quotations.length },
              { id: "rq", label: t("a.nav.requisitions"), count: pa.requisitions.length },
              { id: "pr", label: t("a.nav.prs"), count: pa.prs.length },
            ]}
          />
          {tab === "q" && (
            <List empty={pa.quotations.length === 0}>
              {pa.quotations.map((q) => {
                const h = d.hospitals.find((x) => x.id === q.hospitalId);
                const c = d.cases.find((x) => x.id === q.caseId);
                const u = d.users.find((x) => x.id === q.createdBy);
                return (
                  <Item
                    key={q.id}
                    icon={<FileText className="h-5 w-5" />}
                    tone="bg-brand-50 text-brand-600"
                    title={
                      <>
                        {q.no} <Badge tone="amber">{t("a.appr.discount", { pct: q.discountPct })}</Badge>
                      </>
                    }
                    lines={[
                      `${name(h, lang)}${c ? ` · ${c.no}` : ""}`,
                      `${t("g.grandTotal")} ${money(q.total)} · ${t("g.discount")} ${money(q.discount)}`,
                      `${name(u, lang)} · ${date(q.date)}`,
                    ]}
                    actions={actions("q", q.id, q.no, `/admin/quotations/${q.id}`)}
                  />
                );
              })}
            </List>
          )}
          {tab === "rq" && (
            <List empty={pa.requisitions.length === 0}>
              {pa.requisitions.map((r) => {
                const h = d.hospitals.find((x) => x.id === r.hospitalId);
                const c = d.cases.find((x) => x.id === r.caseId);
                const u = d.users.find((x) => x.id === r.requesterId);
                return (
                  <Item
                    key={r.id}
                    icon={<Truck className="h-5 w-5" />}
                    tone="bg-violet-50 text-violet-600"
                    title={
                      <>
                        {r.no} {c && <Badge tone="indigo">{c.no}</Badge>}
                      </>
                    }
                    lines={[
                      `${name(d.departments.find((x) => x.id === r.departmentId), lang)}${h ? ` → ${name(h, lang)}` : ""}`,
                      r.items.map((i) => `${d.products.find((p) => p.id === i.productId)?.name} ×${i.qty}`).join(", "),
                      `${name(u, lang)} · ${rel(r.createdAt)}`,
                    ]}
                    actions={actions("rq", r.id, r.no, `/admin/requisitions/${r.id}`)}
                  />
                );
              })}
            </List>
          )}
          {tab === "pr" && (
            <List empty={pa.prs.length === 0}>
              {pa.prs.map((r) => {
                const s = d.suppliers.find((x) => x.id === r.supplierId);
                const u = d.users.find((x) => x.id === r.requesterId);
                return (
                  <Item
                    key={r.id}
                    icon={<ShoppingCart className="h-5 w-5" />}
                    tone="bg-emerald-50 text-emerald-600"
                    title={r.no}
                    lines={[
                      s?.name ?? "",
                      `${t("g.items")} ${r.items.length} · ${money(r.items.reduce((a, i) => a + i.qty * i.unitPrice, 0))}`,
                      `${name(u, lang)} · ${rel(r.createdAt)}`,
                    ]}
                    actions={actions("pr", r.id, r.no, `/admin/purchase-requests/${r.id}`)}
                  />
                );
              })}
            </List>
          )}
        </Card>

        <Card>
          <CardHeader icon={<History className="h-5 w-5" />} title={t("a.appr.recent")} />
          {d.approvals.length === 0 ? (
            <EmptyState title={t("g.noData")} />
          ) : (
            <ul className="divide-y divide-slate-50">
              {d.approvals.slice(0, 12).map((a) => {
                const u = d.users.find((x) => x.id === a.approverId);
                const ref =
                  a.entity === "QUOTATION"
                    ? d.quotations.find((x) => x.id === a.entityId)?.no
                    : a.entity === "REQUISITION"
                      ? d.requisitions.find((x) => x.id === a.entityId)?.no
                      : d.purchaseRequests.find((x) => x.id === a.entityId)?.no;
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <Avatar user={u} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm text-slate-800">
                        <span className="font-medium">{ref ?? a.entityId}</span>
                        <Badge tone={a.decision === "APPROVED" ? "green" : "red"}>{t(`rs.${a.decision}`)}</Badge>
                      </p>
                      <p className="text-xs text-slate-500">
                        {name(u, lang)} · {dateTime(a.at)}
                      </p>
                      {a.note && <p className="mt-0.5 text-xs italic text-slate-500">“{a.note}”</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {decide && <DecisionModal open approve={decide.approve} refNo={decide.no} onClose={() => setDecide(null)} onSubmit={submit} />}
    </div>
  );
}

function List({ empty, children }: { empty: boolean; children: ReactNode }) {
  const { t } = useFmt();
  if (empty) return <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />} title={t("a.appr.allClear")} desc={t("a.appr.allClearDesc")} />;
  return <ul className="divide-y divide-slate-50">{children}</ul>;
}

function Item({ icon, tone, title, lines, actions }: { icon: ReactNode; tone: string; title: ReactNode; lines: string[]; actions: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>{icon}</span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-800">{title}</p>
          {lines.map((l, i) => (
            <p key={i} className={i === 0 ? "truncate text-sm text-slate-600" : "truncate text-xs text-slate-500"}>
              {l}
            </p>
          ))}
        </div>
      </div>
      {actions}
    </li>
  );
}
