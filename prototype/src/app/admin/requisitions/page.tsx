"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, PackageCheck, PlusCircle, Search, Truck, XCircle } from "lucide-react";
import { Avatar } from "@/components/PersonaSwitcher";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, Tabs } from "@/components/ui";
import { DecisionModal, LinkButton, PageHeader, SearchBox, TableWrap, Td, Th, rowCls } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { name } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import type { Requisition, RequisitionStatus } from "@/lib/types";

const TABS: ("ALL" | RequisitionStatus)[] = ["ALL", "SUBMITTED", "APPROVED", "ISSUED", "REJECTED"];

export default function RequisitionsPage() {
  const { t, lang, date, rel } = useFmt();
  const d = useData();
  const run = useOp();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [q, setQ] = useState("");
  const [decide, setDecide] = useState<{ r: Requisition; approve: boolean } | null>(null);

  const queue = d.requisitions.filter((r) => r.status === "SUBMITTED" || r.status === "APPROVED");
  const k = q.trim().toLowerCase();
  const rows = d.requisitions.filter((r) => {
    if (tab !== "ALL" && r.status !== tab) return false;
    if (!k) return true;
    const c = d.cases.find((x) => x.id === r.caseId);
    const h = d.hospitals.find((x) => x.id === r.hospitalId);
    return [r.no, r.purpose, c?.no ?? "", h?.name ?? "", h?.nameTh ?? ""].some((s) => s.toLowerCase().includes(k));
  });

  const issue = (r: Requisition) => {
    run(ops.issueRequisition, r.id);
    toast.success(t("a.toast.stockIssued", { no: r.no }), t("a.toast.stockIssuedDesc"));
  };

  return (
    <div>
      <PageHeader
        title={t("a.rq.title")}
        subtitle={t("a.rq.subtitle")}
        actions={
          <LinkButton href="/admin/requisitions/new">
            <PlusCircle className="h-4 w-4" /> {t("a.rq.new")}
          </LinkButton>
        }
      />

      {/* approval / issue queue */}
      <Card className="mb-6">
        <CardHeader icon={<Truck className="h-5 w-5" />} title={t("a.rq.queue")} subtitle={t("a.rq.queueSub")} action={<Badge tone={queue.length ? "amber" : "gray"}>{queue.length}</Badge>} />
        {queue.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title={t("a.rq.queueEmpty")} />
        ) : (
          <ul className="divide-y divide-slate-50">
            {queue.map((r) => {
              const h = d.hospitals.find((x) => x.id === r.hospitalId);
              const c = d.cases.find((x) => x.id === r.caseId);
              const u = d.users.find((x) => x.id === r.requesterId);
              return (
                <li key={r.id} className="flex flex-col gap-3 px-5 py-3 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar user={u} size={34} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                        <Link href={`/admin/requisitions/${r.id}`} className="text-brand-700 hover:underline">
                          {r.no}
                        </Link>
                        <StatusChip kind="requisition" status={r.status} />
                        {c && <Badge tone="indigo">{c.no}</Badge>}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {h ? `→ ${name(h, lang)} · ` : ""}
                        {t("a.rq.nItems", { n: r.items.reduce((a, i) => a + i.qty, 0) })} · {name(u, lang)} · {rel(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {r.status === "SUBMITTED" ? (
                      <>
                        <Button size="sm" variant="success" onClick={() => setDecide({ r, approve: true })}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> {t("a.dec.approve")}
                        </Button>
                        <Button size="sm" variant="outline" className="text-rose-600" onClick={() => setDecide({ r, approve: false })}>
                          <XCircle className="h-3.5 w-3.5" /> {t("a.dec.reject")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => issue(r)}>
                        <PackageCheck className="h-3.5 w-3.5" /> {t("a.rq.issue")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-3 lg:flex-row lg:items-end lg:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            className="border-b-0"
            tabs={TABS.map((s) => ({
              id: s,
              label: s === "ALL" ? t("g.all") : t(`rs.${s}`),
              count: s === "ALL" ? d.requisitions.length : d.requisitions.filter((x) => x.status === s).length,
            }))}
          />
          <SearchBox value={q} onChange={setQ} placeholder={t("g.search")} icon={<Search className="h-4 w-4" />} className="mb-3 lg:w-72" />
        </div>
        {rows.length === 0 ? (
          <EmptyState title={t("g.noResults")} />
        ) : (
          <TableWrap maxH="560px">
            <thead>
              <tr>
                <Th>{t("a.docNo")}</Th>
                <Th>{t("g.date")}</Th>
                <Th>{t("a.rq.department")}</Th>
                <Th>{t("a.rq.destination")}</Th>
                <Th>{t("g.case")}</Th>
                <Th right>{t("g.qty")}</Th>
                <Th>{t("a.rq.requester")}</Th>
                <Th>{t("g.status")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const c = d.cases.find((x) => x.id === r.caseId);
                return (
                  <tr key={r.id} className={`${rowCls} cursor-pointer`} onClick={() => router.push(`/admin/requisitions/${r.id}`)}>
                    <Td className="font-semibold text-brand-700">{r.no}</Td>
                    <Td className="whitespace-nowrap">{date(r.createdAt)}</Td>
                    <Td>{name(d.departments.find((x) => x.id === r.departmentId), lang)}</Td>
                    <Td className="max-w-[200px] truncate">{r.hospitalId ? name(d.hospitals.find((x) => x.id === r.hospitalId), lang) : t("a.rq.internal")}</Td>
                    <Td>{c ? c.no : <span className="text-slate-300">—</span>}</Td>
                    <Td right>{r.items.reduce((a, i) => a + i.qty, 0)}</Td>
                    <Td>{name(d.users.find((x) => x.id === r.requesterId), lang)}</Td>
                    <Td>
                      <StatusChip kind="requisition" status={r.status} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {decide && (
        <DecisionModal
          open
          approve={decide.approve}
          refNo={decide.r.no}
          onClose={() => setDecide(null)}
          onSubmit={(note) => {
            run(ops.decideRequisition, decide.r.id, decide.approve, note);
            if (decide.approve) toast.success(t("a.toast.approved", { ref: decide.r.no }), t("a.rq.readyToIssue"));
            else toast.warning(t("a.toast.rejected", { ref: decide.r.no }));
          }}
        />
      )}
    </div>
  );
}
