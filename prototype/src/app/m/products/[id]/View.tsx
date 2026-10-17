"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProductArt } from "@/components/art";
import { MScreen } from "@/components/mobile/MScreen";
import { Avatar } from "@/components/PersonaSwitcher";
import { Badge, EmptyState, PageLoader } from "@/components/ui";
import { useFmt } from "@/lib/format";
import { name, usageRows } from "@/lib/selectors";
import { useData } from "@/lib/store";
import { useRouteParam } from "@/lib/route-param";

export default function ProductHistoryPage({ id: idSeg }: { id: string }) {
  const id = useRouteParam("id", idSeg);
  return (
    <Suspense fallback={<PageLoader />}>
      <ProductHistory id={id} />
    </Suspense>
  );
}

function ProductHistory({ id }: { id: string }) {
  const { t, lang, date } = useFmt();
  const sp = useSearchParams();
  const d = useData();
  const p = d.products.find((x) => x.id === id);
  if (!p)
    return (
      <MScreen title={t("m.ph.title")} back>
        <EmptyState title={t("g.noResults")} />
      </MScreen>
    );
  const lots = d.lots.filter((l) => l.productId === p.id).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const lot = d.lots.find((l) => l.id === sp.get("lot")) ?? lots[0];
  const rows = usageRows(d).filter((r) => r.product.id === p.id);

  return (
    <MScreen title={t("m.ph.title")} back>
      <div className="space-y-4 p-4">
        <div className="flex gap-4 rounded-2xl bg-white p-4 shadow-card">
          <ProductArt category={p.category} className="h-20 w-20" />
          <div className="min-w-0 space-y-1 text-xs text-slate-600">
            <p className="text-base font-semibold text-slate-800">{p.name}</p>
            <p>
              <Badge tone="gray" className="mr-1">REF</Badge>
              {p.ref}
            </p>
            {lot && (
              <>
                <p>
                  <Badge tone="gray" className="mr-1">LOT</Badge>
                  {lot.lotNo}
                </p>
                <p>
                  <Badge tone="gray" className="mr-1">EXP</Badge>
                  {date(lot.expiryDate)}
                </p>
              </>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            {t("m.ph.history")} ({rows.length})
          </h3>
          {rows.length === 0 && <EmptyState title={t("g.noData")} />}
          <ol className="space-y-2">
            {rows.map(({ u, c, lot: l }) => {
              const rep = d.users.find((x) => x.id === c.repId);
              return (
                <li key={u.id}>
                  <Link href={`/m/cases/${c.id}`} className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-card">
                    <Avatar user={rep} size={32} />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="text-[11px] text-slate-400">{date(c.caseDate)}</p>
                      <p className="truncate text-sm font-semibold text-slate-800">{name(d.hospitals.find((h) => h.id === c.hospitalId), lang)}</p>
                      <p className="text-slate-500">
                        {t("m.ph.usedBy")} {name(rep, lang)}
                      </p>
                      <p className="text-slate-500">
                        {t("g.case")} <b className="text-slate-700">{c.no}</b>
                        {l && <span className="text-slate-400"> · LOT {l.lotNo}</span>}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">×{u.qty}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </MScreen>
  );
}
