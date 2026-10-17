import type { Screen, SwimEdge, SwimFlow, SwimStep } from "../../../truss/src/lib/model";

/* ======================================================= swimlanes (journeys) */

const step = (id: string, laneId: string, col: number, label: string, extra: Partial<SwimStep> = {}): SwimStep => ({
  id, laneId, col, label, sublabel: "", kind: "process", focal: false, note: "", sourceNodeId: null, useCaseId: null, ...extra,
});
const edge = (id: string, from: string, to: string, label = "", kind: SwimEdge["kind"] = "default"): SwimEdge => ({ id, from, to, label, kind });

const caseRow = (id: string, label: string, stateNodeId: string | null, sub = "Case.status") => ({ id, label, sublabel: sub, group: "Sales Representative", stateNodeId });

const caseJourney: SwimFlow = {
  id: "swim-case",
  title: "A case, from surgery to cash",
  eyebrow: "Sales Representative · Case.status",
  summary:
    "Everything before the rep confirms the items sits in DRAFT; the moment usage is confirmed the hospital's consignment stock is already gone, so every row after it is money the company is owed and the dashboard counts it.",
  entityId: "ent-case",
  useCaseIds: ["uc-signin", "uc-dashboard", "uc-new-case", "uc-ocr", "uc-quote", "uc-approve", "uc-po", "uc-followup", "uc-req", "uc-bill", "uc-cancel"],
  lanes: [
    caseRow("cj-none", "NO CASE", null, "before the row exists"),
    caseRow("cj-draft", "DRAFT", "c-draft"),
    caseRow("cj-usage", "USAGE_RECORDED", "c-usage"),
    caseRow("cj-quoted", "QUOTED", "c-quoted"),
    caseRow("cj-waitpo", "WAITING_PO", "c-waitpo"),
    caseRow("cj-po", "PO_RECEIVED", "c-po"),
    caseRow("cj-req", "REQUISITIONED", "c-req"),
    caseRow("cj-billed", "BILLED", "c-billed"),
    caseRow("cj-closed", "CLOSED", "c-closed"),
    caseRow("cj-cancel", "CANCELLED", "c-cancel"),
    { id: "cj-admin", label: "Sales Admin", sublabel: "", group: "", stateNodeId: null },
    { id: "cj-mgr", label: "Sales Manager", sublabel: "", group: "", stateNodeId: null },
    { id: "cj-hosp", label: "Hospital Purchasing", sublabel: "", group: "", stateNodeId: null },
    { id: "cj-wh", label: "Warehouse Officer", sublabel: "", group: "", stateNodeId: null },
    { id: "cj-acct", label: "Accountant", sublabel: "", group: "", stateNodeId: null },
  ],
  steps: [
    step("cs1", "cj-none", 0, "Start", { kind: "start" }),
    step("cs2", "cj-none", 1, "Sign in", { sublabel: "POST /auth · SSO", useCaseId: "uc-signin", sourceNodeId: "si2" }),
    step("cs3", "cj-none", 2, "Check my accounts", { sublabel: "GET /dashboard", useCaseId: "uc-dashboard", sourceNodeId: "db2" }),
    step("cs4", "cj-none", 3, "Enter the case details", { sublabel: "hospital · date · doctor · HN", useCaseId: "uc-new-case", sourceNodeId: "nc3" }),
    step("cs5", "cj-draft", 4, "Attach the usage photo", { sublabel: "POST /cases/{id}/photos", useCaseId: "uc-ocr", sourceNodeId: "oc2" }),
    step("cs6", "cj-draft", 5, "AI reads the items", { sublabel: "OCR Service · queue · async", useCaseId: "uc-ocr", sourceNodeId: "oc4" }),
    step("cs7", "cj-draft", 6, "Confirm the usage items", { sublabel: "POST /cases/{id}/usage", useCaseId: "uc-ocr", sourceNodeId: "oc8", focal: true }),
    step("cs8", "cj-usage", 7, "Stock deducted at the hospital", { sublabel: "movement OUT", useCaseId: "uc-new-case", sourceNodeId: "nc13" }),
    step("cs9", "cj-admin", 8, "Generate the quotation", { sublabel: "POST /quotations", useCaseId: "uc-quote", sourceNodeId: "qu3" }),
    step("cs10", "cj-quoted", 9, "Quotation drafted", { sublabel: "QT-2026-NNN", useCaseId: "uc-quote" }),
    step("cs11", "cj-mgr", 10, "Approve the discount", { sublabel: "only when > 10%", useCaseId: "uc-approve", sourceNodeId: "ap5" }),
    step("cs12", "cj-admin", 11, "Send the quotation", { sublabel: "PDF · email / LINE", useCaseId: "uc-quote", sourceNodeId: "qu18" }),
    step("cs13", "cj-waitpo", 12, "Wait for the hospital PO", { sublabel: "30-day validity", useCaseId: "uc-followup", sourceNodeId: "fu7" }),
    step("cs14", "cj-hosp", 13, "Issue the PO", { useCaseId: "uc-po", sourceNodeId: "po2" }),
    step("cs15", "cj-admin", 14, "Record the hospital PO", { sublabel: "POST /customer-pos", useCaseId: "uc-po", sourceNodeId: "po6", focal: true }),
    step("cs16", "cj-po", 15, "PO received", { useCaseId: "uc-po" }),
    step("cs17", "cj-admin", 16, "Submit the requisition", { sublabel: "POST /requisitions", useCaseId: "uc-req", sourceNodeId: "rq4" }),
    step("cs18", "cj-wh", 17, "Issue the stock", { sublabel: "FEFO pick · TRANSFER", useCaseId: "uc-req", sourceNodeId: "rq10" }),
    step("cs19", "cj-req", 18, "Consignment refilled", { useCaseId: "uc-req" }),
    step("cs20", "cj-acct", 19, "Issue the invoice", { sublabel: "POST /invoices", useCaseId: "uc-bill", sourceNodeId: "bi3" }),
    step("cs21", "cj-billed", 20, "Waiting for payment", { useCaseId: "uc-bill" }),
    step("cs22", "cj-acct", 21, "Record the payment", { sublabel: "POST /invoices/{id}/payments", useCaseId: "uc-bill", sourceNodeId: "bi9" }),
    step("cs23", "cj-closed", 22, "Closed", { kind: "end" }),
    step("cs24", "cj-cancel", 8, "Cancel the case", { sublabel: "reason required", useCaseId: "uc-cancel", sourceNodeId: "cc5" }),
    step("cs25", "cj-cancel", 14, "Withdraw the quotation", { sublabel: "hospital declines", useCaseId: "uc-followup", sourceNodeId: "fu9" }),
    step("cs26", "cj-cancel", 23, "Cancelled", { kind: "end" }),
  ],
  edges: [
    edge("ce1", "cs1", "cs2"), edge("ce2", "cs2", "cs3"), edge("ce3", "cs3", "cs4"),
    edge("ce4", "cs4", "cs5", "CREATED", "accent"),
    edge("ce5", "cs5", "cs6", "", "async"), edge("ce6", "cs6", "cs7"),
    edge("ce7", "cs7", "cs8", "USAGE CONFIRMED", "accent"),
    edge("ce8", "cs8", "cs9"), edge("ce9", "cs9", "cs10", "QUOTED", "accent"),
    edge("ce10", "cs10", "cs11", "discount > 10%"), edge("ce11", "cs10", "cs12", "within limit"), edge("ce12", "cs11", "cs12"),
    edge("ce13", "cs12", "cs13", "SENT", "accent"),
    edge("ce14", "cs13", "cs14"), edge("ce15", "cs14", "cs15"),
    edge("ce16", "cs15", "cs16", "PO MATCHED", "accent"),
    edge("ce17", "cs16", "cs17"), edge("ce18", "cs17", "cs18"),
    edge("ce19", "cs18", "cs19", "ISSUED", "accent"),
    edge("ce20", "cs19", "cs20"), edge("ce21", "cs20", "cs21", "INVOICED", "accent"),
    edge("ce22", "cs21", "cs22"), edge("ce23", "cs22", "cs23", "PAID", "accent"),
    edge("ce24", "cs8", "cs24", "CANCELLED", "accent"), edge("ce25", "cs13", "cs25", "DECLINED", "accent"),
    edge("ce26", "cs24", "cs26"), edge("ce27", "cs25", "cs26"),
  ],
};

