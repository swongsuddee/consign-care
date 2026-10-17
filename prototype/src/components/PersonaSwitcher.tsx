"use client";

import { ChevronDown, Check, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { useStore } from "@/lib/store";
import { name } from "@/lib/selectors";
import type { User } from "@/lib/types";
import { cx } from "./ui";

export function Avatar({ user, size = 32, className }: { user?: User; size?: number; className?: string }) {
  const colors = ["#2563eb", "#0d9488", "#7c3aed", "#ea580c", "#db2777", "#0891b2", "#65a30d", "#475569"];
  const i = user ? user.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length : 0;
  return (
    <span
      className={cx("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-white", className)}
      style={{ width: size, height: size, background: colors[i], fontSize: size * 0.4 }}
    >
      {user?.name.charAt(0) ?? "?"}
    </span>
  );
}

/** Where each persona lands */
export function homeFor(u: User) {
  switch (u.role) {
    case "SALES_REP":
      return "/m/home";
    case "MANAGER":
      return "/admin/approvals";
    case "WAREHOUSE":
      return "/admin/requisitions";
    case "PURCHASING":
      return "/admin/purchase-requests";
    case "ACCOUNTING":
      return "/admin/billing";
    case "ADMIN":
      return "/admin/master";
    default:
      return "/admin";
  }
}

/** Dropdown to jump between demo personas. `scope` limits which users are listed. */
export function PersonaSwitcher({
  scope = "all",
  dark,
  navigate = true,
  className,
}: {
  scope?: "all" | "mobile" | "admin";
  dark?: boolean;
  navigate?: boolean;
  className?: string;
}) {
  const { t, lang } = useT();
  const router = useRouter();
  const users = useStore((s) => s.data.users);
  const mobileId = useStore((s) => s.mobileUserId);
  const adminId = useStore((s) => s.adminUserId);
  const setMobile = useStore((s) => s.setMobileUser);
  const setAdmin = useStore((s) => s.setAdminUser);
  const setSignedIn = useStore((s) => s.setMobileSignedIn);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const list = users.filter((u) => (scope === "mobile" ? u.role === "SALES_REP" : scope === "admin" ? u.role !== "SALES_REP" : true));
  const currentId = scope === "mobile" ? mobileId : adminId;
  const current = users.find((u) => u.id === currentId);

  const pick = (u: User) => {
    setOpen(false);
    if (u.role === "SALES_REP") {
      setMobile(u.id);
      setSignedIn(true);
    } else setAdmin(u.id);
    if (navigate) router.push(homeFor(u));
  };

  return (
    <div ref={ref} className={cx("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-left text-sm transition",
          dark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
        )}
      >
        {scope === "all" ? (
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-brand-600 text-white">
            <Users className="h-3.5 w-3.5" />
          </span>
        ) : (
          <Avatar user={current} size={26} />
        )}
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[140px] truncate text-xs font-semibold leading-tight">
            {scope === "all" ? t("g.switchPersona") : name(current, lang)}
          </span>
          {scope !== "all" && current && <span className={cx("block max-w-[140px] truncate text-[10px] leading-tight", dark ? "text-white/70" : "text-slate-500")}>{t(`role.${current.role}`)}</span>}
        </span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-2xl animate-slide-down">
          <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("g.switchPersona")}</p>
          {list.map((u) => {
            const active = u.id === (u.role === "SALES_REP" ? mobileId : adminId);
            return (
              <button key={u.id} onClick={() => pick(u)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
                <Avatar user={u} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{name(u, lang)}</span>
                  <span className="block truncate text-xs text-slate-500">{t(`role.${u.role}`)}</span>
                </span>
                {active && <Check className="h-4 w-4 text-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
