"use client";

import { ExternalLink, LayoutDashboard, Monitor, Presentation, RotateCcw, Smartphone, Tablet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Logo } from "@/components/art";
import { LangToggle } from "@/components/LangToggle";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { Hydrated } from "@/components/Providers";
import { toast } from "@/components/toast";
import { Button, Modal, PageLoader, cx } from "@/components/ui";
import { useT } from "@/i18n";
import { useStore } from "@/lib/store";

export type View = "mobile" | "ipad" | "web";
const VIEW_KEY = "consigncare:view";
/** Outer size of the device previews, bezel included. */
const IPAD = { w: 844, h: 1204 };
const PANEL = 288 + 32; // presenter panel and the gap after it

/**
 * The rep app in three views. A phone or tablet shows it full screen. A desktop browser (the `desk` screen) shows it
 * next to the presenter panel, as a phone, an iPad (scaled to fit the window) or a web page filling the rest of the window.
 * Screens lay themselves out by the app's own width (container queries on `@container/app`), so the iPad preview on a
 * laptop looks like a real iPad.
 */
export default function MobileLayout({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("mobile");
  const [scale, setScale] = useState(1);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "mobile" || v === "ipad" || v === "web") setView(v);
    } catch {
      /* storage blocked: stay on the phone */
    }
  }, []);
  const pick = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 48) / IPAD.h, (window.innerWidth - 48 - PANEL) / IPAD.w));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const app = (
    <div data-view={view} className="group/app @container/app relative flex h-full w-full flex-col overflow-hidden bg-slate-50">
      <StatusBar />
      <Hydrated fallback={<PageLoader />}>{children}</Hydrated>
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 hidden h-1 w-32 -translate-x-1/2 rounded-full bg-slate-900/80 desk:group-data-[view=ipad]/app:block desk:group-data-[view=mobile]/app:block" />
    </div>
  );

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50 desk:flex desk:items-center desk:justify-center desk:gap-8 desk:bg-[radial-gradient(ellipse_at_top,#dbeafe,transparent_60%),linear-gradient(180deg,#eef3fb,#e2e8f0)] desk:p-6">
      <PresenterPanel view={view} onView={pick} />
      {/* transform keeps the app's fixed sheets and modals inside the device */}
      {view === "ipad" ? (
        <div className="h-full desk:relative desk:shrink-0 desk:[height:var(--h)] desk:[width:var(--w)]" style={{ "--w": `${IPAD.w * scale}px`, "--h": `${IPAD.h * scale}px` } as CSSProperties}>
          <div
            className="h-full desk:absolute desk:left-0 desk:top-0 desk:overflow-hidden desk:rounded-[44px] desk:border-[12px] desk:border-slate-900 desk:shadow-phone desk:[height:var(--fh)] desk:[transform:scale(var(--s))] desk:[width:var(--fw)] desk:origin-top-left"
            style={{ "--fw": `${IPAD.w}px`, "--fh": `${IPAD.h}px`, "--s": scale } as CSSProperties}
          >
            {app}
          </div>
        </div>
      ) : (
        <div
          className={cx(
            "h-full desk:overflow-hidden desk:[transform:translateZ(0)]",
            view === "mobile"
              ? "desk:h-[min(844px,calc(100dvh-48px))] desk:w-[400px] desk:shrink-0 desk:rounded-[52px] desk:border-[12px] desk:border-slate-900 desk:shadow-phone"
              : "desk:min-w-0 desk:flex-1 desk:rounded-2xl desk:shadow-phone desk:ring-1 desk:ring-slate-200",
          )}
        >
          {app}
        </div>
      )}
    </div>
  );
}

/** Phone / iPad status bar, only in the desktop device previews */
function StatusBar() {
  const path = usePathname();
  const light = path === "/m";
  return (
    <div
      className={cx(
        "relative hidden h-9 shrink-0 items-center justify-between px-7 text-[13px] font-semibold desk:group-data-[view=ipad]/app:flex desk:group-data-[view=mobile]/app:flex",
        light ? "bg-white text-slate-900" : "bg-navy-800 text-white",
      )}
    >
      <span>9:41</span>
      <span className="absolute left-1/2 top-1.5 h-6 w-28 -translate-x-1/2 rounded-full bg-slate-900 group-data-[view=ipad]/app:hidden" />
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 18 12" className="h-3 w-4 fill-current"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg viewBox="0 0 26 12" className="h-3 w-6"><rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.5" /><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" /><rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.5" /></svg>
      </span>
    </div>
  );
}

const VIEWS: { id: View; key: string; icon: typeof Smartphone }[] = [
  { id: "web", key: "m.p.vWeb", icon: Monitor },
  { id: "ipad", key: "m.p.vIpad", icon: Tablet },
  { id: "mobile", key: "m.p.vMobile", icon: Smartphone },
];

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
function PresenterPanel({ view, onView }: { view: View; onView: (v: View) => void }) {
  const { t } = useT();
  const path = usePathname();
  const reset = useStore((s) => s.reset);
  const [confirm, setConfirm] = useState(false);
  return (
    <aside className="thin-scrollbar hidden max-h-full w-72 shrink-0 overflow-y-auto desk:block">
      <Logo />
      <p className="mt-1.5 text-sm text-slate-500">{t("m.p.subtitle")}</p>
      <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("m.p.view")}</p>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/70 p-1 ring-1 ring-white" role="radiogroup" aria-label={t("m.p.view")}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="radio"
            aria-checked={view === v.id}
            onClick={() => onView(v.id)}
            className={cx("flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs font-medium transition", view === v.id ? "bg-navy-800 text-white shadow" : "text-slate-500 hover:bg-white")}
          >
            <v.icon className="h-4 w-4" /> {t(v.key)}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-white/80 p-4 shadow-card ring-1 ring-white backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Smartphone className="h-3.5 w-3.5" /> {t("m.p.title")}
          </p>
          <LangToggle />
        </div>
        <Hydrated>
          <PersonaSwitcher scope="mobile" className="mt-3" />
        </Hydrated>
        <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("m.p.jump")}</p>
        <div className="grid gap-0.5">
          {QUICK.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className={cx("rounded-lg px-2.5 py-1 text-sm transition", path === q.href ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100")}
            >
              {t(q.key)}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-2">
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
