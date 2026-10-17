"use client";

import { Download, HardDrive, KeyRound, RotateCcw, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ConfirmModal, PageHeader, rowCls, TableWrap, Td, Th } from "@/components/admin/kit";
import { toast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, cx, Input } from "@/components/ui";
import * as db from "@/lib/db";
import { useFmt } from "@/lib/format";
import { useData, useStore } from "@/lib/store";

const QUOTA = 5 * 1024 * 1024; // what most browsers allow one origin
const kb = (n: number) => `${(n / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`;

/** The prototype's localStorage database: every table, its rows and size, with backup, restore and reset. */
export default function DatabasePage() {
  const { t, num } = useFmt();
  const d = useData();
  const [table, setTable] = useState<db.Table>("cases");
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  // read from localStorage itself; every commit is stored before the data changes, so `d` marks a new commit
  /* eslint-disable react-hooks/exhaustive-deps */
  const stats = useMemo(() => db.stats(), [d]);
  const used = useMemo(() => db.usedBytes(), [d]);
  const meta = useMemo(() => db.readMeta(), [d]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const rows = d[table] as unknown as Record<string, unknown>[];
  const cols = useMemo(() => [...new Set(rows.slice(0, 50).flatMap((r) => Object.keys(r)))], [rows]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(needle)) : rows;
  }, [rows, q]);

  const backup = () => {
    const blob = new Blob([db.dump(d)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `consigncare-db-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(t("a.db.backedUp", { file: a.download }));
  };

  const restore = async (f?: File) => {
    if (!f) return;
    try {
      useStore.getState().replace(db.parseDump(await f.text()));
      toast.success(t("a.db.restored", { file: f.name }));
    } catch (e) {
      toast.error(`${t("a.db.restoreFailed")}: ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("a.db.title")}
        subtitle={t("a.db.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={backup}>
              <Download className="h-4 w-4" /> {t("a.db.backup")}
            </Button>
            <Button variant="outline" onClick={() => file.current?.click()}>
              <Upload className="h-4 w-4" /> {t("a.db.restore")}
            </Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              <RotateCcw className="h-4 w-4" /> {t("g.resetDemo")}
            </Button>
            <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ""; }} />
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t("a.db.engine")}</p>
          <p className="mt-1 flex items-center gap-2 font-semibold text-navy-800">
            <HardDrive className="h-4 w-4 text-brand-600" /> window.localStorage
          </p>
          <p className="mt-1 text-xs text-slate-500">{t("a.db.engineSub")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t("a.db.used")}</p>
          <p className="mt-1 font-semibold text-navy-800">
            {kb(used)} <span className="text-xs font-normal text-slate-400">/ ~{kb(QUOTA)}</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={cx("h-full rounded-full", used / QUOTA > 0.8 ? "bg-rose-500" : "bg-brand-500")} style={{ width: `${Math.min(100, (used / QUOTA) * 100)}%` }} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t("a.db.schema")}</p>
          <p className="mt-1 font-semibold text-navy-800">
            v{meta?.version ?? "–"} · {num(db.TABLES.length)} {t("a.db.tables")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t("a.db.lastCommit")}: {meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString() : "–"}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader icon={<KeyRound className="h-5 w-5" />} title={t("a.db.tables")} subtitle={db.NS + "*"} />
          <ul className="thin-scrollbar max-h-[560px] overflow-y-auto py-1">
            {stats.map((s) => (
              <li key={s.table}>
                <button
                  onClick={() => {
                    setTable(s.table);
                    setQ("");
                  }}
                  className={cx("flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition", table === s.table ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-700 hover:bg-slate-50")}
                >
                  <span className="truncate font-mono text-xs">{s.table}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                    {num(s.rows)} · {kb(s.bytes)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="mr-auto min-w-0">
              <p className="font-mono text-sm font-semibold text-navy-800">{table}</p>
              <p className="font-mono text-[11px] text-slate-400">
                localStorage[&quot;{db.NS + table}&quot;] · {t("a.db.updated")} {stats.find((s) => s.table === table)?.updatedAt?.replace("T", " ").slice(0, 19) ?? "–"}
              </p>
            </div>
            <Badge tone="blue">{t("a.db.rowsN", { n: num(shown.length) })}</Badge>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("a.db.filter")} className="h-9 w-56" />
          </div>
          <TableWrap maxH="520px">
            <thead>
              <tr>
                {cols.map((c) => (
                  <Th key={c}>{c}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 200).map((r, i) => (
                <tr key={(r.id as string) ?? i} className={rowCls}>
                  {cols.map((c) => (
                    <Td key={c} className="max-w-[260px] truncate font-mono text-[11px]">
                      <Cell v={r[c]} />
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {shown.length > 200 && <p className="border-t border-slate-100 px-5 py-2 text-xs text-slate-400">{t("a.db.first200")}</p>}
          {shown.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-400">{t("a.db.empty")}</p>}
        </Card>
      </div>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        danger
        title={t("g.resetDemo")}
        desc={t("g.resetDemoDesc")}
        confirmLabel={t("g.resetDemo")}
        onConfirm={() => {
          useStore.getState().reset();
          toast.success(t("g.resetDone"));
        }}
      />
    </div>
  );
}

function Cell({ v }: { v: unknown }) {
  if (v == null) return <span className="text-slate-300">null</span>;
  if (typeof v === "string") return v.startsWith("data:") ? <span className="text-slate-400">{`data:… (${kb(v.length * 2)})`}</span> : <span title={v}>{v}</span>;
  if (typeof v === "number" || typeof v === "boolean") return <span className="text-indigo-600">{String(v)}</span>;
  const s = JSON.stringify(v, (_, x) => (typeof x === "string" && x.startsWith("data:") ? "data:…" : x));
  return (
    <span className="text-slate-500" title={s}>
      {s}
    </span>
  );
}
