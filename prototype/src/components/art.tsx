"use client";

import { useId } from "react";
import { cx } from "./ui";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="lg-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#lg-logo)" />
        <path d="M12 21.5 17.5 27 28.5 14" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="29" cy="27" r="4" fill="#34d399" stroke="#fff" strokeWidth="1.6" />
      </svg>
      <span className={cx("text-lg font-bold tracking-tight", light ? "text-white" : "text-navy-800")}>
        Consign<span className={light ? "text-sky-300" : "text-brand-600"}>Care</span>
      </span>
    </div>
  );
}

/** Generated hospital illustration – no external images */
export function HospitalArt({ palette, className, label }: { palette: [string, string]; className?: string; label?: string }) {
  const id = useId().replace(/:/g, "");
  const [a, b] = palette;
  return (
    <svg viewBox="0 0 320 140" className={cx(/(^|\s)w-/.test(className ?? "") ? "" : "w-full", "shrink-0", className)} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={b} stopOpacity="0.55" />
          <stop offset="1" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id={`bld${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={a} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <rect width="320" height="140" fill={`url(#sky${id})`} />
      <circle cx="270" cy="30" r="16" fill="#fff" opacity="0.7" />
      <ellipse cx="60" cy="34" rx="28" ry="8" fill="#fff" opacity="0.6" />
      <ellipse cx="200" cy="22" rx="22" ry="6" fill="#fff" opacity="0.5" />
      {/* side wings */}
      <rect x="40" y="62" width="70" height="66" rx="3" fill={a} opacity="0.55" />
      <rect x="210" y="56" width="76" height="72" rx="3" fill={a} opacity="0.55" />
      {/* main tower */}
      <rect x="100" y="28" width="120" height="100" rx="4" fill={`url(#bld${id})`} />
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 6 }).map((__, c) => (
          <rect key={`${r}-${c}`} x={110 + c * 18} y={52 + r * 13} width="11" height="7" rx="1.5" fill="#fff" opacity={0.35 + ((r + c) % 3) * 0.2} />
        )),
      )}
      {Array.from({ length: 4 }).map((_, r) => (
        <g key={r}>
          <rect x={50} y={72 + r * 13} width="50" height="6" rx="1.5" fill="#fff" opacity="0.45" />
          <rect x={220} y={68 + r * 14} width="56" height="6" rx="1.5" fill="#fff" opacity="0.45" />
        </g>
      ))}
      {/* cross sign */}
      <rect x="148" y="33" width="24" height="15" rx="3" fill="#fff" />
      <rect x="157" y="35" width="6" height="11" fill="#ef4444" />
      <rect x="154" y="38" width="12" height="5" fill="#ef4444" />
      {/* entrance */}
      <rect x="146" y="108" width="28" height="20" rx="2" fill="#fff" opacity="0.85" />
      <rect x="0" y="126" width="320" height="14" fill="#e2e8f0" />
      <circle cx="28" cy="118" r="10" fill="#22c55e" opacity="0.7" />
      <circle cx="298" cy="116" r="12" fill="#22c55e" opacity="0.7" />
    </svg>
  );
}

const CATEGORY_COLORS: Record<string, [string, string]> = {
  Neurovascular: ["#1d4ed8", "#dbeafe"],
  Arthroscopy: ["#0f766e", "#ccfbf1"],
  Cardiology: ["#be123c", "#ffe4e6"],
  Pharmaceutical: ["#7c3aed", "#ede9fe"],
  Electrophysiology: ["#c2410c", "#ffedd5"],
};

