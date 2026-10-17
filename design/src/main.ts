import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Project, emptyBuild, emptyDevSecOps, emptyAiSettings, emptyRevisions, type DesignSystem, type Project as P } from "../../../truss/src/lib/model";
import { acceptProposals } from "../../../truss/src/lib/uiToClass";
import { lint } from "../../../truss/src/lib/lint";
import { actors, associations, features, flows, relations, useCases } from "./spec";
import { entities, relationships, stateMachines } from "./data";
import { screens, swimlanes } from "./ui";
import { approach, classes, classRelations, components, dependencies, nfrTests, sequences, stack } from "./build";
import { canvas, discovery, outcomes } from "./stage0";
import { brandFiles, sha256 } from "./brand";
import { zip } from "../../../truss/src/lib/zip";

const designSystem: DesignSystem = {
  presetId: null,
  principles: [
    { id: "dp1", text: "One glance tells the status — every case shows where it is in the journey." },
    { id: "dp2", text: "Thumb-first on the phone; keyboard-first in the back-office." },
    { id: "dp3", text: "Confirm, don't type: the system proposes, the person checks." },
    { id: "dp4", text: "Thai first, English available — business terms as the hospital uses them." },
  ],
  voice: [
    { id: "dv1", kind: "do", text: "Use the document names hospitals use: ใบเสนอราคา, ใบขอซื้อ, ใบเบิก, ใบแจ้งหนี้." },
    { id: "dv2", kind: "do", text: "Say what happened and what's next: “บันทึก PO แล้ว — รอเบิกสินค้า” (PO saved — waiting for requisition)." },
    { id: "dv3", kind: "dont", text: "Don't blame the user: not “Invalid PO”, but “ไม่พบ PO นี้ — ตรวจเลขที่อีกครั้ง” (PO not found — check the number)." },
    { id: "dv4", kind: "dont", text: "Don't show patient HN in lists or notifications." },
  ],
  light: { background: "#f4f7fc", surface: "#ffffff", text: "#0f1d33", textMuted: "#4a5872", primary: "#1d4ed8", onPrimary: "#ffffff", border: "#d5deeb", error: "#b91c1c", success: "#15803d", warning: "#a16207" },
  dark: { background: "#0a1222", surface: "#111c33", text: "#e8eef8", textMuted: "#9fb0cb", primary: "#7aa7ff", onPrimary: "#0a1222", border: "#25324d", error: "#f87171", success: "#4ade80", warning: "#fbbf24" },
  fonts: { display: "IBM Plex Sans Thai", body: "Noto Sans Thai", mono: "JetBrains Mono" },
  type: [
    { id: "ty1", name: "Display", size: 28, line: 36, weight: 700, font: "display" },
    { id: "ty2", name: "Title", size: 20, line: 28, weight: 600, font: "display" },
    { id: "ty3", name: "Body", size: 16, line: 24, weight: 400, font: "body" },
    { id: "ty4", name: "Label", size: 14, line: 20, weight: 500, font: "body" },
    { id: "ty5", name: "Caption", size: 12, line: 16, weight: 400, font: "body" },
    { id: "ty6", name: "Code", size: 14, line: 20, weight: 400, font: "mono" },
  ],
  spacing: [4, 8, 12, 16, 24, 32, 48],
  radius: { sm: 6, md: 12, lg: 20 },
  breakpoints: [
    { id: "bp1", name: "Phone", min: 0 },
    { id: "bp2", name: "Tablet", min: 768 },
    { id: "bp3", name: "Desktop", min: 1200 },
  ],
  navigation: {
    phone: "Bottom tab bar: Home, Accounts, Scan (raised centre button), Usage, Cases. Navy header with back arrow and title.",
    wide: "Left sidebar grouped Sales / Supply / Billing / Admin; top bar with search, TH/EN switch, notifications and user menu.",
  },
  components: [
    { id: "dc1", name: "Button", classId: null, states: ["default", "hover", "focus", "disabled", "loading"], note: "Primary blue, secondary outline, destructive red." },
    { id: "dc2", name: "Text field", classId: null, states: ["default", "focus", "disabled", "error"], note: "" },
    { id: "dc3", name: "Select", classId: null, states: ["default", "focus", "disabled", "error", "empty"], note: "" },
    { id: "dc4", name: "Stat tile", classId: null, states: ["default", "loading", "empty", "error"], note: "Tinted cards: blue, green, orange, purple." },
    { id: "dc5", name: "Status chip", classId: null, states: ["default", "hover", "focus", "disabled", "loading"], note: "One colour per case status." },
    { id: "dc6", name: "Case timeline", classId: null, states: ["default", "loading", "empty"], note: "Done ✓ green, current amber, pending grey." },
    { id: "dc7", name: "Barcode scanner", classId: null, states: ["default", "hover", "focus", "loading", "error", "empty"], note: "Always offers manual entry." },
    { id: "dc8", name: "Photo uploader", classId: null, states: ["default", "loading", "error"], note: "Queues offline." },
    { id: "dc11", name: "Card", classId: null, states: ["default", "hover", "focus", "loading", "empty", "error"], note: "White surface, 12px radius, soft shadow." },
    { id: "dc12", name: "Badge", classId: null, states: ["default"], note: "Counts on tabs and the bell." },
    { id: "dc9", name: "Table", classId: null, states: ["default", "loading", "empty", "error"], note: "" },
    { id: "dc10", name: "Toast", classId: null, states: ["default"], note: "Success / error, 4 s." },
  ],
  a11y: {},
  heuristics: {},
};

