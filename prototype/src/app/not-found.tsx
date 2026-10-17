import Link from "next/link";
import { BASE } from "@/lib/base";

/**
 * Records created in the browser have no pre-rendered page on the static site, so GitHub Pages serves this page (404.html)
 * for them. The script forwards to the route's "_" page with the real values in the query; anything else stays a 404.
 */
const ROUTES = [
  "m/cases/:id",
  "m/products/:id",
  "m/accounts/:id",
  "admin/cases/:id",
  "admin/quotations/:id",
  "admin/requisitions/:id",
  "admin/purchase-requests/:id",
  "print/:kind/:id",
];

const forward = `(function () {
  var base = ${JSON.stringify(BASE)}, path = location.pathname;
  if (path.indexOf(base) !== 0) return;
  var segs = path.slice(base.length).split("/").filter(Boolean);
  ${JSON.stringify(ROUTES)}.forEach(function (r) {
    var parts = r.split("/");
    if (parts.length !== segs.length) return;
    var q = new URLSearchParams(location.search), out = [], ok = true, dyn = false;
    parts.forEach(function (p, i) {
      if (p.charAt(0) === ":") { if (segs[i] !== "_") dyn = true; q.set(p.slice(1), decodeURIComponent(segs[i])); out.push("_"); }
      else if (p !== segs[i]) ok = false;
      else out.push(p);
    });
    if (ok && dyn) location.replace(base + "/" + out.join("/") + "/?" + q.toString() + location.hash);
  });
})();`;

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <script dangerouslySetInnerHTML={{ __html: forward }} />
      <div>
        <p className="text-5xl font-bold text-navy-800">404</p>
        <p className="mt-2 text-sm text-slate-500">This page does not exist. · ไม่พบหน้านี้</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
          ConsignCare
        </Link>
      </div>
    </div>
  );
}
