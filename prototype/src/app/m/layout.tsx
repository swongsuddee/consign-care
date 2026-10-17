"use client";

import { ExternalLink, LayoutDashboard, Presentation, RotateCcw, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/art";
import { LangToggle } from "@/components/LangToggle";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { Hydrated } from "@/components/Providers";
import { toast } from "@/components/toast";
import { Button, Modal, PageLoader, cx } from "@/components/ui";
import { useT } from "@/i18n";
import { useStore } from "@/lib/store";

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-50 md:flex md:items-center md:justify-center md:gap-10 md:bg-[radial-gradient(ellipse_at_top,#dbeafe,transparent_60%),linear-gradient(180deg,#eef3fb,#e2e8f0)] md:px-6 md:py-6">
      <PresenterPanel />
      {/* Phone frame on desktop, full screen on phones. transform makes fixed modals stay inside the frame. */}
      <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-slate-50 md:h-[844px] md:max-h-[calc(100dvh-48px)] md:w-[400px] md:shrink-0 md:rounded-[52px] md:border-[12px] md:border-slate-900 md:shadow-phone md:[transform:translateZ(0)]">
        <StatusBar />
        <Hydrated fallback={<PageLoader />}>{children}</Hydrated>
        <div className="pointer-events-none absolute bottom-1.5 left-1/2 hidden h-1 w-32 -translate-x-1/2 rounded-full bg-slate-900/80 md:block" />
      </div>
    </div>
  );
}

function StatusBar() {
  const path = usePathname();
  const light = path === "/m";
  return (
    <div className={cx("relative hidden h-9 shrink-0 items-center justify-between px-7 text-[13px] font-semibold md:flex", light ? "bg-white text-slate-900" : "bg-navy-800 text-white")}>
      <span>9:41</span>
      <span className="absolute left-1/2 top-1.5 h-6 w-28 -translate-x-1/2 rounded-full bg-slate-900" />
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 18 12" className="h-3 w-4 fill-current"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg viewBox="0 0 26 12" className="h-3 w-6"><rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.5" /><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" /><rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.5" /></svg>
      </span>
    </div>
  );
}

const QUICK = [
  { href: "/m", key: "m.p.login" },
  { href: "/m/home", key: "m.p.dashboard" },
  { href: "/m/accounts", key: "m.p.accounts" },
  { href: "/m/cases/new", key: "m.p.newCase" },
  { href: "/m/usage", key: "m.p.usage" },
  { href: "/m/scan", key: "m.p.scan" },
  { href: "/m/cases/case-C25001", key: "m.p.case" },
  { href: "/m/notifications", key: "m.p.notifications" },
];

/** Desktop-only side panel for the presenter */
function PresenterPanel() {
  const { t } = useT();
  const path = usePathname();
  const reset = useStore((s) => s.reset);
  const [confirm, setConfirm] = useState(false);
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <Logo />
      <p className="mt-2 text-sm text-slate-500">{t("m.p.subtitle")}</p>
      <div className="mt-5 rounded-2xl bg-white/80 p-4 shadow-card ring-1 ring-white backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Smartphone className="h-3.5 w-3.5" /> {t("m.p.title")}
          </p>
          <LangToggle />
        </div>
        <Hydrated>
          <PersonaSwitcher scope="mobile" className="mt-3" />
        </Hydrated>
        <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("m.p.jump")}</p>
        <div className="grid gap-0.5">
          {QUICK.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className={cx("rounded-lg px-2.5 py-1.5 text-sm transition", path === q.href ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100")}
            >
              {t(q.key)}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <Link href="/admin" target="_blank">
          <Button variant="navy" className="w-full justify-start">
            <LayoutDashboard className="h-4 w-4" /> {t("m.p.openAdmin")} <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="w-full justify-start">
            <Presentation className="h-4 w-4" /> {t("g.presentation")}
          </Button>
        </Link>
        <Button variant="ghost" className="w-full justify-start text-slate-500" onClick={() => setConfirm(true)}>
          <RotateCcw className="h-4 w-4" /> {t("g.resetDemo")}
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">{t("g.mockNote")}</p>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t("g.resetDemo")}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>{t("g.cancel")}</Button>
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
    </aside>
  );
}
