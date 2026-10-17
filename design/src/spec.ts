import type { Actor, ActivityFlow, Association, Feature, FlowNode, Lane, UseCase, UseCaseRelation } from "../../../truss/src/lib/model";

/* ============================================================ stage 1: use case */

export const features: Feature[] = [
  { id: "feat-case", name: "Case & Usage Capture", description: "Turning what was used in surgery into a recorded, stock-deducted case — by photo, by scan or by hand." },
  { id: "feat-sales", name: "Quotation & Hospital PO", description: "Pricing the usage, getting it approved, sending it, and chasing the hospital's purchase order." },
  { id: "feat-supply", name: "Stock & Procurement", description: "Refilling hospital consignment stock, buying from suppliers, and knowing what is where and when it expires." },
  { id: "feat-billing", name: "Billing", description: "Invoicing the hospital against its PO and closing the case once paid." },
  { id: "feat-access", name: "Access & Insight", description: "Who can see which hospitals, the dashboards, and the master data everything else reads." },
];

const A = (id: string, name: string, kind: Actor["kind"], description: string, x: number, y: number): Actor => ({ id, name, kind, description, x, y });

export const actors: Actor[] = [
  A("act-rep", "Sales Representative", "primary", "Owns a set of hospital accounts. Attends cases in the OR and records what was used, from a phone.", 40, 60),
  A("act-admin", "Sales Admin", "primary", "Back-office. Prices usage into quotations, records hospital POs and raises requisitions.", 40, 190),
  A("act-mgr", "Sales Manager", "primary", "Approves quotations over the discount limit, requisitions and purchase requests. Watches the pipeline.", 40, 320),
  A("act-wh", "Warehouse Officer", "primary", "Issues and receives stock, keeps lots and expiry dates honest, refills hospital consignment.", 40, 450),
  A("act-buyer", "Purchasing Officer", "primary", "Turns approved purchase requests into supplier POs.", 40, 580),
  A("act-acct", "Accountant", "primary", "Invoices the hospital against its PO, records payment and closes the case.", 40, 710),
  A("act-sysadmin", "System Admin", "primary", "Keeps hospitals, doctors, products, contract prices and user access up to date.", 40, 840),
  A("act-hospital", "Hospital Purchasing", "secondary", "The hospital's purchasing department: receives quotations and invoices, issues POs, pays.", 1500, 120),
  A("act-supplier", "Supplier", "secondary", "Manufacturer or importer the distributor buys from.", 1500, 260),
  A("act-ocr", "OCR Service", "system", "Vision model that reads usage sheets and sticker labels into structured items.", 1500, 400),
  A("act-line", "LINE Messaging", "system", "LINE Official Account used to send documents to hospital groups and alerts to reps.", 1500, 540),
  A("act-email", "Email Service", "system", "Transactional email for quotations, invoices and supplier POs.", 1500, 680),
  A("act-sso", "SSO Provider", "system", "Company identity provider (Microsoft Entra ID / Google Workspace).", 1500, 820),
];

const U = (id: string, featureId: string, name: string, description: string, priority: UseCase["priority"], x: number, y: number): UseCase => ({ id, featureId, name, description, priority, x, y });
const C1 = 420, C2 = 720, C3 = 1020;

