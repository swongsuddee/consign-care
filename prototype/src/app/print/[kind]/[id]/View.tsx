"use client";

import { ArrowLeft, FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { useEffect } from "react";
import { DocumentSheet } from "@/components/DocumentSheet";
import { Hydrated } from "@/components/Providers";
import { LangToggle } from "@/components/LangToggle";
import { Button, EmptyState, PageLoader } from "@/components/ui";
import { useT } from "@/i18n";
import { docFor } from "@/lib/documents";
import { downloadDocExcel, downloadDocPdf } from "@/lib/exportDoc";
import { useData } from "@/lib/store";
import { useRouteParam } from "@/lib/route-param";

export default function PrintPage({ kind: kindSeg, id: idSeg }: { kind: string; id: string }) {
  const kind = useRouteParam("kind", kindSeg);
  const id = useRouteParam("id", idSeg);
  return (
    <Hydrated fallback={<PageLoader />}>
      <PrintInner kind={kind} id={id} />
    </Hydrated>
  );
}

function PrintInner({ kind, id }: { kind: string; id: string }) {
  const { t } = useT();
  const d = useData();
  const doc = docFor(d, kind, id);

  useEffect(() => {
    if (doc) document.title = `${doc.no} – ConsignCare`;
    const auto = new URLSearchParams(window.location.search).get("print");
    if (doc && auto === "1") {
      const tm = setTimeout(() => window.print(), 600);
      return () => clearTimeout(tm);
    }
  }, [doc]);

  if (!doc) return <EmptyState title={t("g.noResults")} />;

  return (
    <div className="min-h-screen bg-slate-200/70 pb-10 print:bg-white print:pb-0">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur print:hidden">
        <Button variant="ghost" size="sm" onClick={() => (window.history.length > 1 ? window.history.back() : window.close())}>
          <ArrowLeft className="h-4 w-4" /> {t("g.back")}
        </Button>
        <p className="hidden text-sm font-semibold text-slate-700 sm:block">{doc.no}</p>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button variant="outline" size="sm" onClick={() => void downloadDocPdf(doc)} className="text-rose-700">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => void downloadDocExcel(doc)} className="text-emerald-700">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button size="sm" onClick={() => window.print()} className="bg-rose-600 hover:bg-rose-700">
            <Printer className="h-4 w-4" /> {t("doc.print")}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto px-2 pt-6 print:p-0">
        <div className="min-w-[760px] print:min-w-0">
          <DocumentSheet {...doc} />
        </div>
      </div>
    </div>
  );
}
