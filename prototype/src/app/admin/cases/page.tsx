"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { FileSpreadsheet, FolderKanban, PlusCircle, Search, X } from "lucide-react";
import { HospitalArt } from "@/components/art";
import { Avatar } from "@/components/PersonaSwitcher";
import { StatusChip } from "@/components/StatusChip";
import { Button, Card, EmptyState, PageLoader, Select } from "@/components/ui";
import { LinkButton, PageHeader, SearchBox, TableWrap, Td, Th, rowCls } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { caseUsage, caseValue, isOpen, name, WAITING_BILLING, WAITING_PO } from "@/lib/selectors";
import { useData } from "@/lib/store";
import { CASE_FLOW, type Case } from "@/lib/types";

export default function CasesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CasesInner />
    </Suspense>
  );
}

const GROUPS: Record<string, (c: Case) => boolean> = {
  open: isOpen,
  waitingPo: (c) => WAITING_PO.includes(c.status),
  waitingBilling: (c) => WAITING_BILLING.includes(c.status),
};

function CasesInner() {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [hospital, setHospital] = useState(sp.get("hospital") ?? "");
  const [rep, setRep] = useState(sp.get("rep") ?? "");

  const reps = d.users.filter((u) => u.role === "SALES_REP");
  const hosp = (id: string) => d.hospitals.find((h) => h.id === id);

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return d.cases.filter((c) => {
      if (status) {
        if (GROUPS[status]) {
          if (!GROUPS[status](c)) return false;
        } else if (c.status !== status) return false;
      }
      if (hospital && c.hospitalId !== hospital) return false;
      if (rep && c.repId !== rep) return false;
      if (!k) return true;
      const h = d.hospitals.find((x) => x.id === c.hospitalId);
      const doc = d.doctors.find((x) => x.id === c.doctorId);
      return [c.no, c.patientHn ?? "", c.patientName ?? "", h?.name ?? "", h?.nameTh ?? "", doc?.name ?? "", doc?.nameTh ?? ""].some((x) => x.toLowerCase().includes(k));
    });
  }, [d, q, status, hospital, rep]);

  const filtered = q || status || hospital || rep;

  const exportRows = () =>
    exportExcel("cases.xlsx", "Cases", [
      ["Case", "Date", "Hospital", "Doctor", "Procedure", "Rep", "Items", "Value", "Status"],
      ...rows.map((c) => [
        c.no,
        c.caseDate,
        hosp(c.hospitalId)?.name ?? "",
        d.doctors.find((x) => x.id === c.doctorId)?.name ?? "",
        d.procedures.find((p) => p.id === c.procedure)?.name ?? c.procedure ?? "",
        d.users.find((u) => u.id === c.repId)?.name ?? "",
        caseUsage(d, c.id).reduce((a, u) => a + u.qty, 0),
        caseValue(d, c.id),
        c.status,
      ]),
    ]);

  return (
    <div>
      <PageHeader
        title={t("a.cases.title")}
        subtitle={t("a.cases.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={exportRows}>
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
            </Button>
            <LinkButton href="/admin/usage/new">
              <PlusCircle className="h-4 w-4" /> {t("a.nav.newUsage")}
            </LinkButton>
          </>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_220px_180px_auto]">
          <SearchBox value={q} onChange={setQ} placeholder={t("a.cases.searchPh")} icon={<Search className="h-4 w-4" />} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("a.cases.allStatus")}</option>
            <option value="open">{t("a.kpi.open")}</option>
            <option value="waitingPo">{t("a.kpi.waitingPo")}</option>
            <option value="waitingBilling">{t("a.kpi.waitingBilling")}</option>
            {[...CASE_FLOW, "CANCELLED" as const].map((s) => (
              <option key={s} value={s}>
                {t(`cs.${s}`)}
              </option>
            ))}
          </Select>
          <Select value={hospital} onChange={(e) => setHospital(e.target.value)}>
            <option value="">{t("a.cases.allHospitals")}</option>
            {d.hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {name(h, lang)}
              </option>
            ))}
          </Select>
          <Select value={rep} onChange={(e) => setRep(e.target.value)}>
            <option value="">{t("a.cases.allReps")}</option>
            {reps.map((u) => (
              <option key={u.id} value={u.id}>
                {name(u, lang)}
              </option>
            ))}
          </Select>
          {filtered ? (
            <Button
              variant="ghost"
              onClick={() => {
                setQ("");
                setStatus("");
                setHospital("");
                setRep("");
              }}
            >
              <X className="h-4 w-4" /> {t("a.clear")}
            </Button>
          ) : (
            <span className="hidden lg:block" />
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
          <span>{t("a.showing", { n: rows.length, total: d.cases.length })}</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<FolderKanban className="h-6 w-6" />} title={t("g.noResults")} desc={t("a.cases.emptyDesc")} />
        ) : (
          <TableWrap maxH="calc(100vh - 290px)">
            <thead>
              <tr>
                <Th>{t("a.cases.no")}</Th>
                <Th>{t("g.date")}</Th>
                <Th>{t("g.hospital")}</Th>
                <Th>{t("a.cases.doctorProc")}</Th>
                <Th>{t("g.rep")}</Th>
                <Th right>{t("g.items")}</Th>
                <Th right>{t("a.cases.value")}</Th>
                <Th>{t("g.status")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const h = hosp(c.hospitalId);
                const u = d.users.find((x) => x.id === c.repId);
                const doc = d.doctors.find((x) => x.id === c.doctorId);
                const proc = d.procedures.find((p) => p.id === c.procedure);
                return (
                  <tr key={c.id} className={`${rowCls} cursor-pointer`} onClick={() => router.push(`/admin/cases/${c.id}`)}>
                    <Td>
                      <Link href={`/admin/cases/${c.id}`} className="font-semibold text-brand-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {c.no}
                      </Link>
                      {c.patientName && <p className="max-w-[160px] truncate text-xs text-slate-500">{c.patientName}</p>}
                    </Td>
                    <Td className="whitespace-nowrap">{date(c.caseDate)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {h && <HospitalArt palette={h.palette} className="h-7 w-9 shrink-0 rounded-md" />}
                        <span className="max-w-[180px] truncate">{name(h, lang)}</span>
                      </div>
                    </Td>
                    <Td>
                      <p className="max-w-[200px] truncate">{name(doc, lang)}</p>
                      <p className="max-w-[200px] truncate text-xs text-slate-400">{proc ? name(proc, lang) : c.procedure ?? "-"}</p>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar user={u} size={24} />
                        <span>{name(u, lang)}</span>
                      </div>
                    </Td>
                    <Td right>{caseUsage(d, c.id).reduce((a, x) => a + x.qty, 0)}</Td>
                    <Td right className="font-medium">{money(caseValue(d, c.id), 0)}</Td>
                    <Td>
                      <StatusChip kind="case" status={c.status} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
