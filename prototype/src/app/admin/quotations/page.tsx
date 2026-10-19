"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, Mail, MessageCircle, PlusCircle } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { exportExcel } from "@/lib/excel";
import { LinkButton, PageHeader, TableWrap, Td, rowCls, useTable, type Col } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import { name } from "@/lib/selectors";
import { useData } from "@/lib/store";
import type { Quotation, QuotationStatus } from "@/lib/types";

const STATUSES: QuotationStatus[] = ["APPROVED", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

export default function QuotationsPage() {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const router = useRouter();
  const hosp = (x: Quotation) => d.hospitals.find((y) => y.id === x.hospitalId);
  const caseNo = (x: Quotation) => d.cases.find((y) => y.id === x.caseId)?.no ?? "";
  const channels = (x: Quotation) => (x.sentVia?.length ? [...x.sentVia].sort().join("+") : "NONE");
  const cols: Col<Quotation>[] = [
    { key: "no", label: t("a.docNo"), sort: (x) => x.no, text: (x) => x.no },
    { key: "date", label: t("g.date"), sort: (x) => x.date, range: { type: "date", get: (x) => x.date } },
    { key: "customer", label: t("a.customer"), sort: (x) => name(hosp(x), lang), text: (x) => `${hosp(x)?.name ?? ""} ${hosp(x)?.nameTh ?? ""}` },
    { key: "case", label: t("g.case"), sort: caseNo, text: caseNo },
    { key: "items", label: t("g.items"), right: true, sort: (x) => x.items.length },
    {
      key: "discount",
      label: t("g.discount"),
      right: true,
      sort: (x) => x.discountPct,
      options: [
        { value: "YES", label: t("a.qt.hasDiscount") },
        { value: "NO", label: t("a.qt.noDiscount") },
      ],
      value: (x) => (x.discountPct > 0 ? "YES" : "NO"),
    },
    { key: "total", label: t("g.total"), right: true, sort: (x) => x.total, range: { type: "number", get: (x) => x.total, format: (n) => money(n, 0) } },
    {
      key: "sent",
      label: t("a.qt.sentVia"),
      sort: channels,
      options: [
        { value: "EMAIL", label: "Email" },
        { value: "LINE", label: "LINE" },
        { value: "EMAIL+LINE", label: "Email + LINE" },
        { value: "NONE", label: t("a.qt.notSent") },
      ],
      value: channels,
    },
    { key: "status", label: t("g.status"), sort: (x) => t(`qs.${x.status}`), options: STATUSES.map((s) => ({ value: s, label: t(`qs.${s}`) })), value: (x) => x.status, multi: true },
  ];
  const table = useTable(d.quotations, cols, { key: "no", dir: "desc" });
  const rows = table.rows;

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
                exportExcel("quotations.xlsx", "Quotations", [
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
        {table.summary}
        <TableWrap maxH="calc(100vh - 260px)" dense>
          <thead>{table.head}</thead>
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
                  <Td right className="font-medium">
                    {money(x.total)}
                  </Td>
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
        {rows.length === 0 && <EmptyState icon={<FileText className="h-6 w-6" />} title={t("g.noResults")} />}
      </Card>
    </div>
  );
}
