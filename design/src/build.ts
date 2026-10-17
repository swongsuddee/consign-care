import type { Approach, ClassMember, ClassNode, ClassRelation, Component, Dependency, Lifeline, Message, NfrTest, SequenceDiagram, StackChoice } from "../../../truss/src/lib/model";

/* ==================================================== stage 5: architecture */

const C = (id: string, name: string, kind: Component["kind"], technology: string, description: string, realises: string[], x: number, y: number, actorId: string | null = null): Component => ({ id, name, kind, technology, description, realises, actorId, x, y });

const REP_UC = ["uc-signin", "uc-dashboard", "uc-new-case", "uc-ocr", "uc-scan", "uc-cancel", "uc-history", "uc-followup"];
const WEB_UC = ["uc-signin", "uc-dashboard", "uc-quote", "uc-approve", "uc-po", "uc-req", "uc-pr", "uc-receive", "uc-search", "uc-expiry", "uc-bill", "uc-master", "uc-cancel", "uc-new-case"];

export const components: Component[] = [
  C("cmp-pwa", "Sales Rep App", "client", "Next.js 15 PWA", "Mobile-first PWA: cases, OCR capture, barcode scan, accounts, case journey. Installs to the home screen; queues photos while offline.", REP_UC, 40, 80),
  C("cmp-web", "Back-office Web", "client", "Next.js 15", "Desktop web for admin, manager, warehouse, purchasing, accounting and system admin.", WEB_UC, 40, 320),
  C("cmp-api", "ConsignCare API", "service", "NestJS 11 · modular monolith", "One deployable with modules: cases, sales (quotation, PO), supply (stock, requisition, PR), billing, identity, master data. Owns every state machine.", ["uc-signin", "uc-dashboard", "uc-new-case", "uc-scan", "uc-cancel", "uc-history", "uc-quote", "uc-approve", "uc-po", "uc-req", "uc-pr", "uc-receive", "uc-search", "uc-expiry", "uc-bill", "uc-master"], 380, 200),
  C("cmp-worker", "Job Worker", "service", "NestJS 11 + BullMQ", "Background jobs: OCR extraction, notifications (email, LINE), quotation expiry, invoice overdue, nightly reorder suggestions.", ["uc-ocr", "uc-followup"], 720, 360),
  C("cmp-docs", "Document Renderer", "service", "Playwright Chromium + exceljs", "Renders Thai-language quotation, purchase request and invoice PDFs from HTML templates; Excel exports.", ["uc-quote", "uc-pr", "uc-bill"], 720, 40),
  C("cmp-db", "Core DB", "datastore", "PostgreSQL 16", "System of record. Stock ledger is append-only; balances are derived and checked nightly.", [], 380, 520),
  C("cmp-queue", "Job Queue", "queue", "BullMQ on Redis", "Durable job queue between API and worker.", ["uc-ocr", "uc-followup", "uc-quote", "uc-bill"], 720, 560),
  C("cmp-files", "File Store", "datastore", "Amazon S3", "Usage photos, generated PDFs and uploaded hospital POs. Private bucket; signed URLs from the API only.", [], 1060, 200),
  C("cmp-ocr", "OCR Service", "external", "Claude vision (claude-opus-5-5)", "Reads usage sheets: patient stickers (HN, AN, doctor code) and the REF LOT SERIAL printed under each equipment barcode, grouped by patient, with confidence.", [], 1060, 400, "act-ocr"),
  C("cmp-line", "LINE Messaging", "external", "LINE Messaging API", "Pushes documents to hospital LINE groups and alerts to reps.", [], 1060, 520, "act-line"),
  C("cmp-email", "Email Service", "external", "Amazon SES", "Transactional email with PDF attachments.", [], 1060, 640, "act-email"),
  C("cmp-sso", "SSO Provider", "external", "Auth.js with Microsoft Entra ID / Google", "Company sign-in.", [], 380, 0, "act-sso"),
];

const D = (id: string, fromId: string, toId: string, protocol: string, sync: boolean, description = ""): Dependency => ({ id, fromId, toId, protocol, sync, description });

