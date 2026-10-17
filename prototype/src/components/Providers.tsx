"use client";

import { useEffect, type ReactNode } from "react";
import { onStorageSync, useStore } from "@/lib/store";
import { DocViewer } from "./DocViewer";
import { Toaster } from "./toast";

export function Providers({ children }: { children: ReactNode }) {
  const hydrate = useStore((s) => s.hydrate);
  const lang = useStore((s) => s.lang);
  useEffect(() => {
    hydrate();
    window.addEventListener("storage", onStorageSync);
    return () => window.removeEventListener("storage", onStorageSync);
  }, [hydrate]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <>
      {children}
      <DocViewer />
      <Toaster />
    </>
  );
}

/** Renders children only after localStorage has been read (prevents hydration mismatches). */
export function Hydrated({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  return <>{hydrated ? children : fallback}</>;
}