const prRow = (id: string, label: string, stateNodeId: string | null, sub = "PurchaseRequest.status") => ({ id, label, sublabel: sub, group: "Warehouse Officer", stateNodeId });

const restock: SwimFlow = {
  id: "swim-restock",
  title: "Keeping the shelves full",
  eyebrow: "Warehouse Officer · PurchaseRequest.status",
  summary:
    "The warehouse finds the gap before a surgery does: search, expiry watch and the reorder point all lead to one purchase request, and nothing is in stock again until the goods receipt captures a lot and an expiry date.",
  entityId: "ent-pr",
  useCaseIds: ["uc-search", "uc-expiry", "uc-history", "uc-scan", "uc-pr", "uc-approve", "uc-receive"],
  lanes: [
    prRow("rs-none", "NO REQUEST", null, "before the row exists"),
    prRow("rs-sub", "SUBMITTED", "p-sub"),
    prRow("rs-app", "APPROVED", "p-app"),
    prRow("rs-rej", "REJECTED", "p-rej"),
    prRow("rs-ord", "ORDERED", "p-ord"),
    prRow("rs-rec", "RECEIVED", "p-rec"),
    { id: "rs-mgr", label: "Sales Manager", sublabel: "", group: "", stateNodeId: null },
    { id: "rs-buyer", label: "Purchasing Officer", sublabel: "", group: "", stateNodeId: null },
    { id: "rs-sup", label: "Supplier", sublabel: "", group: "", stateNodeId: null },
  ],
  steps: [
    step("rs1", "rs-none", 0, "Start", { kind: "start" }),
    step("rs2", "rs-none", 1, "Search the inventory", { sublabel: "GET /inventory?q=", useCaseId: "uc-search", sourceNodeId: "se2" }),
    step("rs3", "rs-none", 2, "Scan a product barcode", { sublabel: "GS1 · GTIN + LOT + EXP", useCaseId: "uc-scan", sourceNodeId: "sc2" }),
    step("rs4", "rs-none", 3, "Trace where a lot was used", { sublabel: "GET /lots/{id}/history", useCaseId: "uc-history", sourceNodeId: "hi5" }),
    step("rs5", "rs-none", 4, "Check the expiry watch", { sublabel: "≤ 90 days", useCaseId: "uc-expiry", sourceNodeId: "ex3" }),
    step("rs6", "rs-none", 5, "Review suggested reorder items", { sublabel: "qty < reorder_point", useCaseId: "uc-pr", sourceNodeId: "pr2" }),
    step("rs7", "rs-sub", 6, "Submit the purchase request", { sublabel: "POST /purchase-requests", useCaseId: "uc-pr", sourceNodeId: "pr3", focal: true }),
    step("rs8", "rs-mgr", 7, "Decide on the request", { kind: "decision", useCaseId: "uc-approve", sourceNodeId: "ap4" }),
    step("rs9", "rs-app", 8, "Approved", { useCaseId: "uc-pr" }),
    step("rs10", "rs-rej", 8, "Rejected", { kind: "end" }),
    step("rs11", "rs-buyer", 9, "Create the supplier PO", { useCaseId: "uc-pr", sourceNodeId: "pr8" }),
    step("rs12", "rs-ord", 10, "Waiting for delivery", { sublabel: "PO emailed", useCaseId: "uc-pr" }),
    step("rs13", "rs-sup", 11, "Deliver the goods", { useCaseId: "uc-receive" }),
    step("rs14", "rs-ord", 12, "Capture lot and expiry", { sublabel: "scan on receipt", useCaseId: "uc-receive", sourceNodeId: "gr3", focal: true }),
    step("rs15", "rs-rec", 13, "Post the goods receipt", { sublabel: "movement IN", useCaseId: "uc-receive", sourceNodeId: "gr5" }),
    step("rs16", "rs-rec", 14, "Back in stock", { kind: "end" }),
  ],
  edges: [
    edge("re1", "rs1", "rs2"), edge("re2", "rs2", "rs3"), edge("re3", "rs3", "rs4"), edge("re4", "rs4", "rs5"), edge("re5", "rs5", "rs6"),
    edge("re6", "rs6", "rs7", "SUBMITTED", "accent"), edge("re7", "rs7", "rs8"),
    edge("re8", "rs8", "rs9", "APPROVED", "accent"), edge("re9", "rs8", "rs10", "REJECTED", "accent"),
    edge("re10", "rs9", "rs11"), edge("re11", "rs11", "rs12", "ORDERED", "accent"),
    edge("re12", "rs12", "rs13", "", "async"), edge("re13", "rs13", "rs14"),
    edge("re14", "rs14", "rs15", "RECEIVED", "accent"), edge("re15", "rs15", "rs16"),
  ],
};