export const dependencies: Dependency[] = [
  D("d1", "cmp-pwa", "cmp-api", "HTTPS/JSON", true, "REST, bearer token"),
  D("d2", "cmp-web", "cmp-api", "HTTPS/JSON", true, "REST, bearer token"),
  D("d3", "cmp-api", "cmp-db", "SQL (Prisma)", true),
  D("d4", "cmp-api", "cmp-files", "S3 API", true, "store photos and POs; sign download URLs"),
  D("d5", "cmp-api", "cmp-queue", "BullMQ", false, "enqueue jobs"),
  D("d6", "cmp-worker", "cmp-queue", "BullMQ", false, "consume jobs"),
  D("d7", "cmp-worker", "cmp-db", "SQL (Prisma)", true),
  D("d8", "cmp-worker", "cmp-files", "S3 API", true, "read photos"),
  D("d9", "cmp-worker", "cmp-ocr", "HTTPS", true, "image + catalogue hints → items JSON"),
  D("d10", "cmp-worker", "cmp-line", "HTTPS", true),
  D("d11", "cmp-worker", "cmp-email", "HTTPS", true),
  D("d12", "cmp-api", "cmp-docs", "HTTP (internal)", true, "render a document"),
  D("d13", "cmp-docs", "cmp-files", "S3 API", true, "store the rendered PDF"),
  D("d14", "cmp-api", "cmp-sso", "OIDC", true, "token exchange and validation"),
];

/* ======================================================== stage 6: sequence */

const LL = (id: string, name: string, kind: Lifeline["kind"], refId: string): Lifeline => ({ id, name, kind, refId });
let mseq = 0;
const M = (fromId: string, toId: string, label: string, kind: Message["kind"] = "sync", guard = ""): Message => ({ id: `m-${++mseq}`, fromId, toId, label, kind, guard });
/** Draw the return of every synchronous call that has none, where its nested calls finish. */
function withReturns(lifelines: Lifeline[], input: Message[]): Message[] {
  const msgs = [...input];
  const actor = new Set(lifelines.filter((l) => l.kind === "actor").map((l) => l.id));
  for (let i = 0; i < msgs.length; i++) {
    const call = msgs[i];
    if (call.kind !== "sync" || call.fromId === call.toId) continue;
    if (msgs.slice(i + 1).some((x) => x.kind === "return" && x.fromId === call.toId && x.toId === call.fromId)) continue;
    const inside = new Set([call.toId]);
    let k = i + 1;
    while (k < msgs.length && inside.has(msgs[k].fromId) && msgs[k].toId !== call.fromId) {
      if (msgs[k].kind !== "return") inside.add(msgs[k].toId);
      k++;
    }
    const label = actor.has(call.fromId) ? "shows the result" : call.toId === "l-db" ? "ok" : "done";
    msgs.splice(k, 0, M(call.toId, call.fromId, label, "return"));
  }
  return msgs;
}

function SEQ(useCaseId: string, name: string, lifelines: Lifeline[], messages: Message[]): SequenceDiagram {
  return { id: `seq-${useCaseId.slice(3)}`, useCaseId, tracedName: name, lifelines, messages: withReturns(lifelines, messages) };
}

const L = {
  rep: LL("l-rep", "Sales Representative", "actor", "act-rep"),
  admin: LL("l-admin", "Sales Admin", "actor", "act-admin"),
  mgr: LL("l-mgr", "Sales Manager", "actor", "act-mgr"),
  wh: LL("l-wh", "Warehouse Officer", "actor", "act-wh"),
  acct: LL("l-acct", "Accountant", "actor", "act-acct"),
  pwa: LL("l-pwa", "Sales Rep App", "component", "cmp-pwa"),
  web: LL("l-web", "Back-office Web", "component", "cmp-web"),
  api: LL("l-api", "ConsignCare API", "component", "cmp-api"),
  db: LL("l-db", "Core DB", "component", "cmp-db"),
  files: LL("l-files", "File Store", "component", "cmp-files"),
  queue: LL("l-queue", "Job Queue", "component", "cmp-queue"),
  worker: LL("l-worker", "Job Worker", "component", "cmp-worker"),
  ocr: LL("l-ocr", "OCR Service", "component", "cmp-ocr"),
  docs: LL("l-docs", "Document Renderer", "component", "cmp-docs"),
  email: LL("l-email", "Email Service", "component", "cmp-email"),
  line: LL("l-line", "LINE Messaging", "component", "cmp-line"),
};

