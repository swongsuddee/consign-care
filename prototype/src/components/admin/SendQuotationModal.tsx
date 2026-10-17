"use client";

import { FileText, Mail, Paperclip, Send, Users } from "lucide-react";
import { toast } from "@/components/toast";
import { Button, Modal } from "@/components/ui";
import * as ops from "@/lib/ops";
import { useFmt } from "@/lib/format";
import { name } from "@/lib/selectors";
import { useData, useOp, useStore } from "@/lib/store";
import { COMPANY } from "@/components/DocumentSheet";

/** Email / LINE preview → simulated send of a quotation */
export function SendQuotationModal({
  quotationId,
  channel,
  onClose,
}: {
  quotationId: string;
  channel: "EMAIL" | "LINE" | null;
  onClose: () => void;
}) {
  const { t, lang, money, date } = useFmt();
  const d = useData();
  const run = useOp();
  const q = d.quotations.find((x) => x.id === quotationId);
  if (!q) return null;
  const h = d.hospitals.find((x) => x.id === q.hospitalId);
  const c = d.cases.find((x) => x.id === q.caseId);
  const me = d.users.find((u) => u.id === useStore.getState().adminUserId);

  const send = () => {
    if (!channel) return;
    const ok = run(ops.sendQuotation, q.id, channel);
    if (!ok) {
      toast.error(t("a.send.failed"));
      return;
    }
    const po = useStore.getState().data.incomingPos.find((p) => p.quotationNo === q.no);
    toast.success(t("a.send.sent"), po ? t("a.send.replied", { poNo: po.poNo, channel: channel === "EMAIL" ? "Email" : "LINE" }) : undefined);
    onClose();
  };

  const file = `${q.no}.pdf`;

  return (
    <Modal
      open={!!channel}
      onClose={onClose}
      size="lg"
      title={channel === "EMAIL" ? t("a.send.emailTitle") : t("a.send.lineTitle")}
      footer={
        <>
          <span className="mr-auto self-center text-xs text-slate-400">{t("a.send.simNote")}</span>
          <Button variant="outline" onClick={onClose}>
            {t("g.cancel")}
          </Button>
          <Button onClick={send} className={channel === "LINE" ? "!bg-[#06C755] hover:!bg-[#05b14c]" : ""}>
            <Send className="h-4 w-4" /> {t("a.send.confirm")}
          </Button>
        </>
      }
    >
      {channel === "EMAIL" && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="space-y-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <Row label={t("a.send.from")}>{COMPANY.email}</Row>
            <Row label={t("a.send.to")}>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{h?.contactEmail}</span>
            </Row>
            <Row label={t("a.send.cc")}>{me?.email}</Row>
            <Row label={t("a.send.subject")}>
              <span className="font-semibold text-slate-800">
                ใบเสนอราคา {q.no} – {COMPANY.nameTh}
                {c ? ` (เคส ${c.no})` : ""}
              </span>
            </Row>
          </div>
          <div className="space-y-3 px-4 py-4 text-sm leading-relaxed text-slate-700">
            <p>เรียน ฝ่ายจัดซื้อ {h?.nameTh}</p>
            <p>
              บริษัทฯ ขอส่งใบเสนอราคาเลขที่ <b>{q.no}</b> ลงวันที่ {date(q.date)} สำหรับสินค้าฝากขาย (Consignment) ที่ใช้ในหัตถการ
              {c ? ` เคส ${c.no}` : ""} จำนวน {q.items.length} รายการ ยอดรวมทั้งสิ้น <b>{money(q.total)}</b> (รวมภาษีมูลค่าเพิ่มแล้ว)
              ยืนราคาถึงวันที่ {date(q.validUntil)}
            </p>
            <p>หากเห็นชอบ กรุณาส่งใบสั่งซื้อ (PO) กลับมาทางอีเมลนี้ หรือทาง LINE กลุ่มจัดซื้อ</p>
            <p>
              ขอแสดงความนับถือ
              <br />
              {me ? name(me, "th") : ""} · {COMPANY.nameTh}
              <br />
              โทร {COMPANY.phone}
            </p>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{file}</p>
                <p className="text-[11px] text-slate-500">PDF · 182 KB</p>
              </div>
              <Paperclip className="ml-2 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      )}

      {channel === "LINE" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 bg-[#06C755] px-4 py-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t("a.send.lineGroup", { h: name(h, lang) })}</p>
              <p className="text-[11px] text-white/80">{h?.lineGroupId}</p>
            </div>
          </div>
          <div className="space-y-3 bg-[#8CABD9]/40 px-4 py-5">
            <p className="mx-auto w-fit rounded-full bg-black/10 px-3 py-0.5 text-[11px] text-slate-600">{t("g.today")}</p>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#06C755] px-3.5 py-2.5 text-sm text-white shadow-sm">
              สวัสดีค่ะ ฝ่ายจัดซื้อ {h?.nameTh} 🙏 ส่งใบเสนอราคา {q.no}
              {c ? ` สำหรับเคส ${c.no}` : ""} ยอดรวม {money(q.total)} รบกวนพิจารณาและส่ง PO กลับมาได้เลยค่ะ
            </div>
            <div className="ml-auto w-64 overflow-hidden rounded-2xl rounded-tr-sm bg-white shadow-sm">
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{file}</p>
                  <p className="text-[11px] text-slate-500">PDF · 182 KB</p>
                </div>
              </div>
              <div className="border-t border-slate-100 px-3 py-2 text-center text-xs font-medium text-[#06C755]">{t("a.send.openFile")}</div>
            </div>
            <p className="text-right text-[10px] text-slate-500">{t("a.send.read")}</p>
          </div>
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Mail className="h-3.5 w-3.5" /> {t("a.send.afterNote")}
      </p>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-16 shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 truncate text-slate-700">{children}</span>
    </div>
  );
}
