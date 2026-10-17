"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { DocumentSheet, type DocProps } from "@/components/DocumentSheet";
import { Button, Modal, Textarea, Field, cx } from "@/components/ui";
import { useT } from "@/i18n";
import { useCurrentUser, useStore } from "@/lib/store";
import { viewDoc } from "@/components/DocViewer";

/* ---------------------------------------------------------------- page header */

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  badge,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: string;
  badge?: ReactNode;
}) {
  const { t } = useT();
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("g.back")}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-navy-800 sm:text-2xl">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- link button */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "navy";
const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20",
  navy: "bg-navy-800 text-white hover:bg-navy-900",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};
const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  target,
}: {
  href: string;
  variant?: Variant;
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
  target?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      className={cx("inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors", variants[variant], sizes[size], className)}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- tables */

export function TableWrap({ children, className, maxH }: { children: ReactNode; className?: string; maxH?: string }) {
  return (
    <div className={cx("thin-scrollbar overflow-x-auto", maxH && "overflow-y-auto", className)} style={maxH ? { maxHeight: maxH } : undefined}>
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return (
    <th
      className={cx(
        "sticky top-0 z-[1] border-b border-slate-100 bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur",
        right && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return <td className={cx("border-b border-slate-50 px-4 py-3 align-middle text-slate-700", right && "text-right tabular-nums", className)}>{children}</td>;
}

export const rowCls = "transition-colors hover:bg-brand-50/40";

/* ---------------------------------------------------------------- key/value */

export function KV({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 truncate text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- modals */

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  desc,
  confirmLabel,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  desc?: ReactNode;
  confirmLabel?: ReactNode;
  danger?: boolean;
}) {
  const { t } = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("g.cancel")}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? t("g.confirm")}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{desc}</div>
    </Modal>
  );
}

/** Approve / reject with an optional note */
export function DecisionModal({
  open,
  onClose,
  approve,
  refNo,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  approve: boolean;
  refNo: string;
  onSubmit: (note?: string) => void;
}) {
  const { t } = useT();
  const [note, setNote] = useState("");
  const me = useCurrentUser();
  const manager = useStore((s) => s.data.users.find((u) => u.role === "MANAGER"));
  const setAdminUser = useStore((s) => s.setAdminUser);
  const asManager = me.role !== "MANAGER" && manager;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={approve ? t("a.dec.approveTitle", { ref: refNo }) : t("a.dec.rejectTitle", { ref: refNo })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("g.cancel")}
          </Button>
          <Button
            variant={approve ? "success" : "danger"}
            onClick={() => {
              onSubmit(note.trim() || undefined);
              if (asManager) setAdminUser(manager.id);
              setNote("");
              onClose();
            }}
          >
            {approve ? t("a.dec.approve") : t("a.dec.reject")}
          </Button>
        </>
      }
    >
      {asManager && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("a.dec.asManager", { name: manager.name })}
        </p>
      )}
      <Field label={t("g.note")} hint={t("g.optional")}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("a.dec.notePh")} />
      </Field>
    </Modal>
  );
}

/* ---------------------------------------------------------------- doc preview */

const A4_PX = 794;

/** A4 DocumentSheet scaled down to fit its container */
export function DocPreview({ doc, className }: { doc: DocProps; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / A4_PX);
      setScale(s);
      setH(inner.current.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className={cx("relative w-full overflow-hidden", className)} style={{ height: h }}>
      <div ref={inner} style={{ width: A4_PX, transform: `scale(${scale})`, transformOrigin: "top left" }} className="absolute left-0 top-0">
        <DocumentSheet {...doc} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- misc */

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>
      {action}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  icon: ReactNode;
}) {
  return (
    <div className={cx("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}

/** Show a document in the in-app viewer (PDF / Excel / Print from there). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function openPrint(kind: "quotation" | "pr" | "invoice" | "requisition", id: string, _auto = true) {
  viewDoc(kind, id);
}