export const sequences: Record<string, SequenceDiagram> = Object.fromEntries(
  [
    SEQ("uc-ocr", "Extract usage from a photo", [L.rep, L.pwa, L.api, L.files, L.db, L.queue, L.worker, L.ocr], [
      M("l-rep", "l-pwa", "Take a photo of the usage sheet"),
      M("l-pwa", "l-api", "POST /cases/{id}/photos"),
      M("l-api", "l-files", "putObject(photo)"),
      M("l-files", "l-api", "objectKey", "return"),
      M("l-api", "l-db", "insert usage_photo UPLOADED"),
      M("l-api", "l-queue", "enqueue ocr.extract", "async"),
      M("l-api", "l-pwa", "202 photoId", "return"),
      M("l-worker", "l-queue", "take ocr.extract", "async"),
      M("l-worker", "l-files", "getObject(photo)"),
      M("l-files", "l-worker", "image bytes", "return"),
      M("l-worker", "l-ocr", "extract items (image, catalogue hints)"),
      M("l-ocr", "l-worker", "items JSON + confidence", "return"),
      M("l-worker", "l-db", "match REF/LOT, set EXTRACTED", "sync", "confidence ≥ 0.6"),
      M("l-worker", "l-db", "set FAILED", "sync", "confidence < 0.6"),
      M("l-pwa", "l-api", "GET /photos/{id}"),
      M("l-api", "l-pwa", "extracted items", "return"),
      M("l-rep", "l-pwa", "Confirm the items"),
      M("l-pwa", "l-api", "POST /cases/{id}/usage"),
      M("l-api", "l-db", "insert usage_items, post OUT movements, case USAGE_RECORDED"),
      M("l-api", "l-pwa", "201 case", "return"),
    ]),
    SEQ("uc-quote", "Issue a quotation", [L.admin, L.web, L.api, L.db, L.docs, L.files, L.queue, L.worker, L.email, L.line], [
      M("l-admin", "l-web", "Create quotation from case"),
      M("l-web", "l-api", "POST /quotations {caseId}"),
      M("l-api", "l-db", "load usage and contract prices"),
      M("l-api", "l-db", "insert quotation DRAFT; case QUOTED"),
      M("l-api", "l-web", "quotation", "return"),
      M("l-admin", "l-web", "Adjust discount, submit"),
      M("l-web", "l-api", "POST /quotations/{id}/submit"),
      M("l-api", "l-db", "set APPROVED", "sync", "discount ≤ 10%"),
      M("l-api", "l-db", "set PENDING_APPROVAL", "sync", "discount > 10%"),
      M("l-api", "l-web", "status", "return"),
      M("l-admin", "l-web", "Send by email or LINE"),
      M("l-web", "l-api", "POST /quotations/{id}/send {channel}"),
      M("l-api", "l-docs", "render quotation PDF (Thai template)"),
      M("l-docs", "l-files", "putObject(quotation pdf)"),
      M("l-docs", "l-api", "pdf key", "return"),
      M("l-api", "l-db", "set SENT; case WAITING_PO"),
      M("l-api", "l-queue", "enqueue notify.quotation", "async"),
      M("l-api", "l-web", "sent", "return"),
      M("l-worker", "l-queue", "take notify.quotation", "async"),
      M("l-worker", "l-email", "send PDF to the hospital", "sync", "channel = EMAIL"),
      M("l-worker", "l-line", "push PDF link to the hospital group", "sync", "channel = LINE"),
    ]),
    SEQ("uc-po", "Record a hospital PO", [L.admin, L.web, L.api, L.db], [
      M("l-admin", "l-web", "Scan the PO barcode"),
      M("l-web", "l-api", "POST /customer-pos {poNo, quotationNo, amount}"),
      M("l-api", "l-db", "find quotation SENT by number"),
      M("l-api", "l-web", "404 PO not found", "return", "no quotation"),
      M("l-api", "l-db", "insert customer_po; quotation ACCEPTED; case PO_RECEIVED", "sync", "amount matches"),
      M("l-api", "l-web", "201 PO saved", "return"),
    ]),
    SEQ("uc-req", "Submit a stock requisition", [L.admin, L.mgr, L.wh, L.web, L.api, L.db, L.queue], [
      M("l-admin", "l-web", "Submit the requisition"),
      M("l-web", "l-api", "POST /requisitions"),
      M("l-api", "l-db", "insert requisition SUBMITTED"),
      M("l-api", "l-queue", "enqueue notify.approver", "async"),
      M("l-api", "l-web", "201", "return"),
      M("l-mgr", "l-web", "Approve"),
      M("l-web", "l-api", "POST /requisitions/{id}/approve"),
      M("l-api", "l-db", "insert approval; requisition APPROVED"),
      M("l-api", "l-web", "200", "return"),
      M("l-wh", "l-web", "Issue the stock"),
      M("l-web", "l-api", "POST /requisitions/{id}/issue"),
      M("l-api", "l-db", "pick lots FEFO, post TRANSFER movements, ISSUED, case REQUISITIONED"),
      M("l-api", "l-web", "200 pick list", "return"),
    ]),
    SEQ("uc-bill", "Bill a case", [L.acct, L.web, L.api, L.db, L.docs, L.files, L.queue, L.worker, L.email], [
      M("l-acct", "l-web", "Issue the invoice"),
      M("l-web", "l-api", "POST /invoices {caseId}"),
      M("l-api", "l-db", "insert invoice ISSUED; case BILLED"),
      M("l-api", "l-docs", "render invoice PDF"),
      M("l-docs", "l-files", "putObject(invoice pdf)"),
      M("l-docs", "l-api", "pdf key", "return"),
      M("l-api", "l-queue", "enqueue notify.invoice", "async"),
      M("l-api", "l-web", "invoice", "return"),
      M("l-worker", "l-queue", "take notify.invoice", "async"),
      M("l-worker", "l-email", "send invoice to the hospital"),
      M("l-acct", "l-web", "Record the payment"),
      M("l-web", "l-api", "POST /invoices/{id}/payments"),
      M("l-api", "l-db", "invoice PAID; case CLOSED"),
      M("l-api", "l-web", "200", "return"),
    ]),
  ].map((s) => [s.useCaseId, s]),
);

