"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Database, Menu, MonitorPlay, Smartphone, X } from "lucide-react";
import { Logo } from "@/components/art";
import { LangToggle } from "@/components/LangToggle";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { Hydrated } from "@/components/Providers";
import { PageLoader, cx } from "@/components/ui";
import { useT } from "@/i18n";
import { pendingApprovals, WAITING_BILLING } from "@/lib/selectors";
import { useData } from "@/lib/store";
import { NAV, activeNav } from "@/components/admin/nav";
import { GlobalSearch } from "@/components/admin/GlobalSearch";
import { NotificationBell } from "@/components/admin/NotificationBell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const path = usePathname() ?? "/admin";
  const { t } = useT();

  useEffect(() => setDrawer(false), [path]);

  const current = activeNav(path);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      {/* sidebar – fixed on lg, drawer below */}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-800 text-white transition-transform duration-200 lg:translate-x-0",
          drawer ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Link href="/admin">
            <Logo light />
          </Link>
          <button className="rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setDrawer(false)} aria-label="close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="px-5 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/80">{t("a.backOffice")}</p>
        <Hydrated>
          <SideNav path={path} />
        </Hydrated>
        <div className="shrink-0 border-t border-white/10 px-5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Database className="h-3 w-3" /> {t("a.demoHint")}
          </p>
        </div>
      </aside>
      {drawer && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />}

      <div className="lg:pl-64">
        {/* top bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setDrawer(true)} aria-label="menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 xl:block">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t("a.backOffice")}</p>
              <p className="truncate text-sm font-semibold text-navy-800">{current ? t(current.key) : ""}</p>
            </div>
            <Hydrated>
              <GlobalSearch className="min-w-0 flex-1 xl:ml-6 xl:max-w-md" />
            </Hydrated>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/"
                className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 md:inline-flex"
                title={t("g.presentation")}
              >
                <MonitorPlay className="h-4 w-4" /> <span className="hidden 2xl:inline">{t("g.presentation")}</span>
              </Link>
              <Link
                href="/m/home"
                target="_blank"
                className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 md:inline-flex"
                title={t("a.openMobile")}
              >
                <Smartphone className="h-4 w-4" /> <span className="hidden 2xl:inline">{t("a.openMobile")}</span>
              </Link>
              <LangToggle />
              <Hydrated>
                <NotificationBell />
                <PersonaSwitcher scope="admin" />
              </Hydrated>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8">
          <Hydrated fallback={<PageLoader />}>{children}</Hydrated>
        </main>
      </div>
    </div>
  );
}

function SideNav({ path }: { path: string }) {
  const { t } = useT();
  const d = useData();
  const active = activeNav(path);
  const pa = pendingApprovals(d);
  const badges = {
    approvals: pa.requisitions.length + pa.prs.length,
    pos: d.incomingPos.length,
    billing: d.cases.filter((c) => WAITING_BILLING.includes(c.status)).length,
  };
  return (
    <nav className="thin-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">{t(g.group)}</p>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const on = active?.href === it.href;
              const Icon = it.icon;
              const n = it.badge ? badges[it.badge] : 0;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={cx(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                      on ? "bg-white/[0.12] text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {on && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-sky-300" />}
                    <Icon className={cx("h-[18px] w-[18px] shrink-0", on ? "text-sky-300" : "text-white/60 group-hover:text-white")} />
                    <span className="flex-1 truncate">{t(it.key)}</span>
                    {n > 0 && (
                      <span
                        className={cx(
                          "min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold leading-5",
                          it.badge === "approvals" ? "bg-amber-400 text-navy-900" : "bg-white/15 text-white",
                        )}
                      >
                        {n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