const onboarding: SwimFlow = {
  id: "swim-onboard",
  title: "Opening a new hospital account",
  eyebrow: "System Admin · Sales Representative",
  summary: "A hospital is not usable until three things exist: the account, its contract prices and a rep assigned to it — the rep sees nothing until the last one is saved.",
  entityId: null,
  useCaseIds: ["uc-master", "uc-signin"],
  lanes: [
    { id: "ob-admin", label: "System Admin", sublabel: "", group: "", stateNodeId: null },
    { id: "ob-rep", label: "Sales Representative", sublabel: "", group: "", stateNodeId: null },
  ],
  steps: [
    step("ob1", "ob-admin", 0, "Start", { kind: "start" }),
    step("ob2", "ob-admin", 1, "Add the hospital", { sublabel: "POST /hospitals", useCaseId: "uc-master", sourceNodeId: "md3" }),
    step("ob3", "ob-admin", 2, "Load the contract prices", { sublabel: "import .xlsx", useCaseId: "uc-master" }),
    step("ob4", "ob-admin", 3, "Assign the sales reps", { sublabel: "hospital_assignment", useCaseId: "uc-master", focal: true }),
    step("ob5", "ob-rep", 4, "See the new account", { sublabel: "GET /accounts", useCaseId: "uc-signin", sourceNodeId: "si4" }),
    step("ob6", "ob-rep", 5, "Ready to record cases", { kind: "end" }),
  ],
  edges: [edge("oe1", "ob1", "ob2"), edge("oe2", "ob2", "ob3"), edge("oe3", "ob3", "ob4"), edge("oe4", "ob4", "ob5"), edge("oe5", "ob5", "ob6")],
};


const rowsUnder = (group: string, entity: string, rows: [string, string, string | null][]) =>
  rows.map(([id, label, stateNodeId]) => ({ id, label, sublabel: stateNodeId ? entity : "before the row exists", group, stateNodeId }));
const actorLane = (id: string, label: string) => ({ id, label, sublabel: "", group: "", stateNodeId: null });

const quotation: SwimFlow = {
  id: "swim-quote",
  title: "A quotation's life",
  eyebrow: "Sales Admin · Quotation.status",
  summary: "A quotation only waits on a person twice — the manager when the discount is over 10%, and the hospital for its PO; everything else is generated, rendered and sent by the system.",
  entityId: "ent-quotation",
  useCaseIds: ["uc-quote", "uc-approve", "uc-po", "uc-followup"],
  lanes: [
    ...rowsUnder("Sales Admin", "Quotation.status", [["qj-none", "NO QUOTATION", null], ["qj-draft", "DRAFT", "q-draft"], ["qj-pend", "PENDING_APPROVAL", "q-pending"], ["qj-appr", "APPROVED", "q-approved"], ["qj-sent", "SENT", "q-sent"], ["qj-acc", "ACCEPTED", "q-accepted"], ["qj-exp", "EXPIRED", "q-expired"], ["qj-rej", "REJECTED", "q-rejected"]]),
    actorLane("qj-mgr", "Sales Manager"), actorLane("qj-hosp", "Hospital Purchasing"), actorLane("qj-rep", "Sales Representative"),
  ],
  steps: [
    step("qs0", "qj-none", 0, "Start", { kind: "start" }),
    step("qs1", "qj-none", 1, "Generate from the case", { sublabel: "POST /quotations", useCaseId: "uc-quote", sourceNodeId: "qu3" }),
    step("qs2", "qj-draft", 2, "Adjust the discount", { sublabel: "contract price · VAT 7%", useCaseId: "uc-quote", sourceNodeId: "qu4" }),
    step("qs3", "qj-draft", 3, "Submit the quotation", { sublabel: "POST /quotations/{id}/submit", useCaseId: "uc-quote", sourceNodeId: "qu5", focal: true }),
    step("qs4", "qj-pend", 4, "Wait for the manager", { sublabel: "discount > 10%", useCaseId: "uc-approve" }),
    step("qs5", "qj-mgr", 5, "Approve the discount", { useCaseId: "uc-approve", sourceNodeId: "qu9" }),
    step("qs6", "qj-mgr", 6, "Return with a comment", { useCaseId: "uc-approve", sourceNodeId: "qu10" }),
    step("qs7", "qj-appr", 6, "Render and send the PDF", { sublabel: "email / LINE", useCaseId: "uc-quote", sourceNodeId: "qu18" }),
    step("qs8", "qj-sent", 7, "Wait for the PO", { sublabel: "30-day validity", useCaseId: "uc-followup", sourceNodeId: "fu2" }),
    step("qs9", "qj-hosp", 8, "Issue the PO", { useCaseId: "uc-po", sourceNodeId: "po2" }),
    step("qs10", "qj-sent", 9, "Record the PO", { sublabel: "POST /customer-pos", useCaseId: "uc-po", sourceNodeId: "po6", focal: true }),
    step("qs11", "qj-acc", 10, "Accepted", { kind: "end" }),
    step("qs12", "qj-exp", 9, "Expire after 30 days", { sublabel: "scheduler", useCaseId: "uc-followup", sourceNodeId: "fu4" }),
    step("qs13", "qj-exp", 10, "Expired", { kind: "end" }),
    step("qs14", "qj-rep", 8, "Withdraw the quotation", { sublabel: "hospital declines", useCaseId: "uc-followup", sourceNodeId: "fu9" }),
    step("qs15", "qj-rej", 9, "Rejected", { kind: "end" }),
    step("qs16", "qj-draft", 7, "Back with the admin to rework", { kind: "end" }),
  ],
  edges: [
    edge("qe0", "qs0", "qs1"), edge("qe1", "qs1", "qs2", "DRAFT", "accent"), edge("qe2", "qs2", "qs3"),
    edge("qe3", "qs3", "qs4", "over limit", "accent"), edge("qe4", "qs3", "qs7", "within limit", "accent"),
    edge("qe5", "qs4", "qs5", "approve"), edge("qe6", "qs4", "qs6", "return"), edge("qe7", "qs5", "qs7", "APPROVED", "accent"), edge("qe8", "qs6", "qs16", "RETURNED", "accent"),
    edge("qe9", "qs7", "qs8", "SENT", "accent"), edge("qe10", "qs8", "qs9", "", "async"), edge("qe11", "qs9", "qs10"),
    edge("qe12", "qs10", "qs11", "ACCEPTED", "accent"), edge("qe13", "qs8", "qs12", "no PO in 30 days", "accent"), edge("qe14", "qs12", "qs13"),
    edge("qe15", "qs8", "qs14"), edge("qe16", "qs14", "qs15", "REJECTED", "accent"),
  ],
};

