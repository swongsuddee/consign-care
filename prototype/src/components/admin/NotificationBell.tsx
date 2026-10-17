"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { name } from "@/lib/selectors";
import { useData, useOp, useStore } from "@/lib/store";

/** Back-office notifications: broadcast ("*") + those addressed to the current admin persona */
export function NotificationBell() {
  const { t, lang, rel } = useFmt();
  const d = useData();
  const run = useOp();
  const router = useRouter();
  const me = useStore((s) => s.adminUserId);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const list = d.notifications.filter((n) => n.userId === "*" || n.userId === me).slice(0, 30);
  const unread = list.filter((n) => !n.read).length;

  const openOne = (id: string, href: string) => {
    useStore.getState().mutate((dd) => {
      const n = dd.notifications.find((x) => x.id === id);
      if (n) n.read = true;
    });
    setOpen(false);
    router.push(href.replace(/^\/m\/cases\//, "/admin/cases/"));
  };

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        aria-label={t("g.notifications")}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-slide-down sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">
              {t("g.notifications")}
              {unread > 0 && <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600">{unread}</span>}
            </p>
            <button
              onClick={() => run(ops.markAllRead)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-40"
              disabled={unread === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" /> {t("g.markAllRead")}
            </button>
          </div>
          <div className="thin-scrollbar max-h-[60vh] overflow-y-auto">
            {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">{t("g.noData")}</p>}
            {list.map((n) => (
              <button
                key={n.id}
                onClick={() => openOne(n.id, n.href)}
                className={cx("flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50", !n.read && "bg-brand-50/40")}
              >
                <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-slate-200" : "bg-brand-600")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-800">{t(`act.${n.action}`, { ref: n.ref })}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {n.hospitalId ? `${name(d.hospitals.find((h) => h.id === n.hospitalId), lang)} · ` : ""}
                    {rel(n.at)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