const design: P = Project.parse({
  id: "prj-consigncare",
  name: "ConsignCare",
  domain: "Medical-device consignment: case usage to billing, inventory and procurement",
  schemaVersion: 1,
  features, actors, useCases, associations, relations, flows,
  testOverrides: {},
  entities, relationships, stateMachines,
  components, dependencies,
  classes, classRelations,
  sequences, swimlanes, screens,
  stack, approach,
  revisions: emptyRevisions(),
  dismissedProposals: [],
  build: emptyBuild(),
  outcomes, canvas, discovery,
  designSystem,
  assets: {
    library: {
      "logo.mark": { file: null, note: "Square mark for the sign-in screen and PWA icon" },
      "logo.horizontal": { file: null, note: "Header of quotation / PR / invoice PDFs" },
      "hero.hospital": { file: null, note: "Account detail header — a hospital photo per account, falls back to an illustration" },
      "icon.192": { file: null, note: "PWA icon" },
      "icon.512": { file: null, note: "PWA icon" },
    },
    content: { "photo-file_url": { aspect: "3:4", maxKb: 4000, altRule: "Usage sheet for case <case no>" } },
  },
  devsecops: emptyDevSecOps(),
  ai: emptyAiSettings(),
  nfrTests,
  suites: {},
  wireframes: {},
  commonDismissed: [],
});

// A screen that lists states must render every state of the journey that owns it.
for (const screen of design.screens) {
  if (!screen.statesShown.length) continue;
  const owning = Object.values(design.swimlanes).find((f) => screen.stepIds.some((id) => f.steps.some((s) => s.id === id)));
  const rows = owning?.entityId ? owning.lanes.filter((l) => l.stateNodeId).map((l) => l.label) : [];
  screen.statesShown = [...new Set([...screen.statesShown, ...rows])];
}

// The payment button is answered by BillingService.recordPayment.
design.classes.find((c) => c.id === "k-billsvc")!.methods.find((x) => x.name.startsWith("recordPayment"))!.serves = ["w6-4"];

// Stage 8, interface layer: let Truss derive the UI component tree from the screens.
acceptProposals(design);
const final = Project.parse(design);

async function main() {
  // Brand images: recorded on their keys in the design, carried as files in the Truss zip.
  const brand = await brandFiles();
  for (const b of brand)
    final.assets.library[b.key] = {
      file: { fileId: sha256(b.bytes), name: b.name, type: b.type, bytes: b.bytes.length, width: b.width, height: b.height, alt: b.alt },
      note: b.note,
    };
  const checked = Project.parse(final);

  const findings = lint(checked);
  const out = join(__dirname, "..");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "consigncare.design.json"), JSON.stringify(checked, null, 2));
  writeFileSync(join(out, "findings.json"), JSON.stringify(findings, null, 2));

  const folder = "consigncare-v1-assets";
  const ext: Record<string, string> = { "image/svg+xml": "svg", "image/png": "png" };
  const manifest = {
    truss: "assets", product: "ConsignCare", version: "v1", exportedAt: new Date().toISOString(),
    assets: brand.map((b) => ({ key: b.key, file: `images/${b.key}.${ext[b.type]}`, name: b.name, type: b.type, width: b.width, height: b.height, alt: b.alt, note: b.note, usedOn: [], library: "" })),
  };
  const bytes = zip([
    { name: "design.json", body: JSON.stringify(checked, null, 2) },
    { name: `${folder}/assets.json`, body: JSON.stringify(manifest, null, 2) + "\n" },
    ...brand.map((b) => ({ name: `${folder}/images/${b.key}.${ext[b.type]}`, body: b.bytes })),
  ]);
  writeFileSync(join(out, "consigncare.truss.zip"), bytes);
  mkdirSync(join(out, "brand"), { recursive: true });
  for (const b of brand) writeFileSync(join(out, "brand", `${b.key}.${ext[b.type]}`), b.bytes);

  const by = (s: string) => findings.filter((f) => f.severity === s);
  console.log(`conflict ${by("conflict").length} · advisory ${by("advisory").length} · info ${by("info").length}`);
  const counts: Record<string, number> = {};
  for (const f of findings) counts[`${f.severity}:${f.code}`] = (counts[`${f.severity}:${f.code}`] ?? 0) + 1;
  console.log(Object.entries(counts).sort().map(([k, v]) => `${k} ×${v}`).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