const requisition: SwimFlow = {
  id: "swim-req",
  title: "A requisition, from request to shelf",
  eyebrow: "Sales Admin · Requisition.status",
  summary: "Approval is the only wait; once approved, the warehouse picks the earliest-expiring lots and the hospital's consignment is refilled in the same step.",
  entityId: "ent-requisition",
  useCaseIds: ["uc-req", "uc-approve"],
  lanes: [
    ...rowsUnder("Sales Admin", "Requisition.status", [["rj-none", "NO REQUISITION", null], ["rj-sub", "SUBMITTED", "r-sub"], ["rj-app", "APPROVED", "r-app"], ["rj-rej", "REJECTED", "r-rej"], ["rj-iss", "ISSUED", "r-iss"]]),
    actorLane("rj-mgr", "Sales Manager"), actorLane("rj-wh", "Warehouse Officer"),
  ],
  steps: [
    step("rqs0", "rj-none", 0, "Start", { kind: "start" }),
    step("rqs1", "rj-none", 1, "Fill in items with reasons", { useCaseId: "uc-req", sourceNodeId: "rq3" }),
    step("rqs2", "rj-none", 2, "Submit the requisition", { sublabel: "POST /requisitions", useCaseId: "uc-req", sourceNodeId: "rq4", focal: true }),
    step("rqs3", "rj-sub", 3, "Wait for approval", { useCaseId: "uc-req" }),
    step("rqs4", "rj-mgr", 4, "Decide on the requisition", { kind: "decision", useCaseId: "uc-approve", sourceNodeId: "rq5" }),
    step("rqs5", "rj-rej", 5, "Rejected", { kind: "end" }),
    step("rqs6", "rj-app", 5, "Ready to pick", { useCaseId: "uc-req" }),
    step("rqs7", "rj-wh", 6, "Pick lots by earliest expiry", { sublabel: "FEFO", useCaseId: "uc-req", sourceNodeId: "rq9" }),
    step("rqs8", "rj-wh", 7, "Issue the stock", { sublabel: "POST /requisitions/{id}/issue", useCaseId: "uc-req", sourceNodeId: "rq10", focal: true }),
    step("rqs9", "rj-iss", 8, "Issued", { kind: "end" }),
  ],
  edges: [
    edge("rqe0", "rqs0", "rqs1"), edge("rqe1", "rqs1", "rqs2"), edge("rqe2", "rqs2", "rqs3", "SUBMITTED", "accent"), edge("rqe3", "rqs3", "rqs4"),
    edge("rqe4", "rqs4", "rqs5", "REJECTED", "accent"), edge("rqe5", "rqs4", "rqs6", "APPROVED", "accent"),
    edge("rqe6", "rqs6", "rqs7"), edge("rqe7", "rqs7", "rqs8"), edge("rqe8", "rqs8", "rqs9", "ISSUED", "accent"),
  ],
};

