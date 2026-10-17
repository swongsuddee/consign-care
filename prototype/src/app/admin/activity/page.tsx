"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, Search, X } from "lucide-react";
import { HospitalArt } from "@/components/art";
import { Avatar } from "@/components/PersonaSwitcher";
import { Badge, Button, Card, EmptyState, Select, type Tone } from "@/components/ui";
import { PageHeader, SearchBox } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import { name } from "@/lib/selectors";
import { useData } from "@/lib/store";
import type { ActivityLog } from "@/lib/types";

const ENTITY_TONE: Record<string, Tone> = {
  CASE: "blue",
  QUOTATION: "indigo",
  PO: "teal",
  REQUISITION: "violet",
  PR: "green",
  INVOICE: "sky",
};

function hrefFor(a: ActivityLog) {
  switch (a.entity) {
    case "CASE":
      return `/admin/cases/${a.entityId}`;
    case "QUOTATION":
      return `/admin/quotations/${a.entityId}`;
    case "REQUISITION":
      return `/admin/requisitions/${a.entityId}`;
    case "PR":
      return `/admin/purchase-requests/${a.entityId}`;
    case "PO":
      return `/admin/pos`;
    case "INVOICE":
      return `/admin/billing?tab=invoices`;
    default:
      return "/admin/master";
  }
}

export default function ActivityPage() {
  const { t, lang, rel, dateTime } = useFmt();
  const d = useData();
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const [hospital, setHospital] = useState("");
  const [q, setQ] = useState("");

  const entities = Array.from(new Set(d.activity.map((a) => a.entity)));
  const k = q.trim().toLowerCase();
  const rows = d.activity.filter(
    (a) =>
      (!entity || a.entity === entity) &&
      (!actor || a.actorId === actor) &&
      (!hospital || a.hospitalId === hospital) &&
      (!k || t(`act.${a.action}`, { ref: a.ref }).toLowerCase().includes(k)),
  );
  const filtered = entity || actor || hospital || q;

  const entityLabel = (e: string) => (ENTITY_TONE[e] ? t(`a.ent.${e}`) : t("a.ent.MASTER"));

  return (
    <div>
      <PageHeader title={t("a.act.title")} subtitle={t("a.act.subtitle", { n: d.activity.length })} />
      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px_220px_auto]">
          <SearchBox value={q} onChange={setQ} placeholder={t("g.search")} icon={<Search className="h-4 w-4" />} />
          <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="">{t("a.act.allTypes")}</option>
            {entities.map((e) => (
              <option key={e} value={e}>
                {entityLabel(e)}
                {ENTITY_TONE[e] ? "" : ` · ${e.toLowerCase()}`}
              </option>
            ))}
          </Select>
          <Select value={actor} onChange={(e) => setActor(e.target.value)}>
            <option value="">{t("a.act.allActors")}</option>
            {d.users.map((u) => (
              <option key={u.id} value={u.id}>
                {name(u, lang)}
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
          {filtered ? (
            <Button
              variant="ghost"
              onClick={() => {
                setEntity("");
                setActor("");
                setHospital("");
                setQ("");
              }}
            >
              <X className="h-4 w-4" /> {t("a.clear")}
            </Button>
          ) : (
            <span className="hidden lg:block" />
          )}
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<Activity className="h-6 w-6" />} title={t("g.noResults")} />
        ) : (
          <ul className="divide-y divide-slate-50">
            {rows.map((a) => {
              const u = d.users.find((x) => x.id === a.actorId);
              const h = d.hospitals.find((x) => x.id === a.hospitalId);
              const href = hrefFor(a);
              const text = t(`act.${a.action}`, { ref: a.ref });
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60">
                  <Avatar user={u} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">
                      {href ? (
                        <Link href={href} className="font-medium hover:text-brand-700">
                          {text}
                        </Link>
                      ) : (
                        <span className="font-medium">{text}</span>
                      )}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span>{name(u, lang)}</span>
                      {u && <span className="text-slate-300">·</span>}
                      {u && <span>{t(`role.${u.role}`)}</span>}
                      <span className="text-slate-300">·</span>
                      <span>{dateTime(a.at)}</span>
                    </p>
                  </div>
                  {h && (
                    <span className="hidden items-center gap-2 text-xs text-slate-600 md:flex">
                      <HospitalArt palette={h.palette} className="h-6 w-8 rounded" /> {name(h, lang)}
                    </span>
                  )}
                  <Badge tone={ENTITY_TONE[a.entity] ?? "gray"} className="hidden sm:inline-flex">
                    {entityLabel(a.entity)}
                  </Badge>
                  <span className="w-24 shrink-0 text-right text-xs text-slate-400">{rel(a.at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
