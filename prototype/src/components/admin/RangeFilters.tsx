"use client";

import { Check, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/components/ui";
import { useFmt } from "@/lib/format";
import { DEMO_TODAY } from "@/lib/ops";

/**
 * Header filters that open a popover: a multi-select list, a date range picker (calendar, click the start day then the end day) and a
 * price range slider (two knobs). The popover is portalled to <body> with fixed positioning, so the table's own
 * scrolling does not clip it.
 */

function Popover({ anchor, open, onClose, children, align = "left" }: { anchor: React.RefObject<HTMLElement | null>; open: boolean; onClose: () => void; children: ReactNode; align?: "left" | "right" }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const w = box.current?.offsetWidth ?? 280;
      if (!a) return;
      const left = align === "right" ? a.right - w : a.left;
      setPos({ top: a.bottom + 6, left: Math.max(8, Math.min(left, window.innerWidth - w - 8)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, align]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, onClose, anchor]);

  if (!open) return null;
  return createPortal(
    <div
      ref={box}
      role="dialog"
      className="fixed z-[80] rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-normal normal-case tracking-normal text-slate-700 shadow-xl animate-fade-in"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden", top: 0, left: 0 }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** The trigger in the header cell: "all" when empty, otherwise the two ends on two lines so a narrow column shows both. */
function Trigger({ icon, lines, active, onClick, onClear, right, btnRef }: { icon: ReactNode; lines: string[]; active: boolean; onClick: () => void; onClear: () => void; right?: boolean; btnRef: React.RefObject<HTMLButtonElement | null> }) {
  const { t } = useFmt();
  return (
    <div className={cx("flex min-h-7 items-center rounded-md border bg-white text-xs", active ? "border-brand-300 text-brand-800" : "border-slate-200 text-slate-400")}>
      <button ref={btnRef} type="button" onClick={onClick} title={lines.join(" – ")} className={cx("flex min-h-7 min-w-0 flex-1 items-center gap-1.5 px-2 py-0.5", right && "flex-row-reverse text-right")}>
        {!active && <span className="shrink-0">{icon}</span>}
        <span className="min-w-0 leading-tight">
          {lines.map((l, i) => (
            <span key={i} className="block truncate whitespace-nowrap tabular-nums">
              {l}
            </span>
          ))}
        </span>
      </button>
      {active && (
        <button type="button" onClick={onClear} className="grid h-full w-6 shrink-0 place-items-center text-slate-400 hover:text-rose-500" aria-label={t("a.table.clear")}>
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- date range */

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const { t, lang, date } = useFmt();
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const start = from || to;
  const [view, setView] = useState(() => {
    const [y, m] = (start || DEMO_TODAY).split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [hover, setHover] = useState("");
  const locale = lang === "th" ? "th-TH" : "en-US";

  const label = from && to ? `${date(from)} – ${date(to)}` : from ? `${date(from)} –` : to ? `– ${date(to)}` : t("a.table.anyDate");
  // the header cell is narrow: "10 ต.ค. 69" there, the full date in the tooltip and the popover
  const compact = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short", year: "2-digit" });
  const lines = from || to ? [from ? compact(from) : "…", `– ${to ? compact(to) : "…"}`] : [t("a.table.anyDate")];
  const first = new Date(view.y, view.m, 1);
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => iso(view.y, view.m, i + 1))];
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2026, 2, 1 + i).toLocaleDateString(locale, { weekday: "narrow" })); // 1 Mar 2026 is a Sunday
  const move = (n: number) => setView((v) => ({ y: v.y + Math.floor((v.m + n) / 12), m: (((v.m + n) % 12) + 12) % 12 }));

  // first click picks the start; the second picks the end (swapped if it comes earlier); a third starts over
  const pick = (d: string) => {
    if (!from || (from && to)) onChange(d, "");
    else if (d < from) onChange(d, from);
    else onChange(from, d);
  };
  const end = to || (from && hover > from ? hover : "");

  return (
    <>
      <Trigger btnRef={btn} icon={<CalendarDays className="h-3.5 w-3.5" />} lines={lines} active={!!(from || to)} onClick={() => setOpen((o) => !o)} onClear={() => onChange("", "")} />
      <Popover anchor={btn} open={open} onClose={() => setOpen(false)}>
        <div className="w-[264px]" onMouseLeave={() => setHover("")}>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold text-navy-800">{first.toLocaleDateString(locale, { month: "long", year: "numeric" })}</p>
            <div className="flex gap-0.5">
              <button type="button" onClick={() => move(-1)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t("a.table.prevMonth")}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => move(1)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={t("a.table.nextMonth")}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
            {weekdays.map((w, i) => (
              <span key={i} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {cells.map((d, i) => {
              if (!d) return <span key={`b${i}`} />;
              const edge = d === from || d === end;
              const inside = from && end && d > from && d < end;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => pick(d)}
                  onMouseEnter={() => setHover(d)}
                  className={cx(
                    "h-8 tabular-nums transition",
                    inside && "bg-brand-50 text-brand-800",
                    edge ? "rounded-lg bg-brand-600 font-semibold text-white" : "rounded-lg hover:bg-slate-100",
                    inside && "rounded-none",
                    d === DEMO_TODAY && !edge && "ring-1 ring-inset ring-brand-400",
                  )}
                  aria-pressed={edge}
                  aria-label={date(d)}
                >
                  {Number(d.slice(8))}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
            <span className="text-slate-500">{from && !to ? t("a.table.pickEnd") : label}</span>
            <button type="button" onClick={() => onChange("", "")} className="font-medium text-brand-700 hover:underline">
              {t("a.table.clear")}
            </button>
          </div>
        </div>
      </Popover>
    </>
  );
}

/* ---------------------------------------------------------------- number range */

export function NumberRangeFilter({ min, max, limit, step = 100, onChange, format }: { min: string; max: string; limit: number; step?: number; onChange: (min: string, max: string) => void; format: (n: number) => string }) {
  const { t } = useFmt();
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const top = Math.max(step, Math.ceil(limit / step) * step);
  const lo = min === "" ? 0 : Math.min(Number(min), top);
  const hi = max === "" ? top : Math.min(Number(max), top);
  const active = min !== "" || max !== "";
  const pct = (n: number) => (n / top) * 100;
  const set = (a: number, b: number) => onChange(a <= 0 ? "" : String(a), b >= top ? "" : String(b));

  return (
    <>
      <Trigger btnRef={btn} right icon={<SlidersHorizontal className="h-3.5 w-3.5" />} lines={active ? [format(lo), `– ${format(hi)}`] : [t("a.table.anyAmount")]} active={active} onClick={() => setOpen((o) => !o)} onClear={() => onChange("", "")} />
      <Popover anchor={btn} open={open} onClose={() => setOpen(false)} align="right">
        <div className="w-[280px]">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-navy-800">{t("a.table.priceRange")}</span>
            <button type="button" onClick={() => onChange("", "")} className="font-medium text-brand-700 hover:underline">
              {t("a.table.clear")}
            </button>
          </div>
          {/* two range inputs on one track: only their knobs take the pointer */}
          <div className="relative h-6">
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
            <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-600" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
            <input type="range" min={0} max={top} step={step} value={lo} onChange={(e) => set(Math.min(Number(e.target.value), hi), hi)} className="range-dual" aria-label={t("a.table.from")} />
            <input type="range" min={0} max={top} step={step} value={hi} onChange={(e) => set(lo, Math.max(Number(e.target.value), lo))} className="range-dual" aria-label={t("a.table.to")} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400 tabular-nums">
            <span>{format(0)}</span>
            <span>{format(top)}</span>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <NumBox label={t("a.table.from")} value={lo} onChange={(n) => set(Math.min(n, hi), hi)} />
            <span className="text-slate-400">–</span>
            <NumBox label={t("a.table.to")} value={hi} onChange={(n) => set(lo, Math.max(n, lo))} />
          </div>
        </div>
      </Popover>
    </>
  );
}

function NumBox({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-400">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-8 w-full rounded-lg border border-slate-200 px-2 text-right text-xs tabular-nums outline-none focus:border-brand-400"
      />
    </label>
  );
}

/* ---------------------------------------------------------------- multi-select */

export function MultiSelectFilter({ options, selected, onChange }: { options: { value: string; label: string; count?: number }[]; selected: string[]; onChange: (v: string[]) => void }) {
  const { t } = useFmt();
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const active = selected.length > 0;
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const lines = !active ? [t("g.all")] : selected.length === 1 ? [options.find((o) => o.value === selected[0])?.label ?? selected[0]] : [t("a.table.nSelected", { n: selected.length })];

  return (
    <>
      <Trigger btnRef={btn} icon={<ChevronDown className="h-3.5 w-3.5" />} lines={lines} active={active} onClick={() => setOpen((o) => !o)} onClear={() => onChange([])} />
      <Popover anchor={btn} open={open} onClose={() => setOpen(false)} align="right">
        <div className="w-[220px]">
          <ul className="space-y-0.5">
            {options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <li key={o.value}>
                  <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(o.value)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50">
                    <span className={cx("grid h-4 w-4 shrink-0 place-items-center rounded border", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white")}>
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1">{o.label}</span>
                    {o.count !== undefined && <span className="tabular-nums text-slate-400">{o.count}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-xs">
            <button type="button" onClick={() => onChange(options.map((o) => o.value))} className="font-medium text-slate-600 hover:underline">
              {t("a.table.selectAll")}
            </button>
            <button type="button" onClick={() => onChange([])} className="font-medium text-brand-700 hover:underline">
              {t("a.table.clear")}
            </button>
          </div>
        </div>
      </Popover>
    </>
  );
}
