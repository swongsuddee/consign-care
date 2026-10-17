"use client";

import { useMemo } from "react";
import { useT } from "@/i18n";
import { demoNow } from "./ops";
import type { Lang } from "./types";

export function fmtMoney(n: number, lang: Lang, decimals = 2) {
  return new Intl.NumberFormat(lang === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function fmtNum(n: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "th" ? "th-TH" : "en-US").format(n);
}

/** yyyy-mm-dd or ISO -> "15 ต.ค. 2569" / "15 Oct 2026" */
export function fmtDate(s: string | undefined, lang: Lang, withTime = false) {
  if (!s) return "-";
  const d = s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
  if (isNaN(d.getTime())) return s;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit" });
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", opts).format(d);
}

export function useFmt() {
  const { t, lang } = useT();
  return useMemo(
    () => ({
      lang,
      t,
      money: (n: number, decimals = 2) => `฿${fmtMoney(n, lang, decimals)}`,
      num: (n: number) => fmtNum(n, lang),
      date: (s?: string) => fmtDate(s, lang),
      dateTime: (s?: string) => fmtDate(s, lang, true),
      unit: (u: string) => t(`unit.${u}`),
      rel: (iso: string) => {
        const diff = demoNow().getTime() - new Date(iso).getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return t("time.justNow");
        if (min < 60) return t("time.minAgo", { n: min });
        const h = Math.floor(min / 60);
        if (h < 24) return h === 1 ? t("time.hourAgo") : t("time.hoursAgo", { n: h });
        const dd = Math.floor(h / 24);
        return dd === 1 ? t("time.dayAgo") : t("time.daysAgo", { n: dd });
      },
    }),
    [t, lang],
  );
}

/** Thai baht text for formal documents, e.g. "หนึ่งร้อยบาทถ้วน" */
export function bahtText(amount: number): string {
  const nums = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const pos = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  const read = (n: string): string => {
    if (/^0*$/.test(n)) return "";
    if (n.length > 6) return read(n.slice(0, -6)) + "ล้าน" + read(n.slice(-6));
    let out = "";
    const len = n.length;
    for (let i = 0; i < len; i++) {
      const dgt = Number(n[i]);
      const p = len - i - 1;
      if (dgt === 0) continue;
      if (p === 1 && dgt === 1) out += "สิบ";
      else if (p === 1 && dgt === 2) out += "ยี่สิบ";
      else if (p === 0 && dgt === 1 && len > 1 && n[len - 2] !== undefined && Number(n.slice(0, -1)) > 0) out += "เอ็ด";
      else out += nums[dgt] + pos[p];
    }
    return out;
  };
  const [b, s] = amount.toFixed(2).split(".");
  const baht = read(b.replace(/^0+/, "") || "0") || "ศูนย์";
  const satang = Number(s) ? read(s.replace(/^0+/, "")) + "สตางค์" : "ถ้วน";
  return `${baht}บาท${satang}`;
}
