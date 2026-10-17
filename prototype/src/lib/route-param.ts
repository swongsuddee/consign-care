"use client";

import { useSearchParams } from "next/navigation";
import { FALLBACK } from "./static-params-shared";

/** A route segment, or on the static site's fallback page ("_"), the real value forwarded in the query. */
export function useRouteParam(name: string, value: string) {
  const q = useSearchParams();
  return value === FALLBACK ? (q.get(name) ?? value) : value;
}
