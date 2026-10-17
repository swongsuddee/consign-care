"use client";

import { create } from "zustand";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import type { Data, Lang, OcrDraft } from "./types";
import * as db from "./db";
import { buildSeed } from "./seed";

const PREFS = "consigncare:prefs";

interface Prefs {
  lang: Lang;
  mobileUserId: string;
  adminUserId: string;
  mobileSignedIn: boolean;
}

interface State extends Prefs {
  data: Data;
  hydrated: boolean;
  ocrDraft?: OcrDraft;
  setLang: (l: Lang) => void;
  setMobileUser: (id: string) => void;
  setAdminUser: (id: string) => void;
  setMobileSignedIn: (v: boolean) => void;
  setOcrDraft: (d?: OcrDraft) => void;
  /** Clone data, apply a mutation, commit, return the mutation's result */
  mutate: <R>(fn: (d: Data) => R) => R;
  /** Swap in a whole database (backup import) */
  replace: (d: Data) => void;
  reset: () => void;
  hydrate: () => void;
}

const DEFAULT_PREFS: Prefs = {
  lang: "th",
  mobileUserId: "u-sinenart",
  adminUserId: "u-kanya",
  mobileSignedIn: false,
};

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, v: string) {
  try {
    window.localStorage.setItem(key, v);
  } catch {
    /* storage unavailable – demo still works in memory */
  }
}

function savePrefs(s: Prefs) {
  const { lang, mobileUserId, adminUserId, mobileSignedIn } = s;
  safeSet(PREFS, JSON.stringify({ lang, mobileUserId, adminUserId, mobileSignedIn }));
}

export const useStore = create<State>((set, get) => ({
  ...DEFAULT_PREFS,
  data: buildSeed(),
  hydrated: false,
  ocrDraft: undefined,
  setLang: (lang) => {
    set({ lang });
    savePrefs(get());
  },
  setMobileUser: (mobileUserId) => {
    set({ mobileUserId });
    savePrefs(get());
  },
  setAdminUser: (adminUserId) => {
    set({ adminUserId });
    savePrefs(get());
  },
  setMobileSignedIn: (mobileSignedIn) => {
    set({ mobileSignedIn });
    savePrefs(get());
  },
  setOcrDraft: (ocrDraft) => {
    set({ ocrDraft });
    db.draft.save(ocrDraft);
  },
  mutate: (fn) => {
    const draft = structuredClone(get().data);
    const result = fn(draft);
    db.save(draft); // commit to localStorage first, so anything re-rendering reads the stored state
    set({ data: draft });
    return result;
  },
  replace: (data) => {
    db.save(data, true);
    set({ data });
  },
  reset: () => {
    const data = buildSeed();
    db.clear();
    db.save(data, true);
    set({ data, ocrDraft: undefined });
  },
  hydrate: () => {
    const data = db.load();
    let prefs = DEFAULT_PREFS;
    const raw = safeGet(PREFS);
    if (raw) {
      try {
        prefs = { ...DEFAULT_PREFS, ...JSON.parse(raw) };
      } catch {
        /* ignore */
      }
    }
    const ocrDraft = db.draft.load();
    if (data) set({ data, ocrDraft, ...prefs, hydrated: true });
    else {
      db.save(get().data, true);
      set({ ocrDraft, ...prefs, hydrated: true });
    }
  },
}));

/** Keep several open tabs (mobile + back-office) in sync during a live demo */
export function onStorageSync(e: StorageEvent) {
  // another tab committed: the meta record is written last, so every table is already in place
  if (e.key === db.META_KEY) {
    const d = db.load();
    if (d) useStore.setState({ data: d });
  } else if (e.key === PREFS && e.newValue) {
    try {
      useStore.setState(JSON.parse(e.newValue));
    } catch {
      /* ignore */
    }
  }
}

export const useData = () => useStore((s) => s.data);
export const useLang = () => useStore((s) => s.lang);

/** Current actor: the mobile persona under /m, the back-office persona elsewhere */
export function useActorId() {
  const path = usePathname() ?? "";
  const mobile = useStore((s) => s.mobileUserId);
  const admin = useStore((s) => s.adminUserId);
  return path.startsWith("/m") ? mobile : admin;
}

export function useCurrentUser() {
  const id = useActorId();
  const users = useStore((s) => s.data.users);
  return users.find((u) => u.id === id) ?? users[0];
}

/**
 * Bind an op from ops.ts to the store and current actor:
 *   const run = useOp(); run(ops.createCase, input)
 */
export function useOp() {
  const actor = useActorId();
  const mutate = useStore((s) => s.mutate);
  return useCallback(
    <A extends unknown[], R>(fn: (d: Data, actor: string, ...args: A) => R, ...args: A): R =>
      mutate((d) => fn(d, actor, ...args)),
    [actor, mutate],
  );
}
