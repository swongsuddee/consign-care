"use client";

import { Building2, LayoutDashboard, LogOut, Presentation, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangToggle } from "@/components/LangToggle";
import { useMe, useMyHospitals } from "@/components/mobile/bits";
import { MScreen } from "@/components/mobile/MScreen";
import { Avatar, PersonaSwitcher } from "@/components/PersonaSwitcher";
import { toast } from "@/components/toast";
import { Button, Modal } from "@/components/ui";
import { useT } from "@/i18n";
import { name } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const me = useMe();
  const hospitals = useMyHospitals();
  const reset = useStore((s) => s.reset);
  const setSignedIn = useStore((s) => s.setMobileSignedIn);
  const [confirm, setConfirm] = useState(false);

  return (
    <MScreen title={t("g.settings")} back="/m/home">
      <div className="space-y-4 p-4">
        <div className="flex flex-col items-center rounded-2xl bg-white p-5 text-center shadow-card">
          <Avatar user={me} size={64} />
          <p className="mt-2 text-lg font-semibold text-slate-800">{name(me, lang)}</p>
          <p className="text-xs text-slate-500">{t(`role.${me.role}`)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {me.email} · {me.phone}
          </p>
        </div>

        <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-card">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-slate-700">{t("g.language")}</span>
            <LangToggle />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-slate-700">{t("g.switchPersona")}</span>
            <PersonaSwitcher scope="mobile" navigate={false} />
          </div>
          <div className="px-4 py-3">
            <p className="mb-2 text-sm font-medium text-slate-700">{t("m.settings.assigned")}</p>
            <div className="flex flex-wrap gap-1.5">
              {hospitals.map((h) => (
                <span key={h.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  <Building2 className="h-3 w-3" /> {name(h, lang)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Link href="/admin">
            <Button variant="navy" className="w-full">
              <LayoutDashboard className="h-4 w-4" /> {t("m.p.openAdmin")}
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              <Presentation className="h-4 w-4" /> {t("g.presentation")}
            </Button>
          </Link>
          <Button variant="outline" className="w-full text-amber-700" onClick={() => setConfirm(true)}>
            <RotateCcw className="h-4 w-4" /> {t("g.resetDemo")}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-rose-600"
            onClick={() => {
              setSignedIn(false);
              router.push("/m");
            }}
          >
            <LogOut className="h-4 w-4" /> {t("m.settings.signOut")}
          </Button>
        </div>
        <p className="text-center text-[11px] text-slate-400">{t("g.mockNote")}</p>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t("g.resetDemo")}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {t("g.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                reset();
                setConfirm(false);
                toast.success(t("g.resetDone"));
              }}
            >
              {t("g.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{t("g.resetDemoDesc")}</p>
      </Modal>
    </MScreen>
  );
}
