"use client";

import { useState, type ReactNode } from "react";
import { Building2, Package, Pencil, Plus, Search, Stethoscope, Tag, Trash2, Truck, Users } from "lucide-react";
import { HospitalArt, ProductArt } from "@/components/art";
import { Avatar } from "@/components/PersonaSwitcher";
import { toast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Tabs, Textarea, cx } from "@/components/ui";
import { ConfirmModal, PageHeader, SearchBox, TableWrap, Td, Th, rowCls } from "@/components/admin/kit";
import { useFmt } from "@/lib/format";
import * as ops from "@/lib/ops";
import { name } from "@/lib/selectors";
import { useData, useOp, useStore } from "@/lib/store";
import type { Data, Role } from "@/lib/types";

type Rec = { id: string } & Record<string, unknown>;
type Col = ops.MasterCollection;

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "email" | "number" | "date" | "select" | "multi" | "palette" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  span?: boolean;
};

interface Config {
  icon: ReactNode;
  label: string;
  columns: { label: string; render: (r: Rec) => ReactNode; right?: boolean }[];
  fields: FieldDef[];
  search: (r: Rec) => string;
  blank: () => Rec;
  inUse: (d: Data, id: string) => boolean;
  title: (r: Rec) => string;
}

const PALETTES: [string, string][] = [
  ["#1d4ed8", "#60a5fa"],
  ["#0f766e", "#5eead4"],
  ["#7c3aed", "#c4b5fd"],
  ["#c2410c", "#fdba74"],
  ["#be123c", "#fda4af"],
  ["#0369a1", "#7dd3fc"],
  ["#4d7c0f", "#bef264"],
  ["#334155", "#cbd5e1"],
];

const ROLES: Role[] = ["SALES_REP", "SALES_ADMIN", "MANAGER", "WAREHOUSE", "PURCHASING", "ACCOUNTING", "ADMIN"];
const UNITS = ["piece", "pcs", "box", "set"];

const s = (v: unknown) => (v == null ? "" : String(v));

