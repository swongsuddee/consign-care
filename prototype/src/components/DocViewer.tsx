"use client";

import { FileDown, FileSpreadsheet, Printer, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { create } from "zustand";
import { DocumentSheet, type DocProps } from "@/components/DocumentSheet";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { docFor } from "@/lib/documents";
import { downloadDocExcel, downloadDocPdf } from "@/lib/exportDoc";
import { useData } from "@/lib/store";
import { asset } from "@/lib/base";

export type DocKind = DocProps["kind"];

/** Which document is open in the viewer. Not persisted: a refresh closes it. */
export const useDocViewer = create<{ open: { kind: DocKind; id: string } | null }>(() => ({ open: null }));

/** Open a document over whatever screen is showing — back-office or the phone frame. */
export function viewDoc(kind: DocKind, id: string) {
  useDocViewer.setState({ open: { kind, id } });
}

const A4 = 794;

/** Full-screen document overlay: the A4 sheet, scaled to fit, with PDF / Excel / Print. */
export function DocViewer() {
  const open = useDocViewer((s) => s.open);
  const d = useData();
  const doc = open ? docFor(d, open.kind, open.id) : null;
  const close = () => useDocViewer.setState({ open: null });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !doc) return null;
  return <Viewer doc={doc} kind={open.kind} id={open.id} onClose={close} />;
}

function Viewer({ doc, kind, id, onClose }: { doc: DocProps; kind: DocKind; id: string; onClose: () => void }) {
  const { t } = useT();
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState<number>();

  useLayoutEffect(() => {
    const measure = () => {
      if (!body.current || !sheet.current) return;
      const s = Math.min(1, (body.current.clientWidth - 32) / A4);
      setScale(s);
      setH(sheet.current.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (body.current) ro.observe(body.current);
    if (sheet.current) ro.observe(sheet.current);
    return () => ro.disconnect();
  }, []);

  const save = async (fmt: "pdf" | "xlsx") => {
    setBusy(fmt);
    try {
      if (fmt === "pdf") await downloadDocPdf(doc);
      else await downloadDocExcel(doc);
      toast.success(t("doc.downloaded", { file: `${doc.no}.${fmt}` }));
    } catch {
      toast.error(t("doc.downloadFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/70 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label={doc.no} onClick={onClose}>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-navy-900/95 px-3 py-2.5 text-white sm:px-5" onClick={(e) => e.stopPropagation()}>
        <p className="mr-auto min-w-0 truncate text-sm font-semibold">
          {t(`doc.kind.${kind}`)} <span className="font-mono text-white/70">{doc.no}</span>
        </p>
        <Button size="sm" className="!bg-rose-600 hover:!bg-rose-700" onClick={() => void save("pdf")} loading={busy === "pdf"}>
          <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">{t("doc.downloadPdf")}</span><span className="sm:hidden">PDF</span>
        </Button>
        <Button size="sm" className="!bg-emerald-600 hover:!bg-emerald-700" onClick={() => void save("xlsx")} loading={busy === "xlsx"}>
          <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">{t("doc.downloadExcel")}</span><span className="sm:hidden">Excel</span>
        </Button>
        <Button size="sm" variant="ghost" className="hidden text-white hover:bg-white/10 sm:inline-flex" onClick={() => window.open(asset(`/print/${kind}/${id}?print=1`), "_blank")}>
          <Printer className="h-4 w-4" /> {t("doc.print")}
        </Button>
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" aria-label={t("g.close")}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <div ref={body} className="flex-1 overflow-y-auto px-4 py-6" onClick={onClose}>
        <div className="relative mx-auto" style={{ width: A4 * scale, height: h }} onClick={(e) => e.stopPropagation()}>
          <div ref={sheet} className="absolute left-0 top-0" style={{ width: A4, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <DocumentSheet {...doc} />
          </div>
        </div>
      </div>
    </div>
  );
}
