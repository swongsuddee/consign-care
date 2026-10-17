import { buildSeed } from "./seed";
import { FALLBACK } from "./static-params-shared";
import type { Data } from "./types";

/**
 * Pages pre-rendered for a static build: one per seeded record, plus "_", the page that shows records created in the
 * browser later. GitHub Pages answers those with 404.html, which forwards to "_" with the real id in the query
 * (see public/404.html and useRouteParam).
 */

let seed: Data | undefined;
export function staticIds(table: "cases" | "products" | "hospitals" | "quotations" | "requisitions" | "purchaseRequests") {
  seed ??= buildSeed();
  return [...seed[table].map((x) => ({ id: x.id })), { id: FALLBACK }];
}

export function staticDocs() {
  seed ??= buildSeed();
  const kinds: [string, { id: string }[]][] = [
    ["quotation", seed.quotations],
    ["pr", seed.purchaseRequests],
    ["invoice", seed.invoices],
    ["requisition", seed.requisitions],
  ];
  return [...kinds.flatMap(([kind, rows]) => rows.map((r) => ({ kind, id: r.id }))), { kind: FALLBACK, id: FALLBACK }];
}
