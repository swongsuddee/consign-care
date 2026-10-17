"use client";

import { create } from "zustand";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { useDocViewer } from "./DocViewer";
import { cx } from "./ui";

type Kind = "success" | "error" | "info" | "warning";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  desc?: string;
}

const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** toast.success("Saved", "optional description") – callable from anywhere */
export const toast = {
  success: (title: string, desc?: string) => useToasts.getState().push({ kind: "success", title, desc }),
  error: (title: string, desc?: string) => useToasts.getState().push({ kind: "error", title, desc }),
  info: (title: string, desc?: string) => useToasts.getState().push({ kind: "info", title, desc }),
  warning: (title: string, desc?: string) => useToasts.getState().push({ kind: "warning", title, desc }),
};

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <XCircle className="h-5 w-5 text-rose-500" />,
  info: <Info className="h-5 w-5 text-brand-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  // while a document is open its toolbar is at the top, so toasts move to the bottom
  const docOpen = useDocViewer((s) => !!s.open);
  return (
    <div
      className={cx(
        "pointer-events-none fixed inset-x-0 z-[110] flex flex-col items-center gap-2 px-3 sm:items-end sm:right-4 sm:left-auto",
        docOpen ? "bottom-4" : "top-3",
      )}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-xl animate-slide-down",
            t.kind === "error" ? "border-rose-100" : "border-slate-100",
          )}
        >
          <div className="mt-0.5">{icons[t.kind]}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{t.title}</p>
            {t.desc && <p className="mt-0.5 text-xs text-slate-500">{t.desc}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-slate-300 hover:text-slate-500" aria-label="dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
