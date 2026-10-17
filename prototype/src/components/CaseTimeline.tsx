"use client";

import { Check, Clock, X } from "lucide-react";
import type { ReactNode } from "react";
import { useFmt } from "@/lib/format";
import { caseInvoice, casePo, caseQuotation, caseRequisition } from "@/lib/selectors";
import type { Case, CaseStatus, Data } from "@/lib/types";
import { CASE_FLOW } from "@/lib/types";
import { cx } from "./ui";

export type StepId = "usage" | "quotation" | "po" | "requisition" | "billing" | "closed";

export const STEPS: { id: StepId; status: CaseStatus }[] = [
  { id: "usage", status: "USAGE_RECORDED" },
  { id: "quotation", status: "QUOTED" },
  { id: "po", status: "PO_RECEIVED" },
  { id: "requisition", status: "REQUISITIONED" },
  { id: "billing", status: "BILLED" },
  { id: "closed", status: "CLOSED" },
];

export function stepState(c: Case, status: CaseStatus): "done" | "current" | "pending" | "skipped" {
  const idx = CASE_FLOW.indexOf(c.status);
  const target = CASE_FLOW.indexOf(status);
  if (c.status === "CANCELLED") return c.history[status] ? "done" : "pending";
  if (idx >= target) return c.history[status] || status !== "REQUISITIONED" ? "done" : "skipped";
  // the next step to do
  const nextIdx = STEPS.findIndex((s) => CASE_FLOW.indexOf(s.status) > idx);
  return STEPS[nextIdx]?.status === status ? "current" : "pending";
}

/** Vertical journey timeline: Usage → Quotation → PO → Requisition → Billing → Closed */
export function CaseTimeline({
  c,
  d,
  action,
  dense,
}: {
  c: Case;
  d: Data;
  action?: (step: StepId) => ReactNode;
  dense?: boolean;
}) {
  const { t, dateTime } = useFmt();
  const q = caseQuotation(d, c.id);
  const po = casePo(d, c.id);
  const rq = caseRequisition(d, c.id);
  const inv = caseInvoice(d, c.id);

  const sub: Record<StepId, string | undefined> = {
    usage: undefined,
    quotation: q?.no,
    po: po?.poNo ?? (c.status === "WAITING_PO" || c.status === "QUOTED" ? t("step.waitingPo") : undefined),
    requisition: rq ? `${rq.no} · ${t(`rs.${rq.status}`)}` : undefined,
    billing: inv ? `${inv.no} · ${t(`is.${inv.status}`)}` : undefined,
    closed: undefined,
  };

  return (
    <ol className="relative">
      {STEPS.map((s, i) => {
        const st = stepState(c, s.status);
        const at = c.history[s.status];
        const last = i === STEPS.length - 1;
        return (
          <li key={s.id} className={cx("relative flex gap-3", dense ? "pb-4" : "pb-6", last && "pb-0")}>
            {!last && (
              <span
                className={cx(
                  "absolute left-[13px] top-7 bottom-0 w-0.5",
                  st === "done" || st === "skipped" ? "bg-emerald-300" : "bg-slate-200",
                )}
              />
            )}
            <span
              className={cx(
                "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full ring-4 ring-white",
                st === "done" && "bg-emerald-500 text-white",
                st === "skipped" && "bg-slate-300 text-white",
                st === "current" && "bg-amber-400 text-white",
                st === "pending" && "bg-slate-100 text-slate-400",
              )}
            >
              {st === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : st === "current" ? <Clock className="h-4 w-4" /> : st === "skipped" ? <X className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pt-0.5">
              <div className="min-w-0">
                <p className={cx("text-sm font-semibold", st === "done" ? "text-emerald-700" : st === "current" ? "text-amber-700" : "text-slate-400")}>
                  {t(`step.${s.id}`)}
                </p>
                <p className="text-xs text-slate-500">
                  {st === "done" && at ? dateTime(at) : st === "current" ? t("step.inProgress") : st === "skipped" ? "—" : t("step.pending")}
                </p>
                {sub[s.id] && (st === "done" || st === "current") && <p className="truncate text-xs font-medium text-slate-600">{sub[s.id]}</p>}
              </div>
              {action && <div className="shrink-0">{action(s.id)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