/* =========================================================== stage 8: class */

let mem = 0;
const f = (name: string, type: string, visibility: ClassMember["visibility"] = "private"): ClassMember => ({ id: `mb-${++mem}`, name, type, visibility, isStatic: false });
const m = (name: string, type: string): ClassMember => ({ id: `mb-${++mem}`, name, type, visibility: "public", isStatic: false });
const K = (id: string, name: string, stereotype: ClassNode["stereotype"], componentId: string, entityId: string | null, fields: ClassMember[], methods: ClassMember[], x: number, y: number): ClassNode => ({ id, name, stereotype, layer: "system", screenId: null, componentId, entityId, fields, methods, x, y });

const gx = (i: number) => 40 + i * 280;
const gy = (i: number) => 40 + i * 260;

export const classes: ClassNode[] = [
  K("k-case", "Case", "class", "cmp-api", "ent-case", [f("caseNo", "string"), f("status", "CaseStatus"), f("hospitalId", "UUID"), f("items", "UsageItem[]")], [m("recordUsage(items)", "void"), m("markQuoted()", "void"), m("cancel(reason)", "void"), m("transition(event)", "CaseStatus")], gx(0), gy(0)),
  K("k-status", "CaseStatus", "enum", "cmp-api", null, [f("DRAFT", "", "public"), f("USAGE_RECORDED", "", "public"), f("QUOTED", "", "public"), f("WAITING_PO", "", "public"), f("PO_RECEIVED", "", "public"), f("REQUISITIONED", "", "public"), f("BILLED", "", "public"), f("CLOSED", "", "public"), f("CANCELLED", "", "public")], [], gx(0), gy(1)),
  K("k-usage", "UsageItem", "value", "cmp-api", "ent-usage", [f("productId", "UUID"), f("lotId", "UUID"), f("qty", "int"), f("source", "CaptureSource")], [m("lineTotal(price)", "Money")], gx(1), gy(0)),
  K("k-casesvc", "CaseService", "class", "cmp-api", null, [f("cases", "CaseRepository"), f("ledger", "StockLedger")], [m("createCase(cmd)", "Case"), m("confirmUsage(caseId, items)", "Case"), m("cancelCase(caseId, reason)", "Case")], gx(1), gy(1)),
  K("k-caserepo", "CaseRepository", "interface", "cmp-api", null, [], [m("get(id)", "Case"), m("save(case)", "void"), m("byHospital(ids, status)", "Case[]")], gx(2), gy(1)),
  K("k-ocrport", "OcrPort", "interface", "cmp-worker", null, [], [m("extract(image, hints)", "ExtractedItem[]")], gx(3), gy(0)),
  K("k-claudeocr", "ClaudeVisionOcr", "class", "cmp-worker", null, [f("model", "string"), f("client", "Anthropic")], [m("extract(image, hints)", "ExtractedItem[]")], gx(4), gy(0)),
  K("k-ocrjob", "OcrJob", "class", "cmp-worker", "ent-photo", [f("photoId", "UUID"), f("status", "PhotoStatus"), f("confidence", "number")], [m("run()", "void"), m("matchCatalogue(items)", "UsageItem[]")], gx(3), gy(1)),
  K("k-quote", "Quotation", "class", "cmp-api", "ent-quotation", [f("quoteNo", "string"), f("status", "QuotationStatus"), f("discountPct", "number"), f("lines", "QuotationLine[]")], [m("submit(policy)", "void"), m("approve(by)", "void"), m("send(channel)", "void"), m("accept(po)", "void"), m("expire()", "void"), m("total()", "Money")], gx(0), gy(2)),
  K("k-pricing", "PricingPolicy", "class", "cmp-api", "ent-price", [f("discountLimit", "number")], [m("contractPrice(hospital, product, date)", "Money"), m("needsApproval(discount)", "boolean")], gx(1), gy(2)),
  K("k-quotesvc", "QuotationService", "class", "cmp-api", null, [f("renderer", "DocumentRenderer"), f("notifier", "Notifier")], [m("generateFromCase(caseId)", "Quotation"), m("submit(id)", "Quotation"), m("send(id, channel)", "Quotation")], gx(2), gy(2)),
  K("k-cpo", "HospitalPo", "class", "cmp-api", "ent-cpo", [f("poNo", "string"), f("amount", "Money")], [m("matches(quotation)", "boolean")], gx(3), gy(2)),
  K("k-posvc", "PurchaseOrderService", "class", "cmp-api", null, [f("quotes", "QuotationRepository")], [m("recordPo(poNo, quoteNo, amount)", "HospitalPo")], gx(4), gy(2)),
  K("k-ledger", "StockLedger", "class", "cmp-api", "ent-movement", [f("movements", "MovementRepository")], [m("post(movement)", "void"), m("balance(lot, location)", "int"), m("pickFefo(product, qty, from)", "LotPick[]")], gx(2), gy(0)),
  K("k-req", "Requisition", "class", "cmp-api", "ent-requisition", [f("reqNo", "string"), f("status", "RequisitionStatus"), f("items", "RequisitionLine[]")], [m("approve(by)", "void"), m("reject(by, reason)", "void"), m("issue(picks)", "void")], gx(0), gy(3)),
  K("k-reqsvc", "RequisitionService", "class", "cmp-api", null, [f("ledger", "StockLedger")], [m("submit(cmd)", "Requisition"), m("issue(id)", "Requisition")], gx(1), gy(3)),
  K("k-pr", "PurchaseRequest", "class", "cmp-api", "ent-pr", [f("prNo", "string"), f("status", "PurchaseRequestStatus"), f("items", "PrLine[]")], [m("approve(by)", "void"), m("order(supplierPoNo)", "void"), m("receive(lots)", "void")], gx(2), gy(3)),
  K("k-prsvc", "PurchaseRequestService", "class", "cmp-api", null, [f("ledger", "StockLedger")], [m("suggestReorders()", "PrLine[]"), m("raise(cmd)", "PurchaseRequest"), m("receiveGoods(id, lots)", "void")], gx(3), gy(3)),
  K("k-inv", "Invoice", "class", "cmp-api", "ent-invoice", [f("invoiceNo", "string"), f("status", "InvoiceStatus"), f("dueDate", "Date")], [m("recordPayment(at)", "void"), m("markOverdue()", "void"), m("void(reason)", "void")], gx(0), gy(4)),
  K("k-billsvc", "BillingService", "class", "cmp-api", null, [f("renderer", "DocumentRenderer")], [m("issue(caseId)", "Invoice"), m("recordPayment(id, at)", "Invoice")], gx(1), gy(4)),
  K("k-approval", "ApprovalService", "class", "cmp-api", "ent-approval", [f("approvals", "ApprovalRepository")], [m("decide(docType, docId, decision, note)", "void"), m("inbox(managerId)", "PendingDoc[]")], gx(4), gy(3)),
  K("k-renderer", "DocumentRenderer", "interface", "cmp-docs", null, [], [m("quotationPdf(q)", "Bytes"), m("purchaseRequestPdf(pr)", "Bytes"), m("invoicePdf(i)", "Bytes"), m("purchaseRequestXlsx(pr)", "Bytes")], gx(2), gy(4)),
  K("k-notifier", "Notifier", "interface", "cmp-worker", null, [], [m("send(channel, to, document)", "void")], gx(3), gy(4)),
  K("k-line", "LineNotifier", "class", "cmp-worker", null, [f("channelToken", "Secret")], [m("send(channel, to, document)", "void")], gx(4), gy(4)),
  K("k-email", "EmailNotifier", "class", "cmp-worker", null, [f("ses", "SESClient")], [m("send(channel, to, document)", "void")], gx(5), gy(4)),
  K("k-access", "AccessPolicy", "class", "cmp-api", "ent-assignment", [f("assignments", "AssignmentRepository")], [m("hospitalsFor(user)", "UUID[]"), m("canSee(user, hospitalId)", "boolean")], gx(5), gy(1)),
];

