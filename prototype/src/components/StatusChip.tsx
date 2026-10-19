"use client";

import { useT } from "@/i18n";
import { Badge, type Tone } from "./ui";

const CASE: Record<string, Tone> = {
  DRAFT: "gray",
  USAGE_RECORDED: "blue",
  QUOTED: "indigo",
  WAITING_PO: "amber",
  PO_RECEIVED: "teal",
  REQUISITIONED: "violet",
  BILLED: "sky",
  CLOSED: "green",
  CANCELLED: "red",
};
const QUOTATION: Record<string, Tone> = {
  APPROVED: "teal",
  SENT: "blue",
  ACCEPTED: "green",
  EXPIRED: "gray",
  REJECTED: "red",
};
const REQ: Record<string, Tone> = {
  DRAFT: "gray",
  SUBMITTED: "amber",
  APPROVED: "teal",
  REJECTED: "red",
  ISSUED: "green",
  ORDERED: "blue",
  RECEIVED: "green",
};
const INV: Record<string, Tone> = { ISSUED: "blue", PAID: "green", OVERDUE: "red", VOID: "gray" };

export type ChipKind = "case" | "quotation" | "requisition" | "pr" | "invoice";

export function StatusChip({ kind, status, className }: { kind: ChipKind; status: string; className?: string }) {
  const { t } = useT();
  const map = kind === "case" ? CASE : kind === "quotation" ? QUOTATION : kind === "invoice" ? INV : REQ;
  const prefix = kind === "case" ? "cs" : kind === "quotation" ? "qs" : kind === "invoice" ? "is" : "rs";
  return (
    <Badge tone={map[status] ?? "gray"} dot className={className}>
      {t(`${prefix}.${status}`)}
    </Badge>
  );
}
