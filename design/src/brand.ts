import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";

/** The ConsignCare brand: a navy tile with a white "C" that closes on a blue check — usage confirmed. */
const NAVY = "#0f2d5c";
const BLUE = "#2563eb";
const SKY = "#7aa7ff";

const mark = (bg: string, fg: string, accent: string) => `
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  <path d="M44 20.5A16 16 0 1 0 44 43.5" fill="none" stroke="${fg}" stroke-width="7" stroke-linecap="round"/>
  <path d="M33 32l5 5 10-11" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;

const svg = (w: number, h: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>\n`;
const word = (fill: string, sub: string) => `
  <text x="80" y="38" font-family="'IBM Plex Sans Thai','Noto Sans Thai',Arial,sans-serif" font-size="30" font-weight="700" fill="${fill}">Consign<tspan fill="${BLUE}">Care</tspan></text>
  <text x="81" y="57" font-family="'Noto Sans Thai',Arial,sans-serif" font-size="12.5" fill="${sub}" letter-spacing=".4">Case to Billing · All in one place</text>`;

const hero = svg(800, 300, `
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${BLUE}"/></linearGradient></defs>
  <rect width="800" height="300" fill="url(#g)"/>
  <g fill="#ffffff" fill-opacity=".12"><circle cx="680" cy="40" r="120"/><circle cx="90" cy="300" r="90"/></g>
  <g transform="translate(250 70)" fill="#ffffff">
    <rect x="0" y="40" width="300" height="170" rx="8" fill-opacity=".95"/>
    <rect x="110" y="0" width="80" height="60" rx="6" fill-opacity=".95"/>
    <rect x="138" y="12" width="24" height="36" fill="${BLUE}"/><rect x="128" y="22" width="44" height="16" fill="${BLUE}"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${24 + (i % 6) * 44}" y="${66 + Math.floor(i / 6) * 50}" width="26" height="26" rx="3" fill="${SKY}"/>`).join("")}
    <rect x="128" y="160" width="44" height="50" rx="3" fill="${NAVY}"/>
  </g>`);

const og = svg(1200, 630, `
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${BLUE}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g transform="translate(100 150) scale(2.6)">${mark("#ffffff", NAVY, BLUE)}</g>
  <text x="300" y="250" font-family="Arial,sans-serif" font-size="88" font-weight="700" fill="#ffffff">ConsignCare</text>
  <text x="304" y="320" font-family="Arial,sans-serif" font-size="36" fill="#dbe7ff">From case to billing, all in one place.</text>
  <text x="304" y="380" font-family="Arial,sans-serif" font-size="26" fill="#b9cdf5">Capture usage · Quotation · PO · Requisition · Billing</text>`);

export type BrandFile = { key: string; name: string; type: string; width: number; height: number; alt: string; note: string; bytes: Uint8Array };

const enc = (s: string) => new TextEncoder().encode(s);

export async function brandFiles(): Promise<BrandFile[]> {
  const files: Omit<BrandFile, "bytes">[] = [];
  const out: BrandFile[] = [];
  const add = (key: string, w: number, h: number, body: string, alt: string, note: string) =>
    out.push({ key, name: `${key}.svg`, type: "image/svg+xml", width: w, height: h, alt, note, bytes: enc(svg(w, h, body)) });

  add("logo.mark", 64, 64, mark(NAVY, "#ffffff", SKY), "ConsignCare", "Sign-in, PWA icon source, collapsed header");
  add("logo.horizontal", 340, 72, `<g transform="translate(4 4)">${mark(NAVY, "#ffffff", SKY)}</g>${word(NAVY, "#4a5872")}`, "ConsignCare", "Back-office header and PDF documents");
  add("logo.reversed", 340, 72, `<rect width="340" height="72" fill="${NAVY}"/><g transform="translate(4 4)">${mark("#ffffff", NAVY, BLUE)}</g>${word("#ffffff", "#b9cdf5")}`, "ConsignCare", "Navy headers, dark mode");
  add("logo.mono", 340, 72, `<g transform="translate(4 4)">${mark("#000000", "#ffffff", "#ffffff")}</g><text x="80" y="44" font-family="Arial,sans-serif" font-size="30" font-weight="700">ConsignCare</text>`, "ConsignCare", "Print and stamps");
  add("icon.favicon", 64, 64, mark(NAVY, "#ffffff", SKY), "", "Browser tab");
  out.push({ key: "hero.hospital", name: "hero.hospital.svg", type: "image/svg+xml", width: 800, height: 300, alt: "Hospital building illustration", note: "Account detail header when the hospital has no photo", bytes: enc(hero) });
  void files;

  // The two that platforms demand as PNG are rasterised with Truss's own Playwright Chromium.
  const req = createRequire(join(__dirname, "../../../truss/package.json"));
  const { chromium } = req("playwright") as typeof import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const png = async (markup: string, w: number, h: number) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0">${markup}</body></html>`);
    return new Uint8Array(await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: w, height: h } }));
  };
  out.push({ key: "icon.512", name: "icon.512.png", type: "image/png", width: 512, height: 512, alt: "", note: "PWA install icon (maskable)", bytes: await png(svg(512, 512, `<rect width="512" height="512" fill="${NAVY}"/><g transform="translate(76 76) scale(5.625)">${mark(NAVY, "#ffffff", SKY)}</g>`), 512, 512) });
  out.push({ key: "share.og", name: "share.og.png", type: "image/png", width: 1200, height: 630, alt: "ConsignCare — from case to billing, all in one place", note: "Link previews in LINE and email", bytes: await png(og, 1200, 630) });
  await browser.close();
  return out;
}

export const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