export const useCases: UseCase[] = [
  U("uc-new-case", "feat-case", "Record a surgical case", "Create a case for a surgery at a hospital and record the consignment items it used.", "must", C1, 40),
  U("uc-ocr", "feat-case", "Extract usage from a photo", "Read a photo of barcode stickers: one sheet can hold several patients; each patient's stickers (REF LOT SERIAL) become one case for the rep to confirm.", "must", C1, 130),
  U("uc-scan", "feat-case", "Scan a product barcode", "Read a GS1 barcode (GTIN, lot, expiry) to identify an item.", "must", C1, 220),
  U("uc-cancel", "feat-case", "Cancel a case", "Withdraw a case recorded in error and return its stock to consignment.", "should", C1, 310),
  U("uc-history", "feat-case", "Trace a product's usage history", "See where and when each unit of a lot was used, by whom, in which case.", "should", C1, 400),
  U("uc-quote", "feat-sales", "Issue a quotation", "Price a case's usage at the hospital's contract price and send it as a PDF by email or LINE.", "must", C2, 40),
  U("uc-approve", "feat-sales", "Approve a pending document", "Manager approves or rejects quotations over the discount limit, requisitions and purchase requests.", "must", C2, 130),
  U("uc-po", "feat-sales", "Record a hospital PO", "Match the hospital's purchase order to its quotation by PO number or barcode.", "must", C2, 220),
  U("uc-followup", "feat-sales", "Follow up a quotation awaiting PO", "Chase quotations with no PO, expire them after their validity, or cancel on refusal.", "should", C2, 310),
  U("uc-req", "feat-supply", "Submit a stock requisition", "Request stock to be issued against a PO-received case and refill the hospital's consignment.", "must", C3, 40),
  U("uc-pr", "feat-supply", "Raise a purchase request", "Ask to buy from a supplier when warehouse stock falls below the reorder point.", "must", C3, 130),
  U("uc-receive", "feat-supply", "Receive goods from a supplier", "Book delivered items into the warehouse with their lot and expiry.", "should", C3, 220),
  U("uc-search", "feat-supply", "Search inventory", "Find an item by name or barcode: stock by location, lot, expiry, supplier, movements.", "must", C3, 310),
  U("uc-expiry", "feat-supply", "Monitor expiring consignment stock", "See lots expiring within 90 days at each hospital and plan rotation.", "should", C3, 400),
  U("uc-bill", "feat-billing", "Bill a case", "Invoice the hospital against its PO, record the payment and close the case.", "must", C2, 430),
  U("uc-signin", "feat-access", "Sign in to ConsignCare", "Sign in with email or company SSO; see only assigned hospitals.", "must", C1, 520),
  U("uc-dashboard", "feat-access", "Track case progress across hospitals", "See my cases, waiting PO, waiting billing and usage this month, per hospital.", "must", C2, 520),
  U("uc-master", "feat-access", "Maintain master data", "Hospitals, doctors, products, suppliers, contract prices, users and their hospital assignments.", "must", C3, 520),
];

const assoc: [string, string[]][] = [
  ["act-rep", ["uc-signin", "uc-dashboard", "uc-new-case", "uc-ocr", "uc-scan", "uc-cancel", "uc-history", "uc-followup", "uc-search", "uc-po"]],
  ["act-admin", ["uc-signin", "uc-dashboard", "uc-new-case", "uc-quote", "uc-po", "uc-followup", "uc-req", "uc-search", "uc-cancel"]],
  ["act-mgr", ["uc-signin", "uc-dashboard", "uc-approve", "uc-expiry"]],
  ["act-wh", ["uc-signin", "uc-req", "uc-pr", "uc-receive", "uc-search", "uc-expiry", "uc-scan", "uc-history"]],
  ["act-buyer", ["uc-signin", "uc-pr"]],
  ["act-acct", ["uc-signin", "uc-bill", "uc-dashboard"]],
  ["act-sysadmin", ["uc-signin", "uc-master"]],
  ["act-hospital", ["uc-quote", "uc-po", "uc-bill", "uc-followup"]],
  ["act-supplier", ["uc-pr", "uc-receive"]],
  ["act-ocr", ["uc-ocr"]],
  ["act-line", ["uc-quote", "uc-followup"]],
  ["act-email", ["uc-quote", "uc-bill", "uc-pr"]],
  ["act-sso", ["uc-signin"]],
];
let an = 0;
export const associations: Association[] = assoc.flatMap(([actorId, ucs]) => ucs.map((useCaseId) => ({ id: `as-${++an}`, actorId, useCaseId })));

