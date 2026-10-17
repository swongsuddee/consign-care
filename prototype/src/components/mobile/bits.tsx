"use client";

import { Building2, ChevronRight, ClipboardCheck, FileText, Package, Receipt, ShoppingCart, Stethoscope, Truck } from "lucide-react";
import Link from "next/link";
import { useFmt } from "@/lib/format";
import { name } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { ActivityLog, Case, Data, Hospital } from "@/lib/types";
import { StatusChip } from "../StatusChip";
import { cx } from "../ui";

export function useMe() {
  const id = useStore((s) => s.mobileUserId);
  const users = useStore((s) => s.data.users);
  return users.find((u) => u.id === id) ?? users[0];
}

export function useMyHospitals(): Hospital[] {
  const me = useMe();
  const hospitals = useStore((s) => s.data.hospitals);
  return hospitals.filter((h) => me.hospitalIds.includes(h.id));
}

const ICON: Record<string, { icon: typeof FileText; cls: string }> = {
  CASE: { icon: Stethoscope, cls: "bg-blue-50 text-blue-600" },
  QUOTATION: { icon: FileText, cls: "bg-indigo-50 text-indigo-600" },
  PO: { icon: ClipboardCheck, cls: "bg-teal-50 text-teal-600" },
  REQUISITION: { icon: Truck, cls: "bg-violet-50 text-violet-600" },
  PR: { icon: ShoppingCart, cls: "bg-orange-50 text-orange-600" },
  INVOICE: { icon: Receipt, cls: "bg-emerald-50 text-emerald-600" },
};

export function entityIcon(entity: string) {
  return ICON[entity] ?? { icon: Package, cls: "bg-slate-100 text-slate-500" };
}

/** Maps an activity row to a mobile link when possible */
export function activityHref(d: Data, a: ActivityLog) {
  if (a.entity === "CASE") return `/m/cases/${a.entityId}`;
  const caseId =
    a.entity === "QUOTATION"
      ? d.quotations.find((q) => q.id === a.entityId)?.caseId
      : a.entity === "PO"
        ? d.customerPos.find((p) => p.id === a.entityId)?.caseId
        : a.entity === "INVOICE"
          ? d.invoices.find((i) => i.id === a.entityId)?.caseId
          : a.entity === "REQUISITION"
            ? d.requisitions.find((r) => r.id === a.entityId)?.caseId
            : undefined;
  return caseId ? `/m/cases/${caseId}` : undefined;
}

export function ActivityRow({ a, d }: { a: ActivityLog; d: Data }) {
  const { t, rel, lang } = useFmt();
  const h = d.hospitals.find((x) => x.id === a.hospitalId);
  const { icon: Icon, cls } = entityIcon(a.entity);
  const href = activityHref(d, a);
  const body = (
    <div className="flex items-start gap-3 py-2.5">
      <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-xl", cls)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{t(`act.${a.action}`, { ref: a.ref })}</p>
        <p className="truncate text-xs text-slate-500">{h ? name(h, lang) : name(d.users.find((u) => u.id === a.actorId), lang)}</p>
        <p className="text-[11px] text-slate-400">{rel(a.at)}</p>
      </div>
      {href && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" />}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function CaseRow({ c, d }: { c: Case; d: Data }) {
  const { date, lang, t } = useFmt();
  const h = d.hospitals.find((x) => x.id === c.hospitalId);
  const doc = d.doctors.find((x) => x.id === c.doctorId);
  const proc = d.procedures.find((p) => p.id === c.procedure);
  const items = d.usage.filter((u) => u.caseId === c.id).reduce((s, u) => s + u.qty, 0);
  return (
    <Link href={`/m/cases/${c.id}`} className="block rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card transition active:scale-[0.99]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy-800">{t("g.case")} {c.no}</p>
          <p className="truncate text-xs text-slate-500">{name(h, lang)}</p>
        </div>
        <StatusChip kind="case" status={c.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>{date(c.caseDate)}</span>
        {doc && <span>· {name(doc, lang)}</span>}
        {proc && <span className="truncate">· {name(proc, lang)}</span>}
        <span className="ml-auto font-medium text-slate-600">
          {items} {t("g.items")}
        </span>
      </div>
    </Link>
  );
}

export function HospitalBadge({ h }: { h: Hospital }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${h.palette[0]}, ${h.palette[1]})` }}>
      <Building2 className="h-5 w-5" />
    </span>
  );
}

export function maskHn(hn?: string) {
  if (!hn) return "-";
  return hn.length > 5 ? `${hn.slice(0, 5)}${"•".repeat(Math.max(hn.length - 7, 2))}${hn.slice(-2)}` : hn;
}
