"use client";

import { useStore } from "@/lib/store";
import { cx } from "./ui";

/** TH / EN segmented toggle. `dark` for use on navy headers. */
export function LangToggle({ dark, className }: { dark?: boolean; className?: string }) {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  return (
    <div
      className={cx(
        "inline-flex shrink-0 rounded-full p-0.5 text-[11px] font-semibold",
        dark ? "bg-white/15 ring-1 ring-white/20" : "bg-slate-100 ring-1 ring-slate-200",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cx(
            "rounded-full px-2.5 py-1 transition",
            lang === l
              ? dark
                ? "bg-white text-navy-800"
                : "bg-white text-brand-700 shadow-sm"
              : dark
                ? "text-white/80 hover:text-white"
                : "text-slate-500 hover:text-slate-700",
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
