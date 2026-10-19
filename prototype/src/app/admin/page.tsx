"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckSquare, ClipboardList, FolderOpen, Package, PlusCircle, Receipt, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HospitalArt } from "@/components/art";
import { Avatar } from "@/components/PersonaSwitcher";
import { Badge, Card, CardHeader, EmptyState, StatTile } from "@/components/ui";
import { LinkButton, PageHeader, TableWrap, Td, Th, rowCls } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import { DEMO_TODAY } from "@/lib/ops";
import { caseStats, expiringLots, hospitalStats, name, pendingApprovals, revenueWaitingBilling } from "@/lib/selectors";
import { useCurrentUser, useData } from "@/lib/store";
import type { CaseStatus } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  USAGE_RECORDED: "#3b82f6",
  QUOTED: "#6366f1",
  WAITING_PO: "#f59e0b",
  PO_RECEIVED: "#14b8a6",
  REQUISITIONED: "#8b5cf6",
  BILLED: "#0ea5e9",
  CLOSED: "#10b981",
};

export default function DashboardPage() {
  const { t, lang, money, num, date, rel } = useFmt();
  const d = useData();
  const me = useCurrentUser();
  const router = useRouter();
  const all = caseStats(d, d.cases);
  const pa = pendingApprovals(d);
  const pending = pa.requisitions.length + pa.prs.length;
  const expiring = expiringLots(d, 90);

  const chart = (Object.keys(STATUS_COLORS) as CaseStatus[]).map((s) => ({
    status: s,
    label: t(`cs.${s}`),
    count: d.cases.filter((c) => c.status === s).length,
  }));

  return (
    <div>
      <PageHeader
        title={t("a.dash.title")}
        subtitle={t("a.dash.subtitle", { name: name(me, lang), date: date(DEMO_TODAY) })}
        actions={
          <>
            <LinkButton href="/admin/usage/new" variant="outline">
              <PlusCircle className="h-4 w-4" /> {t("a.nav.newUsage")}
            </LinkButton>
            <LinkButton href="/admin/quotations/new">
              <PlusCircle className="h-4 w-4" /> {t("a.qt.new")}
            </LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile tone="blue" icon={<FolderOpen className="h-5 w-5" />} value={num(all.open)} label={t("a.kpi.open")} onClick={() => router.push("/admin/cases?status=open")} />
        <StatTile tone="orange" icon={<ClipboardList className="h-5 w-5" />} value={num(all.waitingPo)} label={t("a.kpi.waitingPo")} onClick={() => router.push("/admin/cases?status=waitingPo")} />
        <StatTile tone="purple" icon={<Receipt className="h-5 w-5" />} value={num(all.waitingBilling)} label={t("a.kpi.waitingBilling")} onClick={() => router.push("/admin/billing")} />
        <StatTile tone="green" icon={<Wallet className="h-5 w-5" />} value={money(revenueWaitingBilling(d), 0)} label={t("a.kpi.revenue")} onClick={() => router.push("/admin/billing")} />
        <StatTile tone="slate" icon={<Package className="h-5 w-5" />} value={num(all.usageMonth)} label={t("a.kpi.usageMonth")} onClick={() => router.push("/admin/cases")} />
        <StatTile tone="rose" icon={<CheckSquare className="h-5 w-5" />} value={num(pending)} label={t("a.kpi.approvals")} onClick={() => router.push("/admin/approvals")} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title={t("a.dash.byStatus")} subtitle={t("a.dash.byStatusSub")} />
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} tickLine={false} axisLine={false} height={40} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(37,99,235,0.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v) => [v, t("g.cases")]} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={44}>
                  {chart.map((c) => (
                    <Cell key={c.status} fill={STATUS_COLORS[c.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title={t("a.dash.recent")}
            action={
              <Link href="/admin/activity" className="text-xs font-medium text-brand-700 hover:underline">
                {t("g.viewAll")}
              </Link>
            }
          />
          <ul className="divide-y divide-slate-50">
            {d.activity.slice(0, 7).map((a) => {
              const u = d.users.find((x) => x.id === a.actorId);
              return (
                <li key={a.id} className="flex items-start gap-3 px-5 py-2.5">
                  <Avatar user={u} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">{t(`act.${a.action}`, { ref: a.ref })}</p>
                    <p className="truncate text-xs text-slate-500">
                      {name(u, lang)}
                      {a.hospitalId ? ` · ${name(d.hospitals.find((h) => h.id === a.hospitalId), lang)}` : ""} · {rel(a.at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title={t("a.dash.perHospital")} subtitle={t("a.dash.perHospitalSub")} />
          <TableWrap>
            <thead>
              <tr>
                <Th>{t("g.hospital")}</Th>
                <Th right>{t("a.kpi.open")}</Th>
                <Th right>{t("a.kpi.usageMonth")}</Th>
                <Th right>{t("a.kpi.waitingPo")}</Th>
                <Th right>{t("a.kpi.waitingBilling")}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {d.hospitals.map((h) => {
                const s = hospitalStats(d, h.id);
                return (
                  <tr key={h.id} className={rowCls}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <HospitalArt palette={h.palette} className="h-9 w-12 shrink-0 rounded-lg" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">{name(h, lang)}</p>
                          <p className="text-xs text-slate-400">{h.code}</p>
                        </div>
                      </div>
                    </Td>
                    <Td right className="font-semibold text-slate-800">{num(s.open)}</Td>
                    <Td right>{num(s.usageMonth)}</Td>
                    <Td right>{s.waitingPo ? <Badge tone="amber">{s.waitingPo}</Badge> : <span className="text-slate-300">0</span>}</Td>
                    <Td right>{s.waitingBilling ? <Badge tone="violet">{s.waitingBilling}</Badge> : <span className="text-slate-300">0</span>}</Td>
                    <Td right>
                      <Link href={`/admin/cases?hospital=${h.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                        {t("a.nav.cases")} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            icon={<AlertTriangle className="h-5 w-5" />}
            title={t("a.dash.expiring")}
            subtitle={t("a.dash.expiringSub")}
            action={<Badge tone={expiring.length ? "amber" : "green"}>{expiring.length}</Badge>}
          />
          {expiring.length === 0 ? (
            <EmptyState title={t("a.dash.noExpiring")} />
          ) : (
            <TableWrap maxH="320px">
              <thead>
                <tr>
                  <Th>{t("g.product")}</Th>
                  <Th>{t("g.lot")}</Th>
                  <Th>{t("a.inv.location")}</Th>
                  <Th right>{t("g.qty")}</Th>
                  <Th right>{t("g.exp")}</Th>
                </tr>
              </thead>
              <tbody>
                {expiring.map((x) => {
                  const loc = d.locations.find((l) => l.id === x.locationId);
                  return (
                    <tr key={x.locationId + x.lotId} className={rowCls}>
                      <Td>
                        <Link href={`/admin/inventory?q=${encodeURIComponent(x.product.ref)}`} className="font-medium text-slate-800 hover:text-brand-700">
                          {x.product.name}
                        </Link>
                      </Td>
                      <Td className="font-mono text-xs">{x.lot.lotNo}</Td>
                      <Td className="max-w-[160px] truncate text-xs">{name(loc, lang)}</Td>
                      <Td right>{x.qty}</Td>
                      <Td right>
                        <Badge tone={x.daysLeft < 0 ? "red" : x.daysLeft <= 30 ? "red" : "amber"}>
                          {x.daysLeft < 0 ? t("a.inv.expired") : t("a.inv.daysLeft", { n: x.daysLeft })}
                        </Badge>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  );
}