export const relations: UseCaseRelation[] = [
  { id: "rel-ocr", fromId: "uc-ocr", toId: "uc-new-case", kind: "extend", condition: "a usage-sheet photo is attached" },
  { id: "rel-scan", fromId: "uc-scan", toId: "uc-new-case", kind: "extend", condition: "items are scanned one by one" },
  { id: "rel-hist", fromId: "uc-history", toId: "uc-scan", kind: "include", condition: "" },
];

/* ======================================================== stage 2: activity */

const LANE: Record<string, Lane> = {
  rep: { id: "lane-rep", name: "Sales Representative", actorId: "act-rep" },
  admin: { id: "lane-admin", name: "Sales Admin", actorId: "act-admin" },
  mgr: { id: "lane-mgr", name: "Sales Manager", actorId: "act-mgr" },
  wh: { id: "lane-wh", name: "Warehouse Officer", actorId: "act-wh" },
  buyer: { id: "lane-buyer", name: "Purchasing Officer", actorId: "act-buyer" },
  acct: { id: "lane-acct", name: "Accountant", actorId: "act-acct" },
  sysadmin: { id: "lane-sysadmin", name: "System Admin", actorId: "act-sysadmin" },
  hospital: { id: "lane-hospital", name: "Hospital Purchasing", actorId: "act-hospital" },
  ocr: { id: "lane-ocr", name: "OCR Service", actorId: "act-ocr" },
  sys: { id: "lane-sys", name: "ConsignCare", actorId: null },
};

/** [id, kind, label, lane, column, causes ([entity, transition]), dy] */
type N = [string, FlowNode["kind"], string, string, number, ([string, string][])?, number?];

function flow(useCaseId: string, laneKeys: string[], nodes: N[], edges: [string, string, string?][]): ActivityFlow {
  const lanes = laneKeys.map((k) => LANE[k]);
  const uc = useCases.find((u) => u.id === useCaseId)!;
  const off = { start: 78, end: 78, merge: 78, action: 74, decision: 64 } as const;
  return {
    id: `flow-${useCaseId.slice(3)}`,
    useCaseId,
    tracedName: uc.name,
    lanes,
    nodes: nodes.map(([id, kind, label, lane, col, causes = [], dy = 0]) => ({
      id,
      kind,
      label,
      laneId: LANE[lane].id,
      x: 40 + col * 230,
      y: laneKeys.indexOf(lane) * 210 + off[kind] + dy,
      causes: causes.map(([entityId, transitionId]) => ({ entityId, transitionId })),
    })),
    edges: edges.map(([from, to, guard = ""], i) => ({ id: `${useCaseId.slice(3)}-e${i + 1}`, from, to, guard })),
  };
}

const CASE = "ent-case", QUO = "ent-quotation", REQ = "ent-requisition", PR = "ent-pr", INV = "ent-invoice", PHOTO = "ent-photo";