const CR = (id: string, fromId: string, toId: string, kind: ClassRelation["kind"], label = "", fromMultiplicity = "", toMultiplicity = ""): ClassRelation => ({ id, fromId, toId, kind, label, fromMultiplicity, toMultiplicity });

export const classRelations: ClassRelation[] = [
  CR("kr1", "k-case", "k-usage", "composition", "used", "1", "*"),
  CR("kr2", "k-case", "k-status", "dependency", "is in"),
  CR("kr3", "k-casesvc", "k-caserepo", "dependency", "loads"),
  CR("kr4", "k-casesvc", "k-ledger", "dependency", "posts OUT"),
  CR("kr5", "k-casesvc", "k-case", "dependency", "drives"),
  CR("kr6", "k-claudeocr", "k-ocrport", "realization"),
  CR("kr7", "k-ocrjob", "k-ocrport", "dependency", "calls"),
  CR("kr8", "k-quotesvc", "k-quote", "dependency", "creates"),
  CR("kr9", "k-quotesvc", "k-pricing", "dependency", "prices with"),
  CR("kr10", "k-quotesvc", "k-renderer", "dependency", "renders"),
  CR("kr11", "k-quotesvc", "k-notifier", "dependency", "sends via"),
  CR("kr12", "k-posvc", "k-cpo", "dependency", "records"),
  CR("kr13", "k-cpo", "k-quote", "association", "answers", "*", "1"),
  CR("kr14", "k-reqsvc", "k-req", "dependency", "drives"),
  CR("kr15", "k-reqsvc", "k-ledger", "dependency", "TRANSFER"),
  CR("kr16", "k-prsvc", "k-pr", "dependency", "drives"),
  CR("kr17", "k-prsvc", "k-ledger", "dependency", "IN"),
  CR("kr18", "k-billsvc", "k-inv", "dependency", "issues"),
  CR("kr19", "k-billsvc", "k-renderer", "dependency", "renders"),
  CR("kr20", "k-line", "k-notifier", "realization"),
  CR("kr21", "k-email", "k-notifier", "realization"),
  CR("kr22", "k-approval", "k-quote", "dependency", "approves"),
  CR("kr23", "k-approval", "k-req", "dependency", "approves"),
  CR("kr24", "k-approval", "k-pr", "dependency", "approves"),
  CR("kr25", "k-inv", "k-case", "association", "bills", "*", "1"),
  CR("kr26", "k-quote", "k-case", "association", "prices", "*", "1"),
  CR("kr27", "k-casesvc", "k-access", "dependency", "checks"),
];