/** Small product thumbnail drawn per category */
export function ProductArt({ category, className }: { category: string; className?: string }) {
  const [fg, bg] = CATEGORY_COLORS[category] ?? ["#2563eb", "#dbeafe"];
  return (
    <div className={cx("grid shrink-0 place-items-center rounded-xl", className ?? "h-12 w-12")} style={{ background: bg }}>
      <svg viewBox="0 0 40 40" className="h-3/4 w-3/4" aria-hidden>
        {category === "Neurovascular" && (
          <g stroke={fg} strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M8 30 C 14 10, 26 30, 32 10" />
            <path d="M10 33 C 16 13, 28 33, 34 13" opacity="0.5" />
            <path d="M12 16 l4 4 M18 24 l4 -4 M24 16 l4 4" opacity="0.7" />
          </g>
        )}
        {category === "Arthroscopy" && (
          <g fill={fg}>
            <rect x="6" y="18" width="22" height="5" rx="2.5" />
            <rect x="26" y="15" width="8" height="11" rx="2" opacity="0.7" />
            <circle cx="7" cy="20.5" r="3" opacity="0.6" />
          </g>
        )}
        {category === "Cardiology" && (
          <g fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 22h7l3-7 4 14 3-9 2 2h9" />
          </g>
        )}
        {category === "Electrophysiology" && (
          <g fill="none" stroke={fg} strokeLinecap="round">
            <path d="M5 30 C 14 30, 18 12, 30 12" strokeWidth="2.2" />
            {[[30, 12], [34, 12], [26, 13.5]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="1.8" fill={fg} stroke="none" />
            ))}
            <path d="M28 20 l2 3 2-6 2 3h3" strokeWidth="1.6" opacity="0.7" />
          </g>
        )}
        {category === "Pharmaceutical" && (
          <g>
            <rect x="9" y="15" width="22" height="10" rx="5" fill={fg} opacity="0.85" />
            <rect x="20" y="15" width="11" height="10" rx="5" fill="#fff" opacity="0.55" />
          </g>
        )}
      </svg>
    </div>
  );
}

/** Simulated photo of a hospital usage / sticker sheet */
export function UsageSheetArt({ variant = 1, className }: { variant?: number; className?: string }) {
  const rot = variant % 2 ? -3 : 2;
  return (
    <svg viewBox="0 0 160 120" className={cx("w-full", className)} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="160" height="120" fill={variant % 2 ? "#cbd5e1" : "#d6d3d1"} />
      <g transform={`rotate(${rot} 80 60)`}>
        <rect x="22" y="8" width="116" height="106" rx="2" fill="#fff" />
        <rect x="30" y="15" width="60" height="5" rx="1" fill="#334155" opacity="0.7" />
        <rect x="100" y="15" width="30" height="5" rx="1" fill="#94a3b8" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(30 ${27 + i * 16})`}>
            <rect width="54" height="12" rx="1" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.6" />
            {Array.from({ length: 14 }).map((_, k) => (
              <rect key={k} x={3 + k * 2.4} y="2" width={k % 3 ? 0.9 : 1.6} height="6" fill="#0f172a" />
            ))}
            <rect x="60" y="2" width="30" height="3" rx="1" fill="#64748b" opacity="0.6" />
            <rect x="60" y="7" width={18 + ((i + variant) % 3) * 5} height="2.5" rx="1" fill="#94a3b8" opacity="0.6" />
            <text x="96" y="9" fontSize="7" fill="#1d4ed8" fontFamily="sans-serif">{(i + variant) % 3 === 0 ? 2 : 1}</text>
          </g>
        ))}
        <path d="M100 106 q6 -6 12 0 t12 0" stroke="#1d4ed8" fill="none" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/** Photo thumbnail: either an uploaded data URL or a built-in sample */
export function PhotoThumb({ url, className }: { url: string; className?: string }) {
  if (url.startsWith("/samples/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="usage sheet" className={cx("rounded-xl bg-white object-cover object-top", className)} />
    );
  }
  if (url.startsWith("sample-")) {
    return (
      <div className={cx("overflow-hidden rounded-xl", className)}>
        <UsageSheetArt variant={Number(url.split("-")[1]) || 1} className="h-full" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="usage" className={cx("rounded-xl object-cover", className)} />
  );
}

/** Generated barcode bars (visual only) */
export function BarcodeArt({ value, className }: { value: string; className?: string }) {
  const bars: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    bars.push((c % 3) + 1, (c % 2) + 1, ((c >> 2) % 3) + 1);
  }
  let x = 0;
  const rects = bars.map((w, i) => {
    const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={40} fill="#0f172a" /> : null;
    x += w;
    return r;
  });
  return (
    <svg viewBox={`0 0 ${x} 40`} className={cx("h-10 w-full", className)} preserveAspectRatio="none" aria-hidden>
      {rects}
    </svg>
  );
}
