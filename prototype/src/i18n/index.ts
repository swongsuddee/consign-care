"use client";

import { useCallback } from "react";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import type { Dict } from "./types";
import { common } from "./common";
import { landing } from "./landing";
import { mobile } from "./mobile";
import { admin } from "./admin";

const dict: Dict = { ...common, ...landing, ...mobile, ...admin };

export function translate(lang: Lang, key: string, params?: Record<string, string | number>) {
  const entry = dict[key];
  let s = entry ? entry[lang] : key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export type TFn = (key: string, params?: Record<string, string | number>) => string;

/** `const { t, lang } = useT()` */
export function useT() {
  const lang = useStore((s) => s.lang);
  const t: TFn = useCallback((key, params) => translate(lang, key, params), [lang]);
  return { t, lang };
}