/* ===================================================== approach and stack */

export const approach: Approach = {
  style: "modular-monolith",
  structure: "hexagonal",
  rationale:
    "One distributor, one small team, one database of record. A single deployable keeps the case → cash chain in one transaction where it matters (usage confirm + stock OUT; PO + quotation accept). Modules per area — cases, sales, supply, billing, identity — keep the option to split later. Ports keep the OCR model, LINE, email and the PDF engine replaceable.",
  patterns: [
    { id: "pt-fsm", pattern: "state-machine", name: "State Machine", rationale: "Case, quotation, requisition, purchase request, invoice and photo lifecycles are drawn at stage 4; the API refuses any transition the diagram lacks.", appliesTo: ["cmp-api"] },
    { id: "pt-repo", pattern: "repository", name: "Repository", rationale: "One per aggregate (case, quotation, requisition, PR, invoice) so rules never see SQL.", appliesTo: ["cmp-api", "cmp-worker"] },
    { id: "pt-adapter", pattern: "adapter", name: "Adapter", rationale: "OCR, LINE, email and document rendering sit behind ports the domain owns.", appliesTo: ["cmp-worker"] },
    { id: "pt-outbox", pattern: "outbox", name: "Outbox", rationale: "A sent quotation or issued invoice and its notification job are written in one transaction, so nothing is sent for a rollback and nothing is lost on a crash.", appliesTo: ["cmp-api"] },
    { id: "pt-strategy", pattern: "strategy", name: "Strategy", rationale: "Notification channel (email, LINE) chosen per hospital at send time.", appliesTo: ["cmp-worker"] },
  ],
  dismissed: [],
};

const S = (id: string, concern: StackChoice["concern"], name: string, version: string, rationale: string, alternatives: string[], constraints: string): StackChoice => ({ id, concern, name, version, rationale, alternatives, constraints, satisfies: [] });