export default function MasterPage() {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const run = useOp();
  const [tab, setTab] = useState<Col>("hospitals");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ rec: Rec; isNew: boolean } | null>(null);
  const [del, setDel] = useState<Rec | null>(null);

  const hospOpts = d.hospitals.map((h) => ({ value: h.id, label: name(h, lang) }));
  const hName = (id: unknown) => name(d.hospitals.find((h) => h.id === id), lang);
  const categories = Array.from(new Set(d.products.map((p) => p.category)));

  const CFG: Record<Col, Config> = {
    hospitals: {
      icon: <Building2 className="h-4 w-4" />,
      label: t("a.md.hospitals"),
      columns: [
        {
          label: t("g.hospital"),
          render: (r) => (
            <div className="flex items-center gap-3">
              <HospitalArt palette={r.palette as [string, string]} className="h-9 w-12 shrink-0 rounded-lg" />
              <div>
                <p className="font-medium text-slate-800">{s(r.name)}</p>
                <p className="text-xs text-slate-500">{s(r.nameTh)}</p>
              </div>
            </div>
          ),
        },
        { label: t("a.md.code"), render: (r) => <Badge tone="blue">{s(r.code)}</Badge> },
        { label: t("a.md.email"), render: (r) => s(r.contactEmail) },
        { label: "LINE", render: (r) => <span className="font-mono text-xs">{s(r.lineGroupId)}</span> },
        { label: t("a.md.taxId"), render: (r) => <span className="font-mono text-xs">{s(r.taxId)}</span> },
      ],
      fields: [
        { key: "code", label: t("a.md.code"), type: "text", required: true },
        { key: "taxId", label: t("a.md.taxId"), type: "text" },
        { key: "name", label: t("a.md.nameEn"), type: "text", required: true },
        { key: "nameTh", label: t("a.md.nameTh"), type: "text", required: true },
        { key: "address", label: t("a.md.address"), type: "textarea", span: true },
        { key: "contactEmail", label: t("a.md.email"), type: "email", required: true },
        { key: "lineGroupId", label: t("a.md.lineGroup"), type: "text" },
        { key: "palette", label: t("a.md.palette"), type: "palette", span: true },
      ],
      search: (r) => [r.code, r.name, r.nameTh, r.contactEmail].map(s).join(" "),
      blank: () => ({ id: ops.uid("h"), code: "", name: "", nameTh: "", address: "", taxId: "", contactEmail: "", lineGroupId: "", palette: PALETTES[5] }),
      inUse: (dd, id) => dd.cases.some((c) => c.hospitalId === id),
      title: (r) => s(r.name),
    },
    doctors: {
      icon: <Stethoscope className="h-4 w-4" />,
      label: t("a.md.doctors"),
      columns: [
        {
          label: t("g.doctor"),
          render: (r) => (
            <div>
              <p className="font-medium text-slate-800">{s(r.name)}</p>
              <p className="text-xs text-slate-500">{s(r.nameTh)}</p>
            </div>
          ),
        },
        { label: t("a.md.specialty"), render: (r) => s(r.specialty) },
        {
          label: t("a.md.hospitals"),
          render: (r) => (
            <div className="flex flex-wrap gap-1">
              {(r.hospitalIds as string[]).map((id) => (
                <Badge key={id}>{d.hospitals.find((h) => h.id === id)?.code ?? id}</Badge>
              ))}
            </div>
          ),
        },
      ],
      fields: [
        { key: "name", label: t("a.md.nameEn"), type: "text", required: true },
        { key: "nameTh", label: t("a.md.nameTh"), type: "text", required: true },
        { key: "specialty", label: t("a.md.specialty"), type: "text", span: true },
        { key: "hospitalIds", label: t("a.md.hospitals"), type: "multi", options: hospOpts, span: true },
      ],
      search: (r) => [r.name, r.nameTh, r.specialty].map(s).join(" "),
      blank: () => ({ id: ops.uid("doc"), name: "", nameTh: "", specialty: "", hospitalIds: [] }),
      inUse: (dd, id) => dd.cases.some((c) => c.doctorId === id),
      title: (r) => s(r.name),
    },
    products: {
      icon: <Package className="h-4 w-4" />,
      label: t("a.md.products"),
      columns: [
        {
          label: t("g.product"),
          render: (r) => (
            <div className="flex items-center gap-2.5">
              <ProductArt category={s(r.category)} className="h-9 w-9 rounded-lg" />
              <div>
                <p className="font-medium text-slate-800">{s(r.name)}</p>
                <p className="font-mono text-[11px] text-slate-400">{s(r.ref)}</p>
              </div>
            </div>
          ),
        },
        { label: t("a.md.category"), render: (r) => <Badge tone="blue">{s(r.category)}</Badge> },
        { label: "GTIN", render: (r) => <span className="font-mono text-xs">{s(r.gtin)}</span> },
        { label: t("g.unit"), render: (r) => t(`unit.${s(r.unit)}`) },
        { label: t("a.md.listPrice"), render: (r) => money(Number(r.listPrice)), right: true },
        { label: t("a.inv.rop"), render: (r) => s(r.reorderPoint), right: true },
        { label: t("a.pr.supplier"), render: (r) => <span className="text-xs">{d.suppliers.find((x) => x.id === r.supplierId)?.name ?? "—"}</span> },
      ],
      fields: [
        { key: "ref", label: t("a.md.ref"), type: "text", required: true },
        { key: "gtin", label: `GTIN / ${t("a.inv.barcode")}`, type: "text", required: true },
        { key: "name", label: t("a.md.productName"), type: "text", required: true, span: true },
        { key: "category", label: t("a.md.category"), type: "select", options: categories.map((c) => ({ value: c, label: c })), required: true },
        { key: "unit", label: t("g.unit"), type: "select", options: UNITS.map((u) => ({ value: u, label: t(`unit.${u}`) })), required: true },
        { key: "listPrice", label: t("a.md.listPrice"), type: "number", required: true },
        { key: "reorderPoint", label: t("a.inv.rop"), type: "number", required: true },
        { key: "supplierId", label: t("a.pr.supplier"), type: "select", options: d.suppliers.map((x) => ({ value: x.id, label: x.name })), required: true, span: true },
      ],
      search: (r) => [r.name, r.ref, r.gtin, r.category].map(s).join(" "),
      blank: () => ({ id: ops.uid("p"), ref: "", name: "", category: categories[0] ?? "", unit: "piece", gtin: "", listPrice: 0, reorderPoint: 0, supplierId: d.suppliers[0]?.id ?? "" }),
      inUse: (dd, id) => dd.usage.some((u) => u.productId === id) || dd.lots.some((l) => l.productId === id),
      title: (r) => s(r.name),
    },
    suppliers: {
      icon: <Truck className="h-4 w-4" />,
      label: t("a.md.suppliers"),
      columns: [
        { label: t("a.pr.supplier"), render: (r) => <span className="font-medium text-slate-800">{s(r.name)}</span> },
        { label: t("a.md.email"), render: (r) => s(r.email) },
        { label: t("a.md.phone"), render: (r) => s(r.phone) },
        { label: t("a.md.taxId"), render: (r) => <span className="font-mono text-xs">{s(r.taxId)}</span> },
        { label: t("a.md.products"), render: (r) => d.products.filter((p) => p.supplierId === r.id).length, right: true },
      ],
      fields: [
        { key: "name", label: t("a.md.companyName"), type: "text", required: true, span: true },
        { key: "email", label: t("a.md.email"), type: "email", required: true },
        { key: "phone", label: t("a.md.phone"), type: "text" },
        { key: "taxId", label: t("a.md.taxId"), type: "text", span: true },
      ],
      search: (r) => [r.name, r.email, r.taxId].map(s).join(" "),
      blank: () => ({ id: ops.uid("sup"), name: "", email: "", phone: "", taxId: "" }),
      inUse: (dd, id) => dd.products.some((p) => p.supplierId === id),
      title: (r) => s(r.name),
    },
    priceLists: {
      icon: <Tag className="h-4 w-4" />,
      label: t("a.md.priceLists"),
      columns: [
        { label: t("g.hospital"), render: (r) => hName(r.hospitalId) },
        { label: t("g.product"), render: (r) => <span className="font-medium text-slate-800">{d.products.find((p) => p.id === r.productId)?.name ?? "—"}</span> },
        { label: t("a.md.listPrice"), render: (r) => money(d.products.find((p) => p.id === r.productId)?.listPrice ?? 0), right: true },
        { label: t("g.contractPrice"), render: (r) => <span className="font-semibold text-navy-800">{money(Number(r.contractPrice))}</span>, right: true },
        { label: t("a.md.valid"), render: (r) => <span className="whitespace-nowrap text-xs">{date(s(r.validFrom))} – {date(s(r.validTo))}</span> },
      ],
      fields: [
        { key: "hospitalId", label: t("g.hospital"), type: "select", options: hospOpts, required: true, span: true },
        { key: "productId", label: t("g.product"), type: "select", options: d.products.map((p) => ({ value: p.id, label: `${p.name} (${p.ref})` })), required: true, span: true },
        { key: "contractPrice", label: t("g.contractPrice"), type: "number", required: true, span: true },
        { key: "validFrom", label: t("a.md.validFrom"), type: "date", required: true },
        { key: "validTo", label: t("a.md.validTo"), type: "date", required: true },
      ],
      search: (r) => [hName(r.hospitalId), d.products.find((p) => p.id === r.productId)?.name].map(s).join(" "),
      blank: () => ({ id: ops.uid("pl"), hospitalId: "", productId: "", contractPrice: 0, validFrom: "2026-01-01", validTo: "2026-12-31" }),
      inUse: () => false,
      title: (r) => `${hName(r.hospitalId)} · ${d.products.find((p) => p.id === r.productId)?.name ?? ""}`,
    },
    users: {
      icon: <Users className="h-4 w-4" />,
      label: t("a.md.users"),
      columns: [
        {
          label: t("a.md.user"),
          render: (r) => (
            <div className="flex items-center gap-2.5">
              <Avatar user={d.users.find((u) => u.id === r.id)} size={30} />
              <div>
                <p className="font-medium text-slate-800">{s(lang === "th" ? r.nameTh || r.name : r.name)}</p>
                <p className="text-xs text-slate-500">{s(r.email)}</p>
              </div>
            </div>
          ),
        },
        { label: t("a.md.role"), render: (r) => <Badge tone={r.role === "SALES_REP" ? "sky" : r.role === "MANAGER" ? "amber" : "gray"}>{t(`role.${s(r.role)}`)}</Badge> },
        { label: t("a.md.phone"), render: (r) => s(r.phone) },
        {
          label: t("a.md.assigned"),
          render: (r) =>
            (r.hospitalIds as string[]).length ? (
              <div className="flex flex-wrap gap-1">
                {(r.hospitalIds as string[]).map((id) => (
                  <Badge key={id}>{d.hospitals.find((h) => h.id === id)?.code ?? id}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">{t("a.md.allHospitals")}</span>
            ),
        },
      ],
      fields: [
        { key: "name", label: t("a.md.nameEn"), type: "text", required: true },
        { key: "nameTh", label: t("a.md.nameTh"), type: "text", required: true },
        { key: "email", label: t("a.md.email"), type: "email", required: true },
        { key: "phone", label: t("a.md.phone"), type: "text" },
        { key: "role", label: t("a.md.role"), type: "select", options: ROLES.map((r) => ({ value: r, label: t(`role.${r}`) })), required: true, span: true },
        { key: "hospitalIds", label: t("a.md.assigned"), type: "multi", options: hospOpts, span: true },
      ],
      search: (r) => [r.name, r.nameTh, r.email, r.role].map(s).join(" "),
      blank: () => ({ id: ops.uid("u"), name: "", nameTh: "", email: "", phone: "", role: "SALES_REP", hospitalIds: [] }),
      inUse: (dd, id) => dd.cases.some((c) => c.repId === id) || useStore.getState().adminUserId === id || useStore.getState().mobileUserId === id,
      title: (r) => s(r.name),
    },
  };

  const cfg = CFG[tab];
  const all = d[tab] as unknown as Rec[];
  const k = q.trim().toLowerCase();
  const rows = k ? all.filter((r) => cfg.search(r).toLowerCase().includes(k)) : all;

  const save = (rec: Rec, isNew: boolean) => {
    const missing = cfg.fields.find((f) => f.required && (rec[f.key] === "" || rec[f.key] == null));
    if (missing) {
      toast.error(t("a.md.required", { f: missing.label }));
      return false;
    }
    run(ops.upsertMaster, tab, rec);
    toast.success(isNew ? t("a.md.added") : t("a.md.updated"), cfg.title(rec));
    return true;
  };

  return (
    <div>
      <PageHeader
        title={t("a.md.title")}
        subtitle={t("a.md.subtitle")}
        actions={
          <Button onClick={() => setEditing({ rec: cfg.blank(), isNew: true })}>
            <Plus className="h-4 w-4" /> {t("a.md.add", { what: cfg.label })}
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-3 lg:flex-row lg:items-end lg:justify-between">
          <Tabs
            className="border-b-0"
            value={tab}
            onChange={(v) => {
              setTab(v);
              setQ("");
            }}
            tabs={(Object.keys(CFG) as Col[]).map((c) => ({
              id: c,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {CFG[c].icon} {CFG[c].label}
                </span>
              ),
              count: (d[c] as unknown[]).length,
            }))}
          />
          <SearchBox value={q} onChange={setQ} placeholder={t("g.search")} icon={<Search className="h-4 w-4" />} className="mb-3 lg:w-72" />
        </div>
        {rows.length === 0 ? (
          <EmptyState title={q ? t("g.noResults") : t("g.noData")} />
        ) : (
          <TableWrap maxH="calc(100vh - 280px)">
            <thead>
              <tr>
                {cfg.columns.map((c) => (
                  <Th key={c.label} right={c.right}>
                    {c.label}
                  </Th>
                ))}
                <Th right>{t("g.actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={rowCls}>
                  {cfg.columns.map((c) => (
                    <Td key={c.label} right={c.right}>
                      {c.render(r)}
                    </Td>
                  ))}
                  <Td right>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ rec: structuredClone(r), isNew: false })} aria-label={t("g.edit")}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setDel(r)} aria-label={t("g.delete")}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {editing && (
        <EditModal
          key={editing.rec.id}
          title={editing.isNew ? t("a.md.add", { what: cfg.label }) : t("a.md.edit", { what: cfg.title(editing.rec) })}
          fields={cfg.fields}
          initial={editing.rec}
          onClose={() => setEditing(null)}
          onSave={(rec) => save(rec, editing.isNew) && setEditing(null)}
        />
      )}
      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title={t("a.md.deleteTitle")}
        desc={del ? t("a.md.deleteConfirm", { what: cfg.title(del) }) : null}
        confirmLabel={t("g.delete")}
        onConfirm={() => {
          if (!del) return;
          if (cfg.inUse(d, del.id)) {
            toast.error(t("a.md.inUse"), cfg.title(del));
            return;
          }
          run(ops.deleteMaster, tab, del.id);
          toast.success(t("a.md.deleted"), cfg.title(del));
        }}
      />
    </div>
  );
}

function EditModal({
  title,
  fields,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  fields: FieldDef[];
  initial: Rec;
  onClose: () => void;
  onSave: (r: Rec) => void;
}) {
  const { t } = useFmt();
  const [rec, setRec] = useState<Rec>(initial);
  const set = (k: string, v: unknown) => setRec((r) => ({ ...r, [k]: v }));

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("g.cancel")}
          </Button>
          <Button onClick={() => onSave(rec)}>{t("g.save")}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} required={f.required} className={f.span ? "sm:col-span-2" : ""}>
            {f.type === "select" ? (
              <Select value={s(rec[f.key])} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">{t("g.pleaseSelect")}</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === "textarea" ? (
              <Textarea value={s(rec[f.key])} onChange={(e) => set(f.key, e.target.value)} className="min-h-[64px]" />
            ) : f.type === "multi" ? (
              <div className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                {f.options?.map((o) => {
                  const arr = (rec[f.key] as string[]) ?? [];
                  const on = arr.includes(o.value);
                  return (
                    <span key={o.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => set(f.key, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      {o.label}
                    </span>
                  );
                })}
              </div>
            ) : f.type === "palette" ? (
              <div className="flex flex-wrap items-center gap-2">
                {PALETTES.map((p) => {
                  const cur = rec[f.key] as [string, string];
                  const on = cur?.[0] === p[0];
                  return (
                    <button
                      type="button"
                      key={p[0]}
                      onClick={() => set(f.key, p)}
                      className={cx("h-9 w-9 rounded-xl ring-2 ring-offset-2 transition", on ? "ring-brand-600" : "ring-transparent hover:ring-slate-200")}
                      style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }}
                      aria-label={p[0]}
                    />
                  );
                })}
                <HospitalArt palette={(rec[f.key] as [string, string]) ?? PALETTES[0]} className="ml-auto h-12 w-20 rounded-lg" />
              </div>
            ) : (
              <Input
                type={f.type}
                value={s(rec[f.key])}
                onChange={(e) => set(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                step={f.type === "number" ? "any" : undefined}
              />
            )}
          </Field>
        ))}
      </div>
    </Modal>
  );
}