const invoice: SwimFlow = {
  id: "swim-invoice",
  title: "An invoice, until it's paid",
  eyebrow: "Accountant · Invoice.status",
  summary: "An invoice leaves ISSUED one of three ways — paid, disputed, or overdue — and only the clock moves it to OVERDUE, which is why a scheduler is part of the stack.",
  entityId: "ent-invoice",
  useCaseIds: ["uc-bill"],
  lanes: [
    ...rowsUnder("Accountant", "Invoice.status", [["ij-none", "NO INVOICE", null], ["ij-iss", "ISSUED", "i-iss"], ["ij-over", "OVERDUE", "i-over"], ["ij-paid", "PAID", "i-paid"], ["ij-void", "VOID", "i-void"]]),
    actorLane("ij-hosp", "Hospital Purchasing"),
  ],
  steps: [
    step("is0", "ij-none", 0, "Start", { kind: "start" }),
    step("is1", "ij-none", 1, "Open a requisitioned case", { useCaseId: "uc-bill", sourceNodeId: "bi2" }),
    step("is2", "ij-none", 2, "Issue the invoice", { sublabel: "POST /invoices", useCaseId: "uc-bill", sourceNodeId: "bi3", focal: true }),
    step("is3", "ij-iss", 3, "Send it to the hospital", { sublabel: "PDF · email", useCaseId: "uc-bill", sourceNodeId: "bi4" }),
    step("is4", "ij-hosp", 4, "Accept the invoice?", { kind: "decision", useCaseId: "uc-bill", sourceNodeId: "bi5" }),
    step("is5", "ij-iss", 5, "Record the payment", { sublabel: "POST /invoices/{id}/payments", useCaseId: "uc-bill", sourceNodeId: "bi9" }),
    step("is6", "ij-paid", 6, "Paid", { kind: "end" }),
    step("is7", "ij-over", 6, "Mark the invoice overdue", { sublabel: "scheduler · due date", useCaseId: "uc-bill", sourceNodeId: "bi11" }),
    step("is8", "ij-over", 7, "Record the late payment", { useCaseId: "uc-bill", sourceNodeId: "bi12" }),
    step("is9", "ij-void", 5, "Void the invoice", { sublabel: "credit note", useCaseId: "uc-bill", sourceNodeId: "bi6" }),
    step("is10", "ij-void", 6, "Voided", { kind: "end" }),
  ],
  edges: [
    edge("ie0", "is0", "is1"), edge("ie1", "is1", "is2"), edge("ie2", "is2", "is3", "ISSUED", "accent"), edge("ie3", "is3", "is4"),
    edge("ie4", "is4", "is5", "accepted"), edge("ie5", "is5", "is6", "PAID", "accent"),
    edge("ie6", "is5", "is7", "OVERDUE", "accent"), edge("ie7", "is7", "is8"), edge("ie8", "is8", "is6", "PAID", "accent"),
    edge("ie9", "is4", "is9", "VOID", "accent"), edge("ie10", "is9", "is10"),
  ],
};

const photo: SwimFlow = {
  id: "swim-photo",
  title: "A usage photo, read by AI",
  eyebrow: "Sales Representative · UsagePhoto.status",
  summary: "The rep's only work is the photo and the confirmation; between them the photo moves through UPLOADED and PROCESSING on its own, and an unreadable one fails fast so the rep can retake it while still in the OR.",
  entityId: "ent-photo",
  useCaseIds: ["uc-ocr"],
  lanes: rowsUnder("Sales Representative", "UsagePhoto.status", [["pj-none", "NO PHOTO", null], ["pj-up", "UPLOADED", "o-up"], ["pj-proc", "PROCESSING", "o-proc"], ["pj-ext", "EXTRACTED", "o-ext"], ["pj-conf", "CONFIRMED", "o-conf"], ["pj-fail", "FAILED", "o-fail"]]),
  steps: [
    step("ps0", "pj-none", 0, "Start", { kind: "start" }),
    step("ps1", "pj-none", 1, "Take the photo", { sublabel: "POST /cases/{id}/photos", useCaseId: "uc-ocr", sourceNodeId: "oc2" }),
    step("ps2", "pj-up", 2, "Queue the OCR job", { sublabel: "queue · async", useCaseId: "uc-ocr", sourceNodeId: "oc3" }),
    step("ps3", "pj-proc", 3, "AI reads the items", { sublabel: "OCR Service", useCaseId: "uc-ocr", sourceNodeId: "oc4" }),
    step("ps4", "pj-ext", 4, "Verify the extracted items", { sublabel: "tick · fix qty · add", useCaseId: "uc-ocr", sourceNodeId: "oc7", focal: true }),
    step("ps5", "pj-ext", 5, "Confirm the items", { useCaseId: "uc-ocr", sourceNodeId: "oc8" }),
    step("ps6", "pj-conf", 6, "Confirmed", { kind: "end" }),
    step("ps7", "pj-fail", 4, "Ask for a retake", { sublabel: "confidence < 0.6", useCaseId: "uc-ocr", sourceNodeId: "oc10" }),
    step("ps8", "pj-fail", 5, "Not readable", { kind: "end" }),
  ],
  edges: [
    edge("pe0", "ps0", "ps1"), edge("pe1", "ps1", "ps2", "UPLOADED", "accent"), edge("pe2", "ps2", "ps3", "PROCESSING", "accent"),
    edge("pe3", "ps3", "ps4", "EXTRACTED", "accent"), edge("pe4", "ps4", "ps5"), edge("pe5", "ps5", "ps6", "CONFIRMED", "accent"),
    edge("pe6", "ps3", "ps7", "FAILED", "accent"), edge("pe7", "ps7", "ps8"),
  ],
};

export const swimlanes: Record<string, SwimFlow> = Object.fromEntries([caseJourney, restock, onboarding, quotation, requisition, invoice, photo].map((f) => [f.id, f]));

/* ================================================================ stage 7: UI */

type El = Screen["elements"][number];
const el = (id: string, label: string, kind: El["kind"], extra: Partial<El> = {}): El => ({ id, label, kind, attributeId: null, required: false, stepId: null, note: "", ...extra });
const CASE_STATES = ["DRAFT", "USAGE_RECORDED", "QUOTED", "WAITING_PO", "PO_RECEIVED", "REQUISITIONED", "BILLED", "CLOSED", "CANCELLED"];

