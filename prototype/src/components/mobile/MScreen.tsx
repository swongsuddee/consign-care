"use client";

import { ArrowLeft, Building2, ClipboardList, House, ScanLine, Stethoscope } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "@/i18n";
import { LangToggle } from "../LangToggle";
import { cx } from "../ui";

/**
 * Width of the screen's content. The app is a container (`@container/app` in the /m layout): on a phone the content is
 * the full width, on an iPad (768 px and up) a centred 720 px column, on a web page (1024 px and up) 960 px.
 */
export const COLUMN = "mx-auto w-full @3xl/app:max-w-[720px] @5xl/app:max-w-[960px]";

/** One mobile screen: navy header + scroll body + optional bottom tab bar */
export function MScreen({
  title,
  back,
  right,
  children,
  tabs = true,
  header,
  bodyClassName,
  footer,
}: {
  title?: ReactNode;
  back?: string | true;
  right?: ReactNode;
  children: ReactNode;
  tabs?: boolean;
  /** custom header content replacing the default title bar */
  header?: ReactNode;
  bodyClassName?: string;
  /** sticky footer above the tab bar (e.g. primary action) */
  footer?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50">
      <div className="shrink-0 bg-gradient-to-b from-navy-800 to-navy-700 text-white">
        <div className={COLUMN}>
        {header ?? (
          <div className="flex h-14 items-center gap-2 px-3">
            {back ? (
              <button
                onClick={() => (back === true ? router.back() : router.push(back))}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"
                aria-label="back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <span className="w-2" />
            )}
            <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold">{title}</h1>
            <div className="flex min-w-[36px] items-center justify-end gap-1.5">
              {right}
              <LangToggle dark />
            </div>
          </div>
        )}
        </div>
      </div>
      <div className={cx("thin-scrollbar min-h-0 flex-1 overflow-y-auto", bodyClassName)}>
        <div className={cx(COLUMN, "min-h-full")}>{children}</div>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
          <div className={COLUMN}>{footer}</div>
        </div>
      )}
      {tabs && <TabBar />}
    </div>
  );
}

const TABS = [
  { href: "/m/home", key: "m.tab.home", icon: House },
  { href: "/m/accounts", key: "m.tab.accounts", icon: Building2 },
  { href: "/m/scan", key: "m.tab.scan", icon: ScanLine, center: true },
  { href: "/m/usage", key: "m.tab.usage", icon: Stethoscope },
  { href: "/m/cases", key: "m.tab.cases", icon: ClipboardList },
];

export function TabBar() {
  const { t } = useT();
  const path = usePathname() ?? "";
  return (
    <nav className="relative shrink-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] desk:group-data-[view=ipad]/app:pb-3 desk:group-data-[view=mobile]/app:pb-3">
      <div className={cx(COLUMN, "grid grid-cols-5 @3xl/app:max-w-[560px]")}>
        {TABS.map((tab) => {
          const active = path.startsWith(tab.href);
          const Icon = tab.icon;
          if (tab.center)
            return (
              <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center pb-1.5">
                <span
                  className={cx(
                    "-mt-5 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg shadow-brand-600/40 ring-4 ring-white transition",
                    active ? "bg-navy-800" : "bg-brand-600",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className={cx("mt-0.5 text-[10px] font-medium", active ? "text-brand-700" : "text-slate-500")}>{t(tab.key)}</span>
              </Link>
            );
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 py-2">
              <Icon className={cx("h-5 w-5", active ? "text-brand-600" : "text-slate-400")} />
              <span className={cx("text-[10px] font-medium", active ? "text-brand-700" : "text-slate-500")}>{t(tab.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Small section title row */
export function MSection({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("px-4", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
