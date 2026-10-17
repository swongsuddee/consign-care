"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HospitalBadge, useMyHospitals } from "@/components/mobile/bits";
import { MScreen } from "@/components/mobile/MScreen";
import { EmptyState, Input } from "@/components/ui";
import { useT } from "@/i18n";
import { hospitalStats, name } from "@/lib/selectors";
import { useData } from "@/lib/store";

export default function AccountsPage() {
  const { t, lang } = useT();
  const d = useData();
  const mine = useMyHospitals();
  const [q, setQ] = useState("");
  const list = mine.filter((h) => `${h.name} ${h.nameTh} ${h.code}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <MScreen title={t("m.accounts.title")} back="/m/home">
      <div className="grid gap-3 p-4 @3xl/app:grid-cols-2">
        <div className="relative @3xl/app:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("m.accounts.search")} className="h-11 pl-9" />
        </div>
        {list.length === 0 && <EmptyState title={t("g.noResults")} className="@3xl/app:col-span-2" />}
        {list.map((h) => {
          const s = hospitalStats(d, h.id);
          const rows = [
            [t("m.accounts.openCases"), s.open],
            [t("m.home.usageMonth"), s.usageMonth],
            [t("m.home.waitingPo"), s.waitingPo],
            [t("m.home.waitingBilling"), s.waitingBilling],
          ] as const;
          return (
            <Link key={h.id} href={`/m/accounts/${h.id}`} className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition active:scale-[0.99]">
              <div className="flex items-center gap-3">
                <HospitalBadge h={h} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{name(h, lang)}</p>
                  <p className="text-xs text-slate-400">{h.code}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-slate-100 pt-3">
                {rows.map(([label, v]) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-semibold tabular-nums text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          );
        })}
      </div>
    </MScreen>
  );
}
