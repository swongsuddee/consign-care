"use client";

import { ClipboardCheck, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { HospitalArt, ProductArt } from "@/components/art";
import { CaseRow } from "@/components/mobile/bits";
import { MScreen } from "@/components/mobile/MScreen";
import { StatusChip } from "@/components/StatusChip";
import { Badge, Button, EmptyState, Tabs } from "@/components/ui";
import { useFmt } from "@/lib/format";
import { hospitalStats, name, usageRows } from "@/lib/selectors";
import { useData } from "@/lib/store";

type Tab = "summary" | "cases" | "usage" | "po" | "billing";

export default function AccountDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang, date, money } = useFmt();
  const d = useData();
  const [tab, setTab] = useState<Tab>("summary");
  const h = d.hospitals.find((x) => x.id === id);
  if (!h)
    return (
      <MScreen title="-" back="/m/accounts">
        <EmptyState title={t("g.noResults")} />
      </MScreen>
    );

  const s = hospitalStats(d, h.id);
  const cases = d.cases.filter((c) => c.hospitalId === h.id);
  const usage = usageRows(d).filter((r) => r.c.hospitalId === h.id);
  const pos = d.customerPos.filter((p) => p.hospitalId === h.id);
  const incoming = d.incomingPos.filter((p) => p.hospitalId === h.id);
  const invoices = d.invoices.filter((i) => i.hospitalId === h.id);

  return (
    <MScreen
      title={name(h, lang)}
      back="/m/accounts"
      footer={
        <Link href={`/m/cases/new?hospital=${h.id}`}>
          <Button className="w-full" size="lg">
            <Plus className="h-5 w-5" /> {t("m.home.newCase")}
          </Button>
        </Link>
      }
    >
      <div className="sticky top-0 z-10 bg-white px-2">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "summary", label: t("m.acc.summary") },
            { id: "cases", label: t("g.cases") },
            { id: "usage", label: t("m.acc.usage") },
            { id: "po", label: "PO" },
            { id: "billing", label: t("m.acc.billing") },
          ]}
        />
      </div>

      {tab === "summary" && (
        <div className="space-y-4 p-4">
          <div className="overflow-hidden rounded-2xl shadow-card">
            <HospitalArt palette={h.palette} className="h-36" label={h.name} />
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-card">
            {[
              [t("m.home.usageMonth"), s.usageMonth],
              [t("m.acc.casesMonth"), s.casesMonth],
              [t("m.home.waitingPo"), s.waitingPo],
              [t("m.home.waitingBilling"), s.waitingBilling],
            ].map(([l, v]) => (
              <div key={l as string}>
                <p className="text-xs text-slate-500">{l}</p>
                <p className="text-2xl font-bold tabular-nums text-navy-800">{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{t("m.acc.recentUsage")}</h3>
              <button onClick={() => setTab("usage")} className="text-xs font-semibold text-brand-600">
                {t("g.viewAll")}
              </button>
            </div>
            {usage.slice(0, 4).map(({ u, c, product }) => (
              <Link key={u.id} href={`/m/cases/${c.id}`} className="flex items-center gap-3 border-b border-slate-50 py-2.5 last:border-0">
                <ProductArt category={product.category} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-400">{date(c.caseDate)}</p>
                  <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                  <p className="truncate text-xs text-slate-500">{name(d.doctors.find((x) => x.id === c.doctorId), lang)}</p>
                </div>
                <span className="text-xs text-slate-500">
                  {t("g.qty")} <b className="text-slate-800">{u.qty}</b>
                </span>
              </Link>
            ))}
            {usage.length === 0 && <EmptyState title={t("g.noData")} />}
          </div>
        </div>
      )}

      {tab === "cases" && (
        <div className="space-y-2.5 p-4">
          {cases.length === 0 && <EmptyState title={t("g.noData")} />}
          {cases.map((c) => (
            <CaseRow key={c.id} c={c} d={d} />
          ))}
        </div>
      )}

      {tab === "usage" && (
        <div className="space-y-2 p-4">
          {usage.length === 0 && <EmptyState title={t("g.noData")} />}
          {usage.map(({ u, c, product, lot }) => (
            <Link key={u.id} href={`/m/cases/${c.id}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card">
              <ProductArt category={product.category} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                <p className="text-[11px] text-slate-500">
                  {date(c.caseDate)} · {c.no} {lot && `· LOT ${lot.lotNo}`}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-700">×{u.qty}</span>
            </Link>
          ))}
        </div>
      )}

      {tab === "po" && (
        <div className="space-y-2 p-4">
          {incoming.map((p) => (
            <div key={p.poNo} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <ClipboardCheck className="h-5 w-5 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{p.poNo}</p>
                <p className="text-[11px] text-slate-500">
                  {p.quotationNo} · {p.channel} · {t("m.acc.poInbox")}
                </p>
              </div>
              <span className="text-xs font-semibold">{money(p.amount, 0)}</span>
            </div>
          ))}
          {pos.length === 0 && incoming.length === 0 && <EmptyState title={t("g.noData")} />}
          {pos.map((p) => {
            const q = d.quotations.find((x) => x.id === p.quotationId);
            return (
              <Link key={p.id} href={p.caseId ? `/m/cases/${p.caseId}` : "#"} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card">
                <ClipboardCheck className="h-5 w-5 text-teal-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{p.poNo}</p>
                  <p className="text-[11px] text-slate-500">
                    {date(p.date)} · {q?.no}
                  </p>
                </div>
                <span className="text-xs font-semibold">{money(p.amount, 0)}</span>
              </Link>
            );
          })}
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-2 p-4">
          {invoices.length === 0 && <EmptyState title={t("g.noData")} />}
          {invoices.map((i) => (
            <Link key={i.id} href={`/m/cases/${i.caseId}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{i.no}</p>
                <p className="text-[11px] text-slate-500">
                  {t("m.acc.due")} {date(i.dueDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">{money(i.amount, 0)}</p>
                <StatusChip kind="invoice" status={i.status} />
              </div>
            </Link>
          ))}
          {invoices.length > 0 && (
            <div className="pt-2 text-center">
              <Badge tone="gray">
                {t("g.total")} {money(invoices.filter((i) => i.status !== "PAID" && i.status !== "VOID").reduce((a, i) => a + i.amount, 0), 0)} {t("m.acc.outstanding")}
              </Badge>
            </div>
          )}
        </div>
      )}
    </MScreen>
  );
}
