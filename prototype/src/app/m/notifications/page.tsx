"use client";

import { BellOff, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { entityIcon, useMe } from "@/components/mobile/bits";
import { MScreen } from "@/components/mobile/MScreen";
import { ActivityRow } from "@/components/mobile/bits";
import { EmptyState, Tabs, cx } from "@/components/ui";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { name } from "@/lib/selectors";
import { useData, useOp } from "@/lib/store";

const ENTITY_OF: Record<string, string> = {
  poUploaded: "PO",
  poArrived: "PO",
  poRecorded: "PO",
  quotationCreated: "QUOTATION",
  quotationRequested: "QUOTATION",
  approvalRequested: "PR",
  invoiceIssued: "INVOICE",
  requisitionIssued: "REQUISITION",
  caseClosed: "INVOICE",
  usageRecorded: "CASE",
};

export default function NotificationsPage() {
  const { t, lang, rel } = useFmt();
  const d = useData();
  const me = useMe();
  const run = useOp();
  const [tab, setTab] = useState<"notif" | "activity">("notif");
  const list = d.notifications.filter((n) => n.userId === me.id || n.userId === "*");
  const unread = list.filter((n) => !n.read).length;
  const activity = d.activity.filter((a) => !a.hospitalId || me.hospitalIds.includes(a.hospitalId)).slice(0, 40);

  return (
    <MScreen
      title={t("g.notifications")}
      back="/m/home"
      right={
        unread > 0 && tab === "notif" ? (
          <button onClick={() => run(ops.markAllRead)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" aria-label={t("g.markAllRead")} title={t("g.markAllRead")}>
            <CheckCheck className="h-5 w-5" />
          </button>
        ) : null
      }
    >
      <div className="sticky top-0 z-10 bg-white px-2">
        <Tabs
          value={tab}
          onChange={setTab}
          className="[&>button]:flex-1"
          tabs={[
            { id: "notif", label: t("g.notifications"), count: unread },
            { id: "activity", label: t("m.home.recentActivity") },
          ]}
        />
      </div>
      {tab === "notif" ? (
        <div className="p-4">
          {list.length === 0 ? (
            <EmptyState icon={<BellOff className="h-6 w-6" />} title={t("m.notif.empty")} />
          ) : (
            <ul className="space-y-2">
              {list.map((n) => {
                const { icon: Icon, cls } = entityIcon(ENTITY_OF[n.action] ?? "CASE");
                const href = n.href.startsWith("/admin") ? n.href.replace(/^\/admin\/cases\//, "/m/cases/") : n.href;
                return (
                  <li key={n.id}>
                    <Link
                      href={href.startsWith("/admin") ? "/m/home" : href}
                      className={cx("flex items-start gap-3 rounded-2xl p-3 shadow-card transition", n.read ? "bg-white" : "bg-brand-50/70 ring-1 ring-brand-100")}
                    >
                      <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-xl", cls)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{t(`act.${n.action}`, { ref: n.ref })}</p>
                        <p className="truncate text-xs text-slate-500">{name(d.hospitals.find((h) => h.id === n.hospitalId), lang)}</p>
                        <p className="text-[11px] text-slate-400">{rel(n.at)}</p>
                      </div>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 px-4">
          {activity.map((a) => (
            <ActivityRow key={a.id} a={a} d={d} />
          ))}
        </div>
      )}
    </MScreen>
  );
}
