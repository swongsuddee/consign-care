"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lightbulb, PlusCircle, Search, ShoppingCart } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, Tabs } from "@/components/ui";
import { LinkButton, PageHeader, SearchBox, TableWrap, Td, Th, rowCls } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { name } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";
import type { PRStatus } from "@/lib/types";

const TABS: ("ALL" | PRStatus)[] = ["ALL", "DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "RECEIVED", "REJECTED"];

export default function PurchaseRequestsPage() {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const run = useOp();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [q, setQ] = useState("");
  const suggestions = ops.suggestPR(d);

  const k = q.trim().toLowerCase();
  const rows = d.purchaseRequests.filter((r) => {
    if (tab !== "ALL" && r.status !== tab) return false;
    if (!k) return true;
    const s = d.suppliers.find((x) => x.id === r.supplierId);
    return [r.no, s?.name ?? "", r.supplierPoNo ?? "", r.grNo ?? ""].some((x) => x.toLowerCase().includes(k));
  });
  const prTotal = (items: { qty: number; unitPrice: number }[]) => items.reduce((a, i) => a + i.qty * i.unitPrice, 0);

  const createFrom = (g: (typeof suggestions)[number]) => {
    const pr = run(ops.createPR, {
      supplierId: g.supplierId,
      items: g.items.map(({ productId, qty, unitPrice }) => ({ productId, qty, unitPrice })),
      neededBy: ops.addDays(ops.DEMO_TODAY, 14),
      note: t("a.pr.autoNote"),
      submit: true,
    });
    toast.success(t("a.pr.created", { no: pr.no }), t("a.pr.sentForApproval"));
    router.push(`/admin/purchase-requests/${pr.id}`);
  };

  return (
    <div>
      <PageHeader
        title={t("a.pr.title")}
        subtitle={t("a.pr.subtitle")}
        actions={
          <LinkButton href="/admin/purchase-requests/new">
            <PlusCircle className="h-4 w-4" /> {t("a.pr.new")}
          </LinkButton>
        }
      />

      <Card className="mb-6 overflow-hidden">
        <CardHeader
          icon={<Lightbulb className="h-5 w-5" />}
          title={t("a.pr.suggested")}
          subtitle={t("a.pr.suggestedSub")}
          action={<Badge tone={suggestions.length ? "amber" : "green"}>{suggestions.reduce((a, g) => a + g.items.length, 0)}</Badge>}
        />
        {suggestions.length === 0 ? (
          <EmptyState title={t("a.pr.noSuggest")} desc={t("a.pr.noSuggestDesc")} />
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {suggestions.map((g) => {
              const s = d.suppliers.find((x) => x.id === g.supplierId);
              return (
                <div key={g.supplierId} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{s?.name}</p>
                      <p className="text-xs text-slate-500">{t("a.pr.nBelow", { n: g.items.length })}</p>
                    </div>
                    <Button size="sm" onClick={() => createFrom(g)}>
                      <ShoppingCart className="h-3.5 w-3.5" /> {t("a.pr.createPr")}
                    </Button>
                  </div>
                  <ul className="space-y-1.5">
                    {g.items.map((i) => {
                      const p = d.products.find((x) => x.id === i.productId);
                      return (
                        <li key={i.productId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                          <span className="min-w-0 truncate font-medium text-slate-700">{p?.name}</span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {t("a.pr.stockVsRop", { cur: i.current, rop: i.reorderPoint })} · <b className="text-brand-700">+{i.qty}</b>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
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
              count: s === "ALL" ? d.purchaseRequests.length : d.purchaseRequests.filter((x) => x.status === s).length,
            }))}
          />
          <SearchBox value={q} onChange={setQ} placeholder={t("g.search")} icon={<Search className="h-4 w-4" />} className="mb-3 lg:w-72" />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="h-6 w-6" />} title={t("g.noResults")} />
        ) : (
          <TableWrap maxH="560px">
            <thead>
              <tr>
                <Th>{t("a.docNo")}</Th>
                <Th>{t("g.date")}</Th>
                <Th>{t("a.pr.supplier")}</Th>
                <Th right>{t("g.items")}</Th>
                <Th right>{t("g.amount")}</Th>
                <Th>{t("a.pr.neededBy")}</Th>
                <Th>{t("a.pr.spo")}</Th>
                <Th>{t("a.pr.requester")}</Th>
                <Th>{t("g.status")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`${rowCls} cursor-pointer`} onClick={() => router.push(`/admin/purchase-requests/${r.id}`)}>
                  <Td className="font-semibold text-brand-700">{r.no}</Td>
                  <Td className="whitespace-nowrap">{date(r.createdAt)}</Td>
                  <Td className="max-w-[240px] truncate">{d.suppliers.find((x) => x.id === r.supplierId)?.name}</Td>
                  <Td right>{r.items.length}</Td>
                  <Td right className="font-medium">{money(prTotal(r.items))}</Td>
                  <Td className="whitespace-nowrap">{date(r.neededBy)}</Td>
                  <Td className="font-mono text-xs">{r.supplierPoNo ?? "—"}</Td>
                  <Td>{name(d.users.find((u) => u.id === r.requesterId), lang)}</Td>
                  <Td>
                    <StatusChip kind="pr" status={r.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
