"use client";

import Link from "next/link";
import { useState } from "react";
import { Cpu, Database, Globe2, Info, Mail, MessageCircle, MonitorPlay, RotateCcw, ShieldCheck, Smartphone, UserCircle2 } from "lucide-react";
import { LangToggle } from "@/components/LangToggle";
import { Avatar, PersonaSwitcher } from "@/components/PersonaSwitcher";
import { toast } from "@/components/toast";
import { Button, Card, CardHeader } from "@/components/ui";
import { ConfirmModal, KV, PageHeader } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import { name } from "@/lib/selectors";
import { useCurrentUser, useData, useStore } from "@/lib/store";

export default function SettingsPage() {
  const { t, lang, num } = useFmt();
  const d = useData();
  const me = useCurrentUser();
  const [confirm, setConfirm] = useState(false);

  const counts = [
    [t("a.nav.cases"), d.cases.length],
    [t("a.nav.quotations"), d.quotations.length],
    [t("a.nav.requisitions"), d.requisitions.length],
    [t("a.nav.prs"), d.purchaseRequests.length],
    [t("a.bill.invoices"), d.invoices.length],
    [t("a.act.title"), d.activity.length],
  ] as const;

  return (
    <div>
      <PageHeader title={t("a.set.title")} subtitle={t("a.set.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<Globe2 className="h-5 w-5" />} title={t("g.language")} subtitle={t("a.set.langSub")} />
          <div className="flex items-center justify-between gap-3 p-5">
            <span className="text-sm text-slate-600">{lang === "th" ? "ภาษาไทย" : "English"}</span>
            <LangToggle className="scale-125" />
          </div>
        </Card>

        <Card>
          <CardHeader icon={<UserCircle2 className="h-5 w-5" />} title={t("a.set.persona")} subtitle={t("a.set.personaSub")} />
          <div className="flex flex-wrap items-center gap-4 p-5">
            <Avatar user={me} size={48} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800">{name(me, lang)}</p>
              <p className="text-sm text-slate-500">
                {t(`role.${me.role}`)} · {me.email}
              </p>
            </div>
            <PersonaSwitcher scope="admin" navigate={false} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Database className="h-5 w-5" />} title={t("a.set.data")} subtitle={t("g.mockNote")} />
          <div className="grid grid-cols-3 gap-4 p-5">
            {counts.map(([label, n]) => (
              <KV key={label} label={label}>
                <span className="text-lg font-bold text-navy-800">{num(n)}</span>
              </KV>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{t("g.resetDemoDesc")}</p>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              <RotateCcw className="h-4 w-4" /> {t("g.resetDemo")}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Info className="h-5 w-5" />} title={t("a.set.about")} />
          <div className="space-y-3 p-5 text-sm text-slate-600">
            <p>{t("a.set.aboutDesc")}</p>
            <ul className="space-y-2">
              {[
                [Database, t("a.set.ab1")],
                [Cpu, t("a.set.ab2")],
                [Mail, t("a.set.ab3")],
                [MessageCircle, t("a.set.ab4")],
                [ShieldCheck, t("a.set.ab5")],
              ].map(([Icon, label], i) => {
                const I = Icon as typeof Database;
                return (
                  <li key={i} className="flex items-start gap-2">
                    <I className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {label as string}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                <MonitorPlay className="h-3.5 w-3.5" /> {t("g.presentation")}
              </Link>
              <Link href="/m/home" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                <Smartphone className="h-3.5 w-3.5" /> {t("a.openMobile")}
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        danger
        title={t("g.resetDemo")}
        desc={t("g.resetDemoDesc")}
        confirmLabel={t("g.resetDemo")}
        onConfirm={() => {
          useStore.getState().reset();
          toast.success(t("g.resetDone"));
        }}
      />
    </div>
  );
}