export const screens: Screen[] = [
  /* ---------------- Sales Rep mobile (PWA) ---------------- */
  {
    id: "scr-m-login", name: "Sign in", route: "/m/login", actorId: "act-rep", assets: ["logo.mark"],
    description: "Email and password, or company SSO. Healthcare for a Better Tomorrow.",
    stepIds: ["cs2"], statesShown: [], uiStates: ["loading", "error"],
    elements: [
      el("m1-1", "Email", "input", { attributeId: "user-email", required: true }),
      el("m1-2", "Password", "input", { required: true }),
      el("m1-3", "Sign in", "action", { stepId: "cs2" }),
      el("m1-4", "Sign in with SSO", "action", { stepId: "cs2" }),
    ],
  },
  {
    id: "scr-m-dash", name: "My dashboard", route: "/m", actorId: "act-rep",
    description: "Hello, Sinenart. My accounts, my cases, waiting PO, waiting billing, usage this month, recent activity.",
    stepIds: ["cs3"], statesShown: CASE_STATES, uiStates: ["empty", "loading", "error"],
    elements: [
      el("m2-1", "My cases", "display", { attributeId: "case-status" }),
      el("m2-2", "Waiting PO", "status", { attributeId: "case-status" }),
      el("m2-3", "Waiting billing", "status", { attributeId: "case-status" }),
      el("m2-4", "Usage this month", "display", { attributeId: "usage-qty" }),
      el("m2-5", "Recent activity", "list", { attributeId: "activity-action" }),
      el("m2-6", "Open a hospital account", "action", { stepId: "cs3" }),
      el("m2-7", "Scan", "action", { stepId: "rs3" }),
    ],
  },
  {
    id: "scr-m-accounts", name: "My accounts", route: "/m/accounts", actorId: "act-rep",
    description: "Every hospital I'm assigned to, with open cases, usage this month, waiting PO and waiting billing.",
    stepIds: ["cs3"], statesShown: [], uiStates: ["empty", "loading"],
    elements: [
      el("m3-1", "Search hospital", "input"),
      el("m3-2", "Hospitals", "list", { attributeId: "hospital-name" }),
      el("m3-3", "Open the account", "action", { stepId: "cs3" }),
    ],
  },
  {
    id: "scr-m-account", name: "Account detail", route: "/m/accounts/[id]", actorId: "act-rep", assets: ["hero.hospital"],
    description: "One hospital: Summary, Cases, Usage, PO, Billing tabs; recent usage with doctor and qty.",
    stepIds: ["cs3", "cs13"], statesShown: CASE_STATES, uiStates: ["empty", "loading"],
    elements: [
      el("m4-1", "Hospital", "display", { attributeId: "hospital-name" }),
      el("m4-2", "Cases this month", "display", { attributeId: "case-case_date" }),
      el("m4-3", "Case status", "status", { attributeId: "case-status" }),
      el("m4-4", "Recent usage", "list", { attributeId: "usage-qty" }),
      el("m4-5", "New case here", "action", { stepId: "cs4" }),
    ],
  },
  {
    id: "scr-m-newcase", name: "New case", route: "/m/cases/new", actorId: "act-rep",
    description: "Log a new case and capture usage: hospital, case date, doctor, patient HN, procedure, usage photos.",
    stepIds: ["cs4", "cs5", "ps1"], statesShown: ["NO CASE", "DRAFT"], uiStates: ["loading", "error", "success"],
    elements: [
      el("m5-1", "Hospital", "select", { attributeId: "case-hospital_id", required: true }),
      el("m5-2", "Case date", "input", { attributeId: "case-case_date", required: true }),
      el("m5-3", "Doctor", "select", { attributeId: "case-doctor_id" }),
      el("m5-4", "Patient HN", "input", { attributeId: "case-patient_hn", note: "masked after save" }),
      el("m5-5", "Procedure", "select", { attributeId: "case-procedure" }),
      el("m5-6", "Usage photo", "input", { attributeId: "photo-file_url" }),
      el("m5-7", "Next", "action", { stepId: "cs5" }),
    ],
  },
  {
    id: "scr-m-ocr", name: "Confirm usage items", route: "/m/cases/[id]/review", actorId: "act-rep",
    description: "AI extracted N items — please verify. Tick, correct quantities, add a missed item, confirm.",
    stepIds: ["cs7", "ps4", "ps5", "ps7"], statesShown: ["DRAFT", "USAGE_RECORDED"], uiStates: ["loading", "error", "success"],
    elements: [
      el("m6-1", "Usage photo", "display", { attributeId: "photo-file_url" }),
      el("m6-2", "AI extracted", "status", { attributeId: "photo-status" }),
      el("m6-3", "Extracted items", "list", { attributeId: "usage-product_id" }),
      el("m6-4", "Quantity", "input", { attributeId: "usage-qty", required: true }),
      el("m6-5", "Lot", "input", { attributeId: "usage-lot_id", required: true }),
      el("m6-6", "Add a missed item", "action", { stepId: "cs7" }),
      el("m6-7", "Confirm", "action", { stepId: "cs7" }),
    ],
  },
  {
    id: "scr-m-usage", name: "Usage center", route: "/m/usage", actorId: "act-rep",
    description: "Search and view all usage records by date, hospital and product.",
    stepIds: ["cs8"], statesShown: [], uiStates: ["empty", "loading"],
    elements: [
      el("m7-1", "Search product, doctor, hospital", "input"),
      el("m7-2", "Date", "select", { attributeId: "case-case_date" }),
      el("m7-3", "Hospital", "select", { attributeId: "case-hospital_id" }),
      el("m7-4", "Product", "select", { attributeId: "usage-product_id" }),
      el("m7-5", "Usage timeline", "list", { attributeId: "usage-qty" }),
    ],
  },
  {
    id: "scr-m-scan", name: "Scan barcode", route: "/m/scan", actorId: "act-rep",
    description: "Scan or search a barcode to see the product, REF, LOT and expiry, then its history.",
    stepIds: ["rs3"], statesShown: [], uiStates: ["loading", "error", "empty"],
    elements: [
      el("m8-1", "Camera viewfinder", "display"),
      el("m8-2", "Barcode", "input", { attributeId: "product-gtin" }),
      el("m8-3", "Product card", "display", { attributeId: "product-name" }),
      el("m8-4", "Lot and expiry", "display", { attributeId: "lot-expiry_date" }),
      el("m8-5", "View usage history", "action", { stepId: "rs4" }),
    ],
  },
  {
    id: "scr-m-history", name: "Product history", route: "/m/products/[id]", actorId: "act-rep",
    description: "Where and when this item was used: hospital, rep, case, date.",
    stepIds: ["rs4"], statesShown: [], uiStates: ["empty", "loading"],
    elements: [
      el("m9-1", "Product", "display", { attributeId: "product-name" }),
      el("m9-2", "Usage history", "list", { attributeId: "movement-at" }),
    ],
  },
  {
    id: "scr-m-case", name: "Case tracking", route: "/m/cases/[id]", actorId: "act-rep",
    description: "The full journey from usage to billing: Usage Recorded → Quotation → PO → Requisition → Billing → Closed.",
    stepIds: ["cs13", "cs24", "qs14"], statesShown: CASE_STATES, uiStates: ["loading", "error"],
    elements: [
      el("m10-1", "Case status", "status", { attributeId: "case-status" }),
      el("m10-2", "Journey timeline", "list", { attributeId: "activity-action" }),
      el("m10-3", "View quotation", "action", { stepId: "cs12" }),
      el("m10-4", "Upload PO", "action", { stepId: "cs13" }),
      el("m10-5", "Cancel case", "action", { stepId: "cs24" }),
      el("m10-6", "Cancellation reason", "input", { attributeId: "case-cancel_reason" }),
    ],
  },

  /* ---------------- Back-office web ---------------- */
  {
    id: "scr-w-quote", name: "Quotation editor", route: "/admin/quotations/new", actorId: "act-admin",
    description: "Document no., date, items (search or scan), unit, quantity, contract price, discount, VAT 7%; export PDF, send email, send LINE.",
    stepIds: ["cs9", "cs12", "qs1", "qs2", "qs3", "qs7"], statesShown: ["USAGE_RECORDED", "QUOTED", "WAITING_PO"], uiStates: ["loading", "error", "success"],
    elements: [
      el("w1-1", "Document no.", "display", { attributeId: "quotation-quote_no" }),
      el("w1-2", "Date", "input", { attributeId: "quotation-quote_date", required: true }),
      el("w1-3", "Search or scan item", "input", { attributeId: "product-gtin" }),
      el("w1-4", "Items", "list", { attributeId: "qitem-product_id" }),
      el("w1-5", "Quantity", "input", { attributeId: "qitem-qty", required: true }),
      el("w1-6", "Discount %", "input", { attributeId: "quotation-discount_pct" }),
      el("w1-7", "Total incl. VAT", "display", { attributeId: "quotation-total" }),
      el("w1-8", "Generate from case", "action", { stepId: "cs9" }),
      el("w1-9", "Send email", "action", { stepId: "cs12" }),
      el("w1-10", "Send to LINE", "action", { stepId: "cs12" }),
      el("w1-11", "Export PDF", "action", { stepId: "cs12" }),
      el("w1-12", "Quotation status", "status", { attributeId: "quotation-status" }),
    ],
  },
  {
    id: "scr-w-approvals", name: "Approvals inbox", route: "/admin/approvals", actorId: "act-mgr",
    description: "Quotations over the discount limit, requisitions and purchase requests waiting for a decision.",
    stepIds: ["cs11", "rs8", "qs5", "qs6", "rqs4"], statesShown: ["QUOTED", "SUBMITTED"], uiStates: ["empty", "loading"],
    elements: [
      el("w2-1", "Pending documents", "list", { attributeId: "approval-doc_type" }),
      el("w2-2", "Reason", "input", { attributeId: "approval-note" }),
      el("w2-3", "Approve", "action", { stepId: "cs11" }),
      el("w2-4", "Reject", "action", { stepId: "rs8" }),
    ],
  },
  {
    id: "scr-w-po", name: "Hospital POs", route: "/admin/pos", actorId: "act-admin",
    description: "Scan the PO barcode or type the number; PO saved, or PO not found.",
    stepIds: ["cs15", "qs10"], statesShown: ["WAITING_PO", "PO_RECEIVED"], uiStates: ["error", "success"],
    elements: [
      el("w3-1", "PO number", "input", { attributeId: "cpo-po_no", required: true }),
      el("w3-2", "Quotation", "select", { attributeId: "cpo-quotation_id", required: true }),
      el("w3-3", "PO amount", "input", { attributeId: "cpo-amount", required: true }),
      el("w3-4", "Save PO", "action", { stepId: "cs15" }),
      el("w3-5", "PO saved / not found", "status"),
    ],
  },
  {
    id: "scr-w-req", name: "Requisition", route: "/admin/requisitions/new", actorId: "act-admin",
    description: "Department, purpose, items with quantity and reason; submit for approval.",
    stepIds: ["cs17", "rqs1", "rqs2"], statesShown: ["PO_RECEIVED"], uiStates: ["error", "success"],
    elements: [
      el("w4-1", "Department", "select", { attributeId: "requisition-department", required: true }),
      el("w4-2", "Purpose", "input", { attributeId: "requisition-purpose", required: true }),
      el("w4-3", "Items", "list", { attributeId: "ritem-product_id" }),
      el("w4-4", "Quantity", "input", { attributeId: "ritem-qty", required: true }),
      el("w4-5", "Reason", "input", { attributeId: "ritem-reason" }),
      el("w4-6", "Submit request", "action", { stepId: "cs17" }),
    ],
  },
  {
    id: "scr-w-issue", name: "Issue stock", route: "/admin/requisitions/[id]/issue", actorId: "act-wh",
    description: "Lots proposed first-expiry-first-out; confirm and the stock moves.",
    stepIds: ["cs18", "rqs7", "rqs8"], statesShown: ["PO_RECEIVED", "REQUISITIONED"], uiStates: ["loading", "error", "success"],
    elements: [
      el("w5-1", "Pick list (FEFO)", "list", { attributeId: "lot-expiry_date" }),
      el("w5-2", "Issue the stock", "action", { stepId: "cs18" }),
      el("w5-3", "Requisition status", "status", { attributeId: "requisition-status" }),
    ],
  },
  {
    id: "scr-w-billing", name: "Billing", route: "/admin/billing", actorId: "act-acct",
    description: "Cases ready to bill; issue the invoice, record payment, see overdue.",
    stepIds: ["cs20", "cs22", "is1", "is2", "is3", "is5", "is7", "is8", "is9"], statesShown: ["REQUISITIONED", "BILLED", "CLOSED"], uiStates: ["empty", "loading", "success"],
    elements: [
      el("w6-1", "Ready to bill", "list", { attributeId: "case-case_no" }),
      el("w6-2", "Due date", "input", { attributeId: "invoice-due_date", required: true }),
      el("w6-3", "Issue invoice", "action", { stepId: "cs20" }),
      el("w6-4", "Record payment", "action", { stepId: "cs22" }),
      el("w6-5", "Invoice status", "status", { attributeId: "invoice-status" }),
    ],
  },
  {
    id: "scr-w-inventory", name: "Inventory search", route: "/admin/inventory", actorId: "act-wh",
    description: "Search by name or barcode: code, current stock, unit, expiry, location, batch, supplier; transaction history and stock details.",
    stepIds: ["rs2"], statesShown: [], uiStates: ["empty", "loading"],
    elements: [
      el("w7-1", "Item name or barcode", "input", { attributeId: "product-name" }),
      el("w7-2", "Item detail", "display", { attributeId: "product-ref" }),
      el("w7-3", "Stock by location", "list", { attributeId: "balance-qty" }),
      el("w7-4", "Transaction history", "list", { attributeId: "movement-kind" }),
      el("w7-5", "Search", "action", { stepId: "rs2" }),
    ],
  },
  {
    id: "scr-w-expiry", name: "Expiry watch", route: "/admin/inventory/expiring", actorId: "act-wh",
    description: "Lots expiring within 90 days, by hospital.",
    stepIds: ["rs5"], statesShown: [], uiStates: ["empty", "loading"],
    elements: [
      el("w8-1", "Expiring lots", "list", { attributeId: "lot-expiry_date" }),
      el("w8-2", "Plan rotation", "action", { stepId: "rs5" }),
    ],
  },
  {
    id: "scr-w-pr", name: "Purchase request", route: "/admin/purchase-requests/new", actorId: "act-wh",
    description: "Suggested reorder items, supplier, quantities; submit; download as PDF or Excel.",
    stepIds: ["rs6", "rs7"], statesShown: ["NO REQUEST", "SUBMITTED", "APPROVED", "REJECTED", "ORDERED"], uiStates: ["empty", "error", "success"],
    elements: [
      el("w9-1", "Suggested items", "list", { attributeId: "product-reorder_point" }),
      el("w9-2", "Supplier", "select", { attributeId: "pr-supplier_id", required: true }),
      el("w9-3", "Quantity", "input", { attributeId: "pritem-qty", required: true }),
      el("w9-4", "Needed by", "input", { attributeId: "pr-needed_by", required: true }),
      el("w9-5", "Submit", "action", { stepId: "rs7" }),
      el("w9-6", "Download PDF / Excel", "action", { stepId: "rs7" }),
      el("w9-7", "Request status", "status", { attributeId: "pr-status" }),
    ],
  },
  {
    id: "scr-w-supplierpo", name: "Supplier PO", route: "/admin/purchase-requests/[id]/order", actorId: "act-buyer",
    description: "Turn an approved request into a supplier PO and email it.",
    stepIds: ["rs11"], statesShown: ["APPROVED", "ORDERED"], uiStates: ["success", "error"],
    elements: [
      el("w10-1", "Supplier PO no.", "input", { attributeId: "pr-supplier_po_no", required: true }),
      el("w10-2", "Send PO to supplier", "action", { stepId: "rs11" }),
    ],
  },
  {
    id: "scr-w-receive", name: "Goods receipt", route: "/admin/receiving", actorId: "act-wh",
    description: "Scan delivered items; capture lot and expiry; post.",
    stepIds: ["rs14", "rs15"], statesShown: ["ORDERED", "RECEIVED"], uiStates: ["error", "success"],
    elements: [
      el("w11-1", "Scan item", "input", { attributeId: "product-gtin" }),
      el("w11-2", "Lot no.", "input", { attributeId: "lot-lot_no", required: true }),
      el("w11-3", "Expiry date", "input", { attributeId: "lot-expiry_date", required: true }),
      el("w11-4", "Post receipt", "action", { stepId: "rs15" }),
    ],
  },
  {
    id: "scr-w-master", name: "Master data", route: "/admin/master", actorId: "act-sysadmin",
    description: "Hospitals, doctors, products, suppliers, contract prices, users and hospital assignment.",
    stepIds: ["ob2", "ob3", "ob4"], statesShown: [], uiStates: ["empty", "error", "success"],
    elements: [
      el("w12-1", "Hospital name", "input", { attributeId: "hospital-name", required: true }),
      el("w12-2", "Hospital code", "input", { attributeId: "hospital-code", required: true }),
      el("w12-3", "Contract price", "input", { attributeId: "price-contract_price" }),
      el("w12-4", "Assign rep", "select", { attributeId: "assignment-user_id" }),
      el("w12-5", "Save", "action", { stepId: "ob4" }),
    ],
  },
];
