"use client";

import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangToggle } from "@/components/LangToggle";
import { toast } from "@/components/toast";
import { Button, Input } from "@/components/ui";
import { useT } from "@/i18n";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const { t } = useT();
  const router = useRouter();
  const users = useStore((s) => s.data.users);
  const mobileUserId = useStore((s) => s.mobileUserId);
  const setUser = useStore((s) => s.setMobileUser);
  const setSignedIn = useStore((s) => s.setMobileSignedIn);
  const current = users.find((u) => u.id === mobileUserId);
  const [email, setEmail] = useState(current?.email ?? "sinenart@consigncare.co.th");
  const [password, setPassword] = useState("demo1234");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"pw" | "sso" | null>(null);

  const signIn = (via: "pw" | "sso") => {
    setBusy(via);
    setTimeout(() => {
      const u = users.find((x) => x.role === "SALES_REP" && x.email.toLowerCase() === email.trim().toLowerCase());
      if (u) setUser(u.id);
      setSignedIn(true);
      const name = (u ?? current)?.name ?? "";
      toast.success(t("m.login.welcome", { name }), via === "sso" ? t("m.login.ssoDone") : undefined);
      router.push("/m/home");
    }, via === "sso" ? 900 : 600);
  };

  return (
    <div className="thin-scrollbar flex flex-1 flex-col overflow-y-auto bg-white px-7 pb-6 pt-4">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <div className="mt-6 flex flex-col items-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30">
          <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
            <path d="M8 22c4-1 6-6 6-10M32 22c-4-1-6-6-6-10M14 12c2 3 10 3 12 0M12 22c0 6 4 10 8 10s8-4 8-10" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="mt-3 text-lg font-bold leading-tight text-navy-800">
          Consignment
          <br />
          Case Tracking
        </h1>
        <p className="mt-5 text-xl font-semibold text-slate-800">{t("m.login.welcomeBack")}</p>
        <p className="text-sm text-slate-500">{t("m.login.signInToContinue")}</p>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          signIn("pw");
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">{t("m.login.email")}</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" autoComplete="username" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">{t("m.login.password")}</span>
          <div className="relative">
            <Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-10" autoComplete="current-password" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="toggle password">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <Button type="submit" size="lg" className="w-full" loading={busy === "pw"} disabled={!!busy}>
          {t("m.login.signIn")}
        </Button>
        <button type="button" onClick={() => toast.info(t("m.login.forgotSent"))} className="block w-full text-center text-sm font-medium text-brand-600">
          {t("m.login.forgot")}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        {t("m.login.or")}
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <Button variant="secondary" size="lg" className="w-full" onClick={() => signIn("sso")} loading={busy === "sso"} disabled={!!busy}>
        {busy !== "sso" && <ShieldCheck className="h-5 w-5" />}
        {t("m.login.sso")}
      </Button>
      <p className="mt-2 text-center text-[11px] text-slate-400">Google Workspace · Microsoft Entra ID</p>

      <p className="mt-auto pt-8 text-center text-xs text-slate-400">Healthcare for a Better Tomorrow</p>
      <p className="mt-1 text-center text-[10px] text-slate-300">{t("m.login.demoHint")}</p>
    </div>
  );
}