export const flows: Record<string, ActivityFlow> = Object.fromEntries(
  [
    flow("uc-signin", ["rep", "sys"], [
      ["si1", "start", "Start", "rep", 0],
      ["si2", "action", "Enter credentials", "rep", 1],
      ["si3", "decision", "Credentials valid?", "sys", 2],
      ["si4", "action", "Load assigned hospitals", "sys", 3],
      ["si5", "action", "Open the dashboard", "rep", 4],
      ["si6", "end", "Signed in", "rep", 5],
      ["si7", "action", "Show the sign-in error", "sys", 3, [], 90],
      ["si8", "end", "Refused", "sys", 4, [], 90],
    ], [["si1", "si2"], ["si2", "si3"], ["si3", "si4", "yes"], ["si3", "si7", "no"], ["si4", "si5"], ["si5", "si6"], ["si7", "si8"]]),

    flow("uc-dashboard", ["rep", "sys"], [
      ["db1", "start", "Start", "rep", 0],
      ["db2", "action", "Open the dashboard", "rep", 1],
      ["db3", "action", "Count cases by status per hospital", "sys", 2],
      ["db4", "decision", "Drill into a hospital?", "rep", 3],
      ["db5", "action", "Show the account summary", "sys", 4],
      ["db6", "action", "Open a case journey", "rep", 5],
      ["db7", "end", "Case journey open", "rep", 6],
      ["db8", "end", "Overview only", "sys", 4, [], 100],
    ], [["db1", "db2"], ["db2", "db3"], ["db3", "db4"], ["db4", "db5", "yes"], ["db4", "db8", "no"], ["db5", "db6"], ["db6", "db7"]]),

    flow("uc-new-case", ["rep", "sys"], [
      ["nc1", "start", "Start", "rep", 0],
      ["nc2", "action", "Choose the hospital", "rep", 1],
      ["nc3", "action", "Enter the case details", "rep", 2],
      ["nc4", "action", "Create the draft case", "sys", 3, [[CASE, "ct1"]]],
      ["nc5", "decision", "Capture usage how?", "rep", 4],
      ["nc6", "action", "Attach usage-sheet photos", "rep", 5, [], -60],
      ["nc7", "action", "Scan item barcodes", "rep", 5, [], 60],
      ["nc8", "merge", "Items listed", "rep", 6],
      ["nc9", "action", "Review the item list", "rep", 7],
      ["nc10", "decision", "Items correct?", "rep", 8],
      ["nc11", "action", "Correct an item", "rep", 8, [], 110],
      ["nc12", "action", "Confirm the usage", "rep", 9],
      ["nc13", "action", "Deduct consignment stock", "sys", 10, [[CASE, "ct2"]]],
      ["nc14", "action", "Notify the sales admin", "sys", 11],
      ["nc15", "end", "Usage recorded", "sys", 12],
      ["nc16", "end", "Draft kept for later", "rep", 5, [], 170],
    ], [["nc1", "nc2"], ["nc2", "nc3"], ["nc3", "nc4"], ["nc4", "nc5"], ["nc5", "nc6", "photo"], ["nc5", "nc7", "barcode"], ["nc5", "nc16", "later"], ["nc6", "nc8"], ["nc7", "nc8"], ["nc8", "nc9"], ["nc9", "nc10"], ["nc10", "nc12", "yes"], ["nc10", "nc11", "no"], ["nc11", "nc9"], ["nc12", "nc13"], ["nc13", "nc14"], ["nc14", "nc15"]]),

    flow("uc-ocr", ["rep", "sys", "ocr"], [
      ["oc1", "start", "Start", "rep", 0],
      ["oc2", "action", "Upload the usage photo", "rep", 1, [[PHOTO, "ot1"]]],
      ["oc3", "action", "Queue the OCR job", "sys", 2, [[PHOTO, "ot2"]]],
      ["oc4", "action", "Read items from the photo", "ocr", 3],
      ["oc5", "decision", "Readable?", "sys", 4],
      ["oc6", "action", "Group stickers under each patient", "sys", 5, [[PHOTO, "ot3"]]],
      ["oc7", "action", "Verify each patient's items", "rep", 6],
      ["oc8", "action", "Confirm one case per patient", "rep", 7, [[PHOTO, "ot5"]]],
      ["oc9", "end", "Cases created", "rep", 8],
      ["oc10", "action", "Ask for a retake", "sys", 5, [[PHOTO, "ot4"]], 100],
      ["oc11", "end", "Not readable", "sys", 6, [], 100],
    ], [["oc1", "oc2"], ["oc2", "oc3"], ["oc3", "oc4"], ["oc4", "oc5"], ["oc5", "oc6", "yes"], ["oc5", "oc10", "no"], ["oc6", "oc7"], ["oc7", "oc8"], ["oc8", "oc9"], ["oc10", "oc11"]]),

    flow("uc-scan", ["rep", "sys"], [
      ["sc1", "start", "Start", "rep", 0],
      ["sc2", "action", "Aim the camera at the barcode", "rep", 1],
      ["sc3", "action", "Decode GTIN, lot and expiry", "sys", 2],
      ["sc4", "decision", "Product known?", "sys", 3],
      ["sc5", "action", "Show the product card", "sys", 4],
      ["sc6", "end", "Identified", "rep", 5],
      ["sc7", "action", "Offer a manual search", "sys", 4, [], 100],
      ["sc8", "end", "Not identified", "sys", 5, [], 100],
    ], [["sc1", "sc2"], ["sc2", "sc3"], ["sc3", "sc4"], ["sc4", "sc5", "yes"], ["sc4", "sc7", "no"], ["sc5", "sc6"], ["sc7", "sc8"]]),

    flow("uc-cancel", ["rep", "sys"], [
      ["cc1", "start", "Start", "rep", 0],
      ["cc2", "action", "Open the case", "rep", 1],
      ["cc3", "decision", "Already billed?", "sys", 2],
      ["cc4", "action", "Give a cancellation reason", "rep", 3],
      ["cc5", "action", "Cancel the case", "sys", 4, [[CASE, "ct9"], [CASE, "ct10"]]],
      ["cc6", "action", "Return stock to consignment", "sys", 5],
      ["cc7", "end", "Cancelled", "sys", 6],
      ["cc8", "action", "Refer to accounting", "sys", 3, [], 100],
      ["cc9", "end", "Not cancelled", "sys", 4, [], 100],
    ], [["cc1", "cc2"], ["cc2", "cc3"], ["cc3", "cc4", "no"], ["cc3", "cc8", "yes"], ["cc4", "cc5"], ["cc5", "cc6"], ["cc6", "cc7"], ["cc8", "cc9"]]),

    flow("uc-history", ["rep", "sys"], [
      ["hi1", "start", "Start", "rep", 0],
      ["hi2", "action", "Scan the product barcode", "rep", 1],
      ["hi3", "decision", "Lot on record?", "sys", 2],
      ["hi4", "action", "Collect every movement of the lot", "sys", 3],
      ["hi5", "action", "Show where it was used", "rep", 4],
      ["hi6", "end", "Traced", "rep", 5],
      ["hi7", "end", "Unknown lot", "sys", 3, [], 100],
    ], [["hi1", "hi2"], ["hi2", "hi3"], ["hi3", "hi4", "yes"], ["hi3", "hi7", "no"], ["hi4", "hi5"], ["hi5", "hi6"]]),

    flow("uc-quote", ["admin", "sys", "mgr"], [
      ["qu1", "start", "Start", "admin", 0],
      ["qu2", "action", "Open a usage-recorded case", "admin", 1],
      ["qu3", "action", "Generate the quotation from usage", "sys", 2, [[QUO, "qt1"], [CASE, "ct3"]]],
      ["qu4", "action", "Adjust the discount", "admin", 3],
      ["qu5", "action", "Submit the quotation", "admin", 4],
      ["qu6", "decision", "Discount over 10%?", "sys", 5],
      ["qu7", "action", "Request manager approval", "sys", 6, [[QUO, "qt2"]]],
      ["qu8", "decision", "Approve?", "mgr", 7],
      ["qu9", "action", "Approve the quotation", "mgr", 8, [[QUO, "qt4"]]],
      ["qu10", "action", "Return with a comment", "mgr", 8, [[QUO, "qt5"]], 100],
      ["qu11", "action", "Auto-approve within limit", "sys", 6, [[QUO, "qt3"]], 100],
      ["qu12", "merge", "Approved", "sys", 9],
      ["qu13", "action", "Render the PDF quotation", "sys", 10],
      ["qu14", "decision", "Send by?", "admin", 11],
      ["qu15", "action", "Email the hospital", "sys", 12, [], -50],
      ["qu16", "action", "Post to the hospital LINE group", "sys", 12, [], 60],
      ["qu17", "merge", "Delivered", "sys", 13],
      ["qu18", "action", "Mark the quotation sent", "sys", 14, [[QUO, "qt6"], [CASE, "ct4"]]],
      ["qu19", "end", "Waiting PO", "sys", 15],
      ["qu20", "end", "Returned to the admin", "mgr", 9, [], 100],
    ], [["qu1", "qu2"], ["qu2", "qu3"], ["qu3", "qu4"], ["qu4", "qu5"], ["qu5", "qu6"], ["qu6", "qu7", "yes"], ["qu6", "qu11", "no"], ["qu7", "qu8"], ["qu8", "qu9", "approve"], ["qu8", "qu10", "return"], ["qu10", "qu20"], ["qu9", "qu12"], ["qu11", "qu12"], ["qu12", "qu13"], ["qu13", "qu14"], ["qu14", "qu15", "email"], ["qu14", "qu16", "LINE"], ["qu15", "qu17"], ["qu16", "qu17"], ["qu17", "qu18"], ["qu18", "qu19"]]),

    flow("uc-approve", ["mgr", "sys"], [
      ["ap1", "start", "Start", "mgr", 0],
      ["ap2", "action", "Open the approvals inbox", "mgr", 1],
      ["ap3", "action", "Review the document", "mgr", 2],
      ["ap4", "decision", "Decision?", "mgr", 3],
      ["ap5", "action", "Record the approval", "sys", 4, [[QUO, "qt4"], [REQ, "rt2"], [PR, "prt2"]]],
      ["ap6", "action", "Record the rejection reason", "sys", 4, [[QUO, "qt5"], [REQ, "rt3"], [PR, "prt3"]], 100],
      ["ap7", "action", "Release the document to the next step", "sys", 5],
      ["ap8", "action", "Notify the requester with the reason", "sys", 5, [], 100],
      ["ap9", "end", "Approved and released", "sys", 6],
      ["ap10", "end", "Rejected with reason sent", "sys", 6, [], 100],
    ], [["ap1", "ap2"], ["ap2", "ap3"], ["ap3", "ap4"], ["ap4", "ap5", "approve"], ["ap4", "ap6", "reject"], ["ap5", "ap7"], ["ap6", "ap8"], ["ap7", "ap9"], ["ap8", "ap10"]]),

    flow("uc-po", ["hospital", "admin", "sys"], [
      ["po1", "start", "Start", "hospital", 0],
      ["po2", "action", "Send the purchase order", "hospital", 1],
      ["po3", "action", "Scan the PO barcode", "admin", 2],
      ["po4", "decision", "Quotation found?", "sys", 3],
      ["po5", "decision", "Amount matches?", "sys", 4],
      ["po6", "action", "Save the PO against the quotation", "sys", 5, [[QUO, "qt7"], [CASE, "ct5"]]],
      ["po7", "end", "PO saved", "sys", 6],
      ["po8", "action", "Flag the difference", "admin", 5],
      ["po9", "end", "Held for review", "admin", 6],
      ["po10", "action", "Show PO not found", "sys", 4, [], 110],
      ["po11", "end", "Not recorded", "sys", 5, [], 110],
    ], [["po1", "po2"], ["po2", "po3"], ["po3", "po4"], ["po4", "po5", "yes"], ["po4", "po10", "no"], ["po5", "po6", "yes"], ["po5", "po8", "no"], ["po6", "po7"], ["po8", "po9"], ["po10", "po11"]]),

    flow("uc-followup", ["rep", "sys"], [
      ["fu1", "start", "Start", "sys", 0],
      ["fu2", "action", "List quotations waiting for a PO", "sys", 1],
      ["fu3", "decision", "Past the 30-day validity?", "sys", 2],
      ["fu4", "action", "Expire the quotation", "sys", 3, [[QUO, "qt8"]], 100],
      ["fu5", "action", "Alert the sales rep on LINE", "sys", 4, [], 100],
      ["fu6", "end", "Expired", "sys", 5, [], 100],
      ["fu7", "action", "Remind the hospital", "rep", 3],
      ["fu8", "decision", "Hospital declines?", "rep", 4],
      ["fu9", "action", "Withdraw the quotation", "rep", 5, [[QUO, "qt9"], [CASE, "ct11"]]],
      ["fu10", "end", "Withdrawn", "rep", 6],
      ["fu11", "end", "Still waiting", "rep", 5, [], 100],
    ], [["fu1", "fu2"], ["fu2", "fu3"], ["fu3", "fu4", "yes"], ["fu3", "fu7", "no"], ["fu4", "fu5"], ["fu5", "fu6"], ["fu7", "fu8"], ["fu8", "fu9", "yes"], ["fu8", "fu11", "no"], ["fu9", "fu10"]]),

    flow("uc-req", ["admin", "mgr", "wh", "sys"], [
      ["rq1", "start", "Start", "admin", 0],
      ["rq2", "action", "Pick the PO-received case", "admin", 1],
      ["rq3", "action", "Fill in items with reasons", "admin", 2],
      ["rq4", "action", "Submit the requisition", "admin", 3, [[REQ, "rt1"]]],
      ["rq5", "decision", "Approve?", "mgr", 4],
      ["rq6", "action", "Approve the requisition", "mgr", 5, [[REQ, "rt2"]]],
      ["rq7", "action", "Reject the requisition", "mgr", 5, [[REQ, "rt3"]], 100],
      ["rq8", "end", "Rejected", "mgr", 6, [], 100],
      ["rq9", "action", "Pick lots by earliest expiry", "wh", 6],
      ["rq10", "action", "Issue the stock", "wh", 7, [[REQ, "rt4"], [CASE, "ct6"]]],
      ["rq11", "action", "Post the stock movements", "sys", 8],
      ["rq12", "decision", "Below reorder point?", "sys", 9],
      ["rq13", "action", "Draft a purchase request", "sys", 10],
      ["rq14", "end", "Issued with PR drafted", "sys", 11],
      ["rq15", "end", "Issued", "sys", 10, [], 100],
    ], [["rq1", "rq2"], ["rq2", "rq3"], ["rq3", "rq4"], ["rq4", "rq5"], ["rq5", "rq6", "yes"], ["rq5", "rq7", "no"], ["rq7", "rq8"], ["rq6", "rq9"], ["rq9", "rq10"], ["rq10", "rq11"], ["rq11", "rq12"], ["rq12", "rq13", "yes"], ["rq12", "rq15", "no"], ["rq13", "rq14"]]),

    flow("uc-pr", ["wh", "mgr", "buyer", "sys"], [
      ["pr1", "start", "Start", "wh", 0],
      ["pr2", "action", "Review suggested reorder items", "wh", 1],
      ["pr3", "action", "Submit the purchase request", "wh", 2, [[PR, "prt1"]]],
      ["pr4", "decision", "Approve?", "mgr", 3],
      ["pr5", "action", "Approve the purchase request", "mgr", 4, [[PR, "prt2"]]],
      ["pr6", "action", "Reject the purchase request", "mgr", 4, [[PR, "prt3"]], 100],
      ["pr7", "end", "Rejected", "mgr", 5, [], 100],
      ["pr8", "action", "Create the supplier PO", "buyer", 5],
      ["pr9", "action", "Email the PO to the supplier", "sys", 6, [[PR, "prt4"]]],
      ["pr10", "end", "Ordered", "sys", 7],
    ], [["pr1", "pr2"], ["pr2", "pr3"], ["pr3", "pr4"], ["pr4", "pr5", "yes"], ["pr4", "pr6", "no"], ["pr6", "pr7"], ["pr5", "pr8"], ["pr8", "pr9"], ["pr9", "pr10"]]),

    flow("uc-receive", ["wh", "sys"], [
      ["gr1", "start", "Start", "wh", 0],
      ["gr2", "action", "Scan the delivered items", "wh", 1],
      ["gr3", "action", "Capture lot and expiry", "wh", 2],
      ["gr4", "decision", "Matches the supplier PO?", "sys", 3],
      ["gr5", "action", "Post the goods receipt", "sys", 4, [[PR, "prt5"]]],
      ["gr6", "end", "Received", "sys", 5],
      ["gr7", "action", "Record the discrepancy", "wh", 4],
      ["gr8", "end", "Discrepancy logged", "wh", 5],
    ], [["gr1", "gr2"], ["gr2", "gr3"], ["gr3", "gr4"], ["gr4", "gr5", "yes"], ["gr4", "gr7", "no"], ["gr5", "gr6"], ["gr7", "gr8"]]),

    flow("uc-search", ["wh", "sys"], [
      ["se1", "start", "Start", "wh", 0],
      ["se2", "action", "Type a name or scan", "wh", 1],
      ["se3", "action", "Find matching items", "sys", 2],
      ["se4", "decision", "Any match?", "sys", 3],
      ["se5", "action", "Show stock by location and lot", "sys", 4],
      ["se6", "action", "Open the transaction history", "wh", 5],
      ["se7", "end", "Found", "wh", 6],
      ["se8", "end", "No results", "sys", 4, [], 100],
    ], [["se1", "se2"], ["se2", "se3"], ["se3", "se4"], ["se4", "se5", "yes"], ["se4", "se8", "no"], ["se5", "se6"], ["se6", "se7"]]),

    flow("uc-expiry", ["wh", "sys"], [
      ["ex1", "start", "Start", "wh", 0],
      ["ex2", "action", "Open the expiry watch", "wh", 1],
      ["ex3", "action", "List lots expiring within 90 days", "sys", 2],
      ["ex4", "decision", "Rotate the lot?", "wh", 3],
      ["ex5", "action", "Plan a stock rotation", "wh", 4],
      ["ex6", "end", "Rotation planned", "wh", 5],
      ["ex7", "end", "Left in place", "wh", 4, [], 100],
    ], [["ex1", "ex2"], ["ex2", "ex3"], ["ex3", "ex4"], ["ex4", "ex5", "yes"], ["ex4", "ex7", "no"], ["ex5", "ex6"]]),

    flow("uc-bill", ["acct", "sys", "hospital"], [
      ["bi1", "start", "Start", "acct", 0],
      ["bi2", "action", "Open a requisitioned case", "acct", 1],
      ["bi3", "action", "Issue the invoice", "acct", 2, [[INV, "it1"], [CASE, "ct7"]]],
      ["bi4", "action", "Send the invoice to the hospital", "sys", 3],
      ["bi5", "decision", "Invoice accepted?", "hospital", 4],
      ["bi6", "action", "Void the invoice", "acct", 5, [[INV, "it5"]], 100],
      ["bi7", "end", "Voided", "acct", 6, [], 100],
      ["bi8", "decision", "Paid by the due date?", "sys", 5],
      ["bi9", "action", "Record the payment", "acct", 6, [[INV, "it2"], [CASE, "ct8"]]],
      ["bi10", "end", "Case closed", "acct", 8],
      ["bi11", "action", "Mark the invoice overdue", "sys", 6, [[INV, "it3"]], 100],
      ["bi12", "action", "Record the late payment", "acct", 7, [[INV, "it4"], [CASE, "ct8"]], 50],
    ], [["bi1", "bi2"], ["bi2", "bi3"], ["bi3", "bi4"], ["bi4", "bi5"], ["bi5", "bi8", "yes"], ["bi5", "bi6", "no"], ["bi6", "bi7"], ["bi8", "bi9", "yes"], ["bi8", "bi11", "no"], ["bi9", "bi10"], ["bi11", "bi12"], ["bi12", "bi10"]]),

    flow("uc-master", ["sysadmin", "sys"], [
      ["md1", "start", "Start", "sysadmin", 0],
      ["md2", "action", "Choose a master list", "sysadmin", 1],
      ["md3", "action", "Edit a record", "sysadmin", 2],
      ["md4", "decision", "Valid?", "sys", 3],
      ["md5", "action", "Save with an audit entry", "sys", 4],
      ["md6", "end", "Saved", "sys", 5],
      ["md7", "action", "Show the validation errors", "sys", 4, [], 100],
      ["md8", "end", "Not saved", "sys", 5, [], 100],
    ], [["md1", "md2"], ["md2", "md3"], ["md3", "md4"], ["md4", "md5", "yes"], ["md4", "md7", "no"], ["md7", "md8"], ["md5", "md6"]]),
  ].map((f) => [f.useCaseId, f]),
);
