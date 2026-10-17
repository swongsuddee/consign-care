"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Mail, MessageCircle, PlusCircle, Search } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { Badge, Button, Card, EmptyState, Tabs } from "@/components/ui";
import { exportExcel } from "@/lib/excel";
import { LinkButton, PageHeader, SearchBox, TableWrap, Td, Th, rowCls } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import { name } from "@/lib/selectors";
import { useData } from "@/lib/store";
import type { QuotationStatus } from "@/lib/types";

const TABS: ("ALL" | QuotationStatus)[] = ["ALL", "DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "ACCEPTED", "REJECTED"];

export default function QuotationsPage() {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return d.quotations.filter((x) => {
      if (tab !== "ALL" && x.status !== tab) return false;
      if (!k) return true;
      const h = d.hospitals.find((y) => y.id === x.hospitalId);
      const c = d.cases.find((y) => y.id === x.caseId);
      return [x.no, h?.name ?? "", h?.nameTh ?? "", c?.no ?? ""].some((s) => s.toLowerCase().includes(k));
    });
  }, [d, tab, q]);

  return (
    <div>
      <PageHeader
        title={t("a.qt.title")}
        subtitle={t("a.qt.subtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                exportExcel(`quotations-${tab.toLowerCase()}.xlsx`, "Quotations", [
                  ["Quotation no.", "Date", "Valid until", "Hospital", "Case", "Items", "Subtotal", "Discount %", "Discount", "VAT", "Total (THB)", "Status", "Sent via"],
                  ...rows.map((x) => [
                    x.no,
                    x.date,
                    x.validUntil,
                    d.hospitals.find((y) => y.id === x.hospitalId)?.name ?? "",
                    d.cases.find((y) => y.id === x.caseId)?.no ?? "",
                    x.items.reduce((a, i) => a + i.qty, 0),
                    x.subtotal,
                    x.discountPct,
                    x.discount,
                    x.vat,
                    x.total,
                    x.status,
                    (x.sentVia ?? []).join(", "),
                  ]),
                ])
              }
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {t("doc.exportList")}
            </Button>
            <LinkButton href="/admin/quotations/new">
              <PlusCircle className="h-4 w-4" /> {t("a.qt.new")}
            </LinkButton>
          </div>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-3 lg:flex-row lg:items-end lg:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            className="border-b-0"
            tabs={TABS.map((s) => ({
              id: s,
              label: s === "ALL" ? t("g.all") : t(`qs.${s}`),
              count: s === "ALL" ? d.quotations.length : d.quotations.filter((x) => x.status === s).length,
            }))}
          />
          <SearchBox value={q} onChange={setQ} placeholder={t("a.qt.searchPh")} icon={<Search className="h-4 w-4" />} className="mb-3 lg:w-72" />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title={t("g.noResults")} />
        ) : (
          <TableWrap maxH="calc(100vh - 260px)">
            <thead>
              <tr>
                <Th>{t("a.docNo")}</Th>
                <Th>{t("g.date")}</Th>
                <Th>{t("a.customer")}</Th>
                <Th>{t("g.case")}</Th>
                <Th right>{t("g.items")}</Th>
                <Th right>{t("g.discount")}</Th>
                <Th right>{t("g.total")}</Th>
                <Th>{t("a.qt.sentVia")}</Th>
                <Th>{t("g.status")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const h = d.hospitals.find((y) => y.id === x.hospitalId);
                const c = d.cases.find((y) => y.id === x.caseId);
                return (
                  <tr key={x.id} className={`${rowCls} cursor-pointer`} onClick={() => router.push(`/admin/quotations/${x.id}`)}>
                    <Td>
                      <Link href={`/admin/quotations/${x.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-brand-700 hover:underline">
                        {x.no}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap">{date(x.date)}</Td>
                    <Td className="max-w-[220px] truncate">{name(h, lang)}</Td>
                    <Td>
                      {c ? (
                        <Link href={`/admin/cases/${c.id}`} onClick={(e) => e.stopPropagation()} className="text-slate-700 hover:text-brand-700">
                          {c.no}
                        </Link>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>
                    <Td right>{x.items.length}</Td>
                    <Td right>{x.discountPct ? <Badge tone={x.discountPct > 10 ? "amber" : "gray"}>{x.discountPct}%</Badge> : "—"}</Td>
                    <Td right className="font-medium">{money(x.total)}</Td>
                    <Td>
                      <span className="flex gap-1">
                        {x.sentVia?.includes("EMAIL") && <Mail className="h-4 w-4 text-brand-600" />}
                        {x.sentVia?.includes("LINE") && <MessageCircle className="h-4 w-4 text-[#06C755]" />}
                        {!x.sentVia?.length && <span className="text-slate-300">—</span>}
                      </span>
                    </Td>
                    <Td>
                      <StatusChip kind="quotation" status={x.status} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