export const stack: StackChoice[] = [
  S("st-lang", "language", "TypeScript", "5.x", "One language across PWA, web, API and worker; shared types for DTOs and state enums.", ["Kotlin", "Go"], "Node 22 LTS runtime everywhere."),
  S("st-ui", "frontend", "Next.js", "15", "App Router for both the rep PWA and the back-office; server components keep the back-office fast on hospital Wi-Fi.", ["Remix", "Flutter (mobile)"], "PWA install + camera via getUserMedia; iOS Safari ≥ 16."),
  S("st-css", "ui", "Tailwind CSS + shadcn/ui", "4 / latest", "Matches the navy/blue card look of the concept quickly; accessible primitives.", ["MUI", "Chakra"], "Design tokens live in one CSS file."),
  S("st-api", "backend", "NestJS", "11", "Modules map one-to-one to the bounded areas; DI makes ports and adapters natural.", ["Fastify plain", "Express"], "One deployable; modules may not import each other's repositories."),
  S("st-orm", "orm", "Prisma", "6", "Typed queries, migrations in git.", ["Drizzle", "TypeORM"], "Status CHECK constraints generated from stage 4."),
  S("st-db", "datastore", "PostgreSQL", "16", "Transactions across case, stock and quotation; row-level security option for hospital assignment.", ["MySQL"], "Managed (Amazon RDS) with PITR."),
  S("st-queue", "queue", "BullMQ on Redis", "5 / 7", "Retries with backoff for OCR and notifications; delayed jobs for expiry and overdue.", ["SQS", "RabbitMQ"], "Redis persistence on (AOF)."),
  S("st-sched", "scheduler", "BullMQ repeatable jobs", "5", "Clock-driven transitions: quotation expiry after 30 days, invoice overdue on due date, nightly reorder suggestions and expiry watch.", ["cron on a VM", "EventBridge Scheduler"], "Jobs are idempotent; one scheduler leader."),
  S("st-files", "datastore", "Amazon S3", "", "Cheap, private storage for photos and PDFs; signed URLs.", ["MinIO"], "Bucket in ap-southeast-7 (Bangkok); SSE-KMS."),
  S("st-ai", "ai", "Claude vision (claude-opus-5-5)", "", "Reads the printed text under each barcode (REF LOT SERIAL) and the patient stickers into JSON with structured outputs; works on photos too small to decode barcodes from. Server-side fallback on refusal.", ["Google Document AI", "Azure Form Recognizer", "Tesseract"], "Needs HN/AN to split cases, so the patient sticker is sent; the prompt and schema never return names or birth dates; provider under a DPA with no training on the data."),
  S("st-decode", "ui", "zxing-wasm (multi-barcode, on device)", "2", "Decodes every Code128 / DataMatrix sticker in a clear photo on the phone, offline, and splits them into patients by row gaps; also the live scanner.", ["@zxing/browser (one code at a time)", "Scandit"], "Needs ≥ ~2 px per bar: sheets photographed whole on a phone often fall below that, which is why AI reading of the printed text is the primary path."),
  S("st-scan", "ui", "ZXing (GS1 DataMatrix / Code128)", "", "Decodes GTIN, lot and expiry from the GS1 barcodes on device packaging, in the browser.", ["Scandit (paid)", "QuaggaJS"], "Needs camera permission; falls back to manual search."),
  S("st-pdf", "service", "Playwright Chromium + exceljs", "", "HTML templates in Thai (Sarabun) give pixel-exact quotations and PRs; Excel export for PRs.", ["pdfmake", "React-PDF"], "Runs as its own container."),
  S("st-auth", "auth", "Auth.js with Microsoft Entra ID / Google", "5", "Company SSO plus email/password for small partners; JWT carries role and hospital ids.", ["Keycloak", "Cognito"], "Hospital assignment enforced in the API, never only in the UI."),
  S("st-msg", "messaging", "LINE Messaging API + Amazon SES", "", "Thai hospitals live in LINE groups; email for formal documents.", ["SMS"], "LINE OA verified; SES domain verified (DKIM)."),
  S("st-host", "hosting", "AWS ECS Fargate (ap-southeast-7)", "", "Bangkok region keeps personal data in Thailand; no servers to patch.", ["Vercel + Railway", "On-prem"], "Three services: api, worker, docs; web/PWA on the same cluster behind CloudFront."),
  S("st-ci", "ci", "GitHub Actions", "", "Build, test, scan and deploy on merge.", ["GitLab CI"], "Production deploy needs a person's approval."),
  S("st-obs", "observability", "OpenTelemetry + Grafana Cloud + Sentry", "", "Traces across API → queue → worker; front-end errors.", ["Datadog"], "Never log patient_hn."),
  S("st-test", "testing", "Vitest + Playwright", "", "Unit and component in Vitest; E2E journeys in Playwright on mobile and desktop viewports.", ["Jest", "Cypress"], "Test names carry Truss derived ids."),
];

