"use client";

import {
  ArrowRight,
  BarChart3,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Leaf,
  Receipt,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Truck,
  Users,
  XCircle,
  Zap,
  Lock,
  Monitor,
  Presentation,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/art";
import { LangToggle } from "@/components/LangToggle";
import { Avatar, homeFor, PersonaSwitcher } from "@/components/PersonaSwitcher";
import { Hydrated } from "@/components/Providers";
import { Badge, cx } from "@/components/ui";
import { useT } from "@/i18n";
import { name } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { asset } from "@/lib/base";

/** The project deck: plain HTML in public/presentation, served as a static page. */
const DECK = asset("/presentation/index.html");

const PILLARS = [
  { key: "faster", icon: Zap, tone: "bg-blue-50 text-blue-600" },
  { key: "accurate", icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-600" },
  { key: "paperless", icon: Leaf, tone: "bg-orange-50 text-orange-600" },
  { key: "decision", icon: BarChart3, tone: "bg-violet-50 text-violet-600" },
];

const FEATURES = [
  { key: "capture", icon: Camera },
  { key: "track", icon: ClipboardCheck },
  { key: "multi", icon: Users },
  { key: "hospitals", icon: Building2 },
];

const JOURNEY = [
  { key: "usage", icon: Stethoscope, who: "SALES_REP" as Role, color: "#2563eb" },
  { key: "quotation", icon: FileText, who: "SALES_ADMIN" as Role, color: "#4f46e5" },
  { key: "po", icon: ClipboardCheck, who: "SALES_ADMIN" as Role, color: "#0d9488" },
  { key: "requisition", icon: Truck, who: "WAREHOUSE" as Role, color: "#7c3aed" },
  { key: "billing", icon: Receipt, who: "ACCOUNTING" as Role, color: "#0284c7" },
  { key: "closed", icon: CheckCircle2, who: "ACCOUNTING" as Role, color: "#16a34a" },
];

const PAINS = ["typing", "unbilled", "slow", "expired", "visibility"];
const MEASURES = [
  { key: "typing", before: "15 min", after: "3 min" },
  { key: "unbilled", before: "~92%", after: "99.5%" },
  { key: "slow", before: "21 d", after: "7 d" },
  { key: "expired", before: "3%", after: "<1%" },
  { key: "visibility", before: "✕", after: "✓" },
];

const ROLE_CARDS: { role: Role; userId: string; channel: "mobile" | "web" }[] = [
  { role: "SALES_REP", userId: "u-sinenart", channel: "mobile" },
  { role: "SALES_ADMIN", userId: "u-kanya", channel: "web" },
  { role: "MANAGER", userId: "u-somchai", channel: "web" },
  { role: "WAREHOUSE", userId: "u-pim", channel: "web" },
  { role: "ACCOUNTING", userId: "u-ratana", channel: "web" },
  { role: "ADMIN", userId: "u-admin", channel: "web" },
];

export default function Landing() {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-white">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-800/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo light />
          <nav className="ml-8 hidden items-center gap-6 text-sm text-white/70 lg:flex">
            <a href="#problem" className="hover:text-white">{t("l.nav.problem")}</a>
            <a href="#journey" className="hover:text-white">{t("l.nav.journey")}</a>
            <a href="#roles" className="hover:text-white">{t("l.nav.roles")}</a>
            <a href="#demo" className="hover:text-white">{t("l.nav.demo")}</a>
            <a href={DECK} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white">
              <Presentation className="h-4 w-4" /> {t("l.nav.deck")}
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle dark />
            <Hydrated>
              <PersonaSwitcher dark />
            </Hydrated>
          </div>
        </div>
      </header>

      <Hero />

      {/* problem -> solution */}
      <section id="problem" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
        <SectionHead eyebrow={t("l.problem.eyebrow")} title={t("l.problem.title")} desc={t("l.problem.desc")} />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-rose-100 bg-gradient-to-b from-rose-50/80 to-white p-6 sm:p-8">
            <Badge tone="red" className="mb-4">{t("l.problem.today")}</Badge>
            <p className="mb-5 text-sm leading-relaxed text-slate-600">{t("l.problem.story")}</p>
            <ul className="space-y-3">
              {PAINS.map((p) => (
                <li key={p} className="flex gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                  <div>
                    <p className="font-semibold text-slate-800">{t(`l.pain.${p}`)}</p>
                    <p className="text-sm text-slate-500">{t(`l.pain.${p}.who`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white p-6 sm:p-8">
            <Badge tone="green" className="mb-4">{t("l.problem.with")}</Badge>
            <p className="mb-5 text-sm leading-relaxed text-slate-600">{t("l.solution.story")}</p>
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-emerald-50/70 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">{t("l.measure.measure")}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t("l.measure.before")}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t("l.measure.target")}</th>
                  </tr>
                </thead>
                <tbody>
                  {MEASURES.map((m) => (
                    <tr key={m.key} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">{t(`l.measure.${m.key}`)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-rose-500 line-through decoration-rose-300">{m.before}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-600">{m.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* pillars */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead eyebrow={t("l.pillars.eyebrow")} title={t("l.pillars.title")} />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.key} className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className={cx("grid h-12 w-12 place-items-center rounded-2xl", p.tone)}>
                  <p.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-800">{t(`l.pillar.${p.key}`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{t(`l.pillar.${p.key}.desc`)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.key} className="flex items-center gap-3 rounded-2xl bg-navy-800 px-4 py-3 text-white">
                <f.icon className="h-5 w-5 shrink-0 text-sky-300" />
                <div>
                  <p className="text-sm font-semibold">{t(`l.feat.${f.key}`)}</p>
                  <p className="text-xs text-white/60">{t(`l.feat.${f.key}.sub`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* journey */}
      <section id="journey" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
        <SectionHead eyebrow={t("l.journey.eyebrow")} title={t("l.journey.title")} desc={t("l.journey.desc")} />
        <div className="relative mt-14">
          <div className="absolute left-[8%] right-[8%] top-8 hidden h-1 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 lg:block" />
          <ol className="relative grid gap-6 lg:grid-cols-6 lg:gap-3">
            {JOURNEY.map((s, i) => (
              <li key={s.key} className="flex items-start gap-4 lg:flex-col lg:items-center lg:text-center">
                <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-white shadow-lg ring-4 ring-white" style={{ background: s.color }}>
                  <s.icon className="h-7 w-7" />
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-slate-700 shadow">{i + 1}</span>
                </span>
                <div className="lg:mt-3">
                  <p className="font-semibold text-slate-800">{t(`step.${s.key}`)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t(`l.journey.${s.key}`)}</p>
                  <Badge tone="gray" className="mt-2">{t(`role.${s.who}`)}</Badge>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-12 grid gap-4 rounded-3xl bg-gradient-to-r from-navy-800 to-navy-700 p-6 text-white sm:grid-cols-3 sm:p-8">
          {["l.journey.k1", "l.journey.k2", "l.journey.k3"].map((k) => (
            <div key={k} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <p className="text-sm text-white/85">{t(k)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* roles */}
      <section id="roles" className="scroll-mt-16 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead eyebrow={t("l.roles.eyebrow")} title={t("l.roles.title")} desc={t("l.roles.desc")} />
          <Hydrated fallback={<div className="mt-12 h-64" />}>
            <RoleCards />
          </Hydrated>
        </div>
      </section>

      {/* demo path */}
      <section id="demo" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
        <SectionHead eyebrow={t("l.demo.eyebrow")} title={t("l.demo.title")} desc={t("l.demo.desc")} />
        <ol className="mx-auto mt-10 grid max-w-4xl gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <li key={n} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{n}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">{t(`l.demo.s${n}`)}</p>
                <p className="text-sm text-slate-500">{t(`l.demo.s${n}.d`)}</p>
              </div>
              {n === 1 ? <Smartphone className="h-5 w-5 shrink-0 text-slate-300" /> : <Monitor className="h-5 w-5 shrink-0 text-slate-300" />}
            </li>
          ))}
        </ol>
        <CTA className="mt-10 justify-center" />
      </section>

      <footer className="bg-navy-900 py-10 text-white/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center sm:px-6">
          <Logo light />
          <p className="text-lg font-semibold text-white">{t("app.slogan")}</p>
          <p className="text-sm">{t("app.tagline")}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-white/50">
            <Lock className="h-3 w-3" /> {t("l.footer.note")}
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-800 sm:text-4xl">{title}</h2>
      {desc && <p className="mt-4 text-base leading-relaxed text-slate-500">{desc}</p>}
    </div>
  );
}

function CTA({ className }: { className?: string }) {
  const { t } = useT();
  return (
    <div className={cx("flex flex-col gap-3 sm:flex-row", className)}>
      <Link href="/m" className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-brand-600 px-6 py-4 text-white shadow-xl shadow-brand-600/30 transition hover:bg-brand-500">
        <Smartphone className="h-6 w-6" />
        <span className="text-left">
          <span className="block text-base font-semibold">{t("l.cta.mobile")}</span>
          <span className="block text-xs text-white/75">{t("l.cta.mobile.sub")}</span>
        </span>
        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
      </Link>
      <Link href="/admin" className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-navy-800 shadow-xl ring-1 ring-slate-200 transition hover:bg-slate-50">
        <LayoutDashboard className="h-6 w-6 text-brand-600" />
        <span className="text-left">
          <span className="block text-base font-semibold">{t("l.cta.admin")}</span>
          <span className="block text-xs text-slate-500">{t("l.cta.admin.sub")}</span>
        </span>
        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function Hero() {
  const { t } = useT();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-[#1e3a8a] text-white">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full bg-sky-400/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <Badge tone="blue" className="bg-white/10 text-sky-200 ring-white/20">{t("l.hero.badge")}</Badge>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[56px]">
            From Case to Billing,
            <br />
            <span className="bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent">All in One Place</span>
          </h1>
          <p className="mt-3 text-xl font-medium text-white/85">{t("l.hero.sub")}</p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">{t("l.hero.desc")}</p>
          <CTA className="mt-8" />
          <a href={DECK} target="_blank" rel="noreferrer" className="group mt-4 inline-flex items-center gap-2 text-sm font-medium text-sky-200 hover:text-white">
            <Presentation className="h-4 w-4" /> {t("l.deck.link")}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </a>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            {["l.hero.p1", "l.hero.p2", "l.hero.p3"].map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> {t(k)}
              </span>
            ))}
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/** Decorative mock of the phone + back-office (static numbers from the concept) */
function HeroVisual() {
  const { t } = useT();
  return (
    <div className="relative mx-auto h-[460px] w-full max-w-[520px]">
      {/* back-office card */}
      <div className="absolute right-0 top-6 w-[78%] rounded-2xl bg-white p-4 text-slate-800 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500">{t("l.hero.vis.dash")}</p>
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-300" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["30", t("l.hero.vis.open"), "bg-blue-50 text-blue-700"],
            ["7", t("cs.WAITING_PO"), "bg-orange-50 text-orange-700"],
            ["฿0.4M", t("l.hero.vis.bill"), "bg-emerald-50 text-emerald-700"],
          ].map(([v, l, c]) => (
            <div key={l} className={cx("rounded-xl p-2.5", c)}>
              <p className="text-lg font-bold">{v}</p>
              <p className="truncate text-[10px] opacity-80">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex h-24 items-end gap-2 rounded-xl bg-slate-50 p-3">
          {[40, 65, 52, 80, 45, 90, 70].map((h, i) => (
            <span key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-brand-600 to-sky-400" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {["Bangkok Hospital", "Bumrungrad Hospital", "Samitivej Hospital"].map((h, i) => (
            <div key={h} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">{h}</span>
              <span className="font-semibold">{[12, 8, 6][i]}</span>
            </div>
          ))}
        </div>
      </div>
      {/* phone */}
      <div className="absolute bottom-0 left-0 w-[210px] rounded-[34px] border-[7px] border-slate-900 bg-slate-50 shadow-2xl">
        <div className="rounded-t-[26px] bg-navy-800 px-3 pb-8 pt-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-[11px] font-bold">S</span>
            <div>
              <p className="text-[11px] font-semibold">Hello, Sinenart</p>
              <p className="text-[9px] text-white/60">Sales Representative</p>
            </div>
          </div>
        </div>
        <div className="-mt-5 mx-2 rounded-2xl bg-white p-2 shadow">
          <p className="mb-1.5 text-[9px] font-semibold text-slate-700">My Accounts (4)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ["12", "My Cases", "bg-blue-50 text-blue-700"],
              ["5", "Waiting PO", "bg-orange-50 text-orange-700"],
              ["8", "Waiting Billing", "bg-emerald-50 text-emerald-700"],
              ["26", "Usage This Month", "bg-violet-50 text-violet-700"],
            ].map(([v, l, c]) => (
              <div key={l} className={cx("rounded-lg p-1.5 text-center", c)}>
                <p className="text-sm font-bold">{v}</p>
                <p className="text-[7px]">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1 p-2.5">
          {["New PO uploaded", "Case C25001 updated", "Usage recorded"].map((x) => (
            <div key={x} className="flex items-center gap-1.5 rounded-lg bg-white p-1.5 shadow-sm">
              <span className="h-4 w-4 rounded bg-brand-100" />
              <span className="text-[8px] font-medium text-slate-700">{x}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-around rounded-b-[26px] border-t border-slate-100 bg-white py-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={cx("rounded-full", i === 2 ? "-mt-3 h-7 w-7 bg-brand-600" : "h-3 w-3 bg-slate-200")} />
          ))}
        </div>
      </div>
      {/* floating OCR chip */}
      <div className="absolute bottom-24 left-[46%] flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-slate-800 shadow-xl">
        <ScanLine className="h-5 w-5 text-brand-600" />
        <div>
          <p className="text-xs font-semibold">{t("l.hero.vis.ocr")}</p>
          <p className="text-[10px] text-slate-500">15 min → 3 min</p>
        </div>
      </div>
    </div>
  );
}

function RoleCards() {
  const { t, lang } = useT();
  const router = useRouter();
  const users = useStore((s) => s.data.users);
  const setMobile = useStore((s) => s.setMobileUser);
  const setAdmin = useStore((s) => s.setAdminUser);
  const setSignedIn = useStore((s) => s.setMobileSignedIn);
  return (
    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {ROLE_CARDS.map((r) => {
        const u = users.find((x) => x.id === r.userId);
        if (!u) return null;
        return (
          <div key={r.role} className="flex flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
            <div className="flex items-center gap-3">
              <Avatar user={u} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">{t(`role.${r.role}`)}</p>
                <p className="text-sm text-slate-500">{name(u, lang)}</p>
              </div>
              <Badge tone={r.channel === "mobile" ? "blue" : "indigo"}>
                {r.channel === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                {r.channel === "mobile" ? "Mobile" : "Web"}
              </Badge>
            </div>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{t(`l.role.${r.role}`)}</p>
            <button
              onClick={() => {
                if (u.role === "SALES_REP") {
                  setMobile(u.id);
                  setSignedIn(true);
                } else setAdmin(u.id);
                router.push(homeFor(u));
              }}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
            >
              {t("l.roles.enter", { name: name(u, lang) })} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