/* ====================================================== non-functional tests */

const NF = (id: string, category: NfrTest["category"], title: string, requirement: string, measure: string, threshold: string, evidence: string[], stageRefs: string[]): NfrTest => ({ id, category, title, requirement, measure, threshold, evidence, stageRefs, status: "accepted", origin: "human" });

export const nfrTests: NfrTest[] = [
  NF("nf-ocr", "performance", "OCR answers while the rep is still in the OR", "95% of usage photos return extracted items within 20 seconds of upload.", "Time from POST /photos to EXTRACTED, over a day of production traffic.", "p95 ≤ 20 s", ["uc-ocr is async through the job queue", "OCR Service is external"], ["activity", "architecture"]),
  NF("nf-api", "performance", "Back-office pages feel instant", "95% of API reads complete in under 400 ms at 50 concurrent users.", "k6 load test against staging with production-sized data (100k cases).", "p95 ≤ 400 ms", ["dashboard counts cases by status per hospital"], ["architecture"]),
  NF("nf-avail", "availability", "Up when surgeries happen", "Monthly availability of 99.5% between 06:00 and 22:00 ICT.", "Synthetic check on /health and sign-in every minute.", "≥ 99.5%", ["reps record cases in the OR"], ["architecture"]),
  NF("nf-offline", "availability", "No lost photos in the basement OR", "A photo taken offline is uploaded automatically within 1 minute of reconnecting, with zero loss.", "Playwright with network throttled to offline, then online.", "0 lost / 100", ["Sales Rep App is a PWA", "ORs often have no signal"], ["ui"]),
  NF("nf-access", "security", "Reps see only their hospitals", "Every case, quotation and stock read is filtered by hospital assignment server-side.", "Automated test per endpoint with a rep from another hospital.", "0 leaks", ["Hospital Assignment entity"], ["er", "architecture"]),
  NF("nf-pdpa", "privacy", "Patient identifiers under PDPA", "patient_hn and patient_an are encrypted at rest, masked in lists and never logged; the OCR step may read the patient sticker but returns and stores no name or date of birth; purged 5 years after case close.", "Log scan + DB column check + OCR response schema inspection.", "0 names or birth dates stored; 0 HN/AN in logs", ["Case.patient_hn and patient_an notes", "usage sheets carry patient stickers"], ["er", "architecture"]),
  NF("nf-docno", "compliance", "Document numbers have no gaps", "Quotation, invoice and PR numbers are sequential per year with no gaps or duplicates, as the Revenue Department expects.", "Nightly check on each sequence.", "0 gaps", ["QT-YYYY-NNN numbering"], ["er"]),
  NF("nf-ledger", "maintainability", "Stock adds up", "For every lot and location, the sum of movements equals the balance.", "Nightly reconciliation job.", "0 mismatches", ["Stock Movement is append-only"], ["er"]),
  NF("nf-a11y", "accessibility", "Readable on a phone in gloves", "Touch targets at least 44 px; text contrast WCAG 2.2 AA; works at 200% zoom.", "axe-core in Playwright + manual check.", "0 serious axe violations", ["mobile PWA"], ["ui"]),
  NF("nf-scale", "scalability", "Room for the whole company", "Holds 200 users, 60 hospitals and 250k cases (5 years) with no change to p95 targets.", "Load test on a staging copy seeded to 5-year volume.", "p95 ≤ 400 ms at 5-year volume", ["24 entities; stock ledger grows with every case"], ["er", "architecture"]),
  NF("nf-cost", "cost", "Metered services have a ceiling", "OCR and email spend stays under ฿10,000 a month at 3,000 cases/month; alert at 80%.", "Monthly billing export vs. case count.", "≤ ฿3.5 per case", ["OCR Service and Email Service are metered and external"], ["architecture"]),
  NF("nf-obs", "observability", "Every case can be traced", "A trace id links the API request, queue job and worker call for every OCR and notification.", "Sample 20 jobs in Grafana.", "20 / 20 traced", ["API → queue → worker"], ["architecture"]),
];
