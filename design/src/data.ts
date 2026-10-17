import type { Attribute, Entity, Relationship, StateMachine } from "../../../truss/src/lib/model";

/* ============================================================== stage 3: ER */

type Col = [name: string, type: Attribute["type"], opts?: { pk?: boolean; opt?: boolean; unique?: boolean; ref?: string; note?: string }];

function E(id: string, name: string, description: string, touches: string[], x: number, y: number, cols: Col[]): Entity {
  const short = id.slice(4);
  return {
    id,
    name,
    description,
    touches,
    x,
    y,
    attributes: [["id", "uuid", { pk: true }] as Col, ...cols].map(([n, type, o = {}]) => ({
      id: `${short}-${n}`,
      name: n,
      type,
      pk: !!o.pk,
      required: !o.opt,
      unique: !!o.unique,
      references: o.ref ?? null,
      note: o.note ?? "",
    })),
  };
}

const col = (i: number) => 40 + i * 300;
const row = (i: number) => 40 + i * 300;

export const entities: Entity[] = [
  E("ent-user", "User", "Anyone who signs in: reps, admins, managers, warehouse, purchasing, accounting.", ["uc-signin", "uc-master"], col(0), row(0), [
    ["name", "text"], ["email", "text", { unique: true }], ["role", "enum", { note: "REP | ADMIN | MANAGER | WAREHOUSE | PURCHASING | ACCOUNTING | SYSADMIN" }], ["phone", "text", { opt: true }], ["active", "boolean"],
  ]),
  E("ent-hospital", "Hospital", "A customer account where consignment stock is placed.", ["uc-master", "uc-dashboard", "uc-new-case"], col(1), row(0), [
    ["code", "text", { unique: true }], ["name", "text"], ["tax_id", "text"], ["address", "text"], ["contact_email", "text"], ["line_group_id", "text", { opt: true }],
  ]),
  E("ent-assignment", "Hospital Assignment", "Which users may see which hospitals — the row-level access rule.", ["uc-signin", "uc-master"], col(0), row(1), [
    ["user_id", "uuid", { ref: "ent-user" }], ["hospital_id", "uuid", { ref: "ent-hospital" }],
  ]),
  E("ent-doctor", "Doctor", "Surgeon at a hospital; optional on a case.", ["uc-new-case", "uc-master"], col(2), row(0), [
    ["hospital_id", "uuid", { ref: "ent-hospital" }], ["code", "text", { opt: true, note: "hospital doctor code printed on patient stickers, e.g. 1152" }], ["name", "text"], ["specialty", "text", { opt: true }],
  ]),
  E("ent-supplier", "Supplier", "Manufacturer or importer the distributor buys from.", ["uc-pr", "uc-master"], col(6), row(0), [
    ["name", "text"], ["email", "text"], ["tax_id", "text"],
  ]),
  E("ent-product", "Product", "A catalogue item: REF, GS1 GTIN, unit and list price.", ["uc-master", "uc-search", "uc-scan", "uc-quote"], col(5), row(0), [
    ["ref", "text", { unique: true }], ["name", "text"], ["gtin", "text", { unique: true }], ["unit", "text"], ["list_price", "decimal"], ["reorder_point", "integer"], ["supplier_id", "uuid", { ref: "ent-supplier" }],
  ]),
  E("ent-price", "Contract Price", "The price a hospital pays for a product, for a period.", ["uc-quote", "uc-master"], col(3), row(0), [
    ["hospital_id", "uuid", { ref: "ent-hospital" }], ["product_id", "uuid", { ref: "ent-product" }], ["contract_price", "decimal"], ["valid_from", "date"], ["valid_to", "date"],
  ]),
  E("ent-location", "Location", "Where stock sits: the main warehouse or one hospital's consignment store.", ["uc-search", "uc-req"], col(4), row(1), [
    ["kind", "enum", { note: "WAREHOUSE | HOSPITAL" }], ["name", "text"], ["hospital_id", "uuid", { opt: true, ref: "ent-hospital", note: "set when kind = HOSPITAL" }],
  ]),
  E("ent-lot", "Lot", "A batch of one product with its expiry date.", ["uc-scan", "uc-receive", "uc-expiry", "uc-history"], col(5), row(1), [
    ["product_id", "uuid", { ref: "ent-product" }], ["lot_no", "text"], ["expiry_date", "date"],
  ]),
  E("ent-balance", "Stock Balance", "Quantity of a lot at a location — what is on the shelf now.", ["uc-search", "uc-expiry", "uc-req"], col(4), row(2), [
    ["location_id", "uuid", { ref: "ent-location" }], ["lot_id", "uuid", { ref: "ent-lot" }], ["qty", "integer"],
  ]),
  E("ent-movement", "Stock Movement", "Append-only ledger: every IN, OUT, TRANSFER and ADJUST, with the document that caused it.", ["uc-new-case", "uc-req", "uc-receive", "uc-search", "uc-history"], col(5), row(2), [
    ["kind", "enum", { note: "IN | OUT | TRANSFER | ADJUST" }], ["lot_id", "uuid", { ref: "ent-lot" }], ["qty", "integer"], ["from_location_id", "uuid", { opt: true, ref: "ent-location" }], ["to_location_id", "uuid", { opt: true, ref: "ent-location" }], ["ref_type", "text"], ["ref_no", "text"], ["at", "timestamp"], ["by_user_id", "uuid", { ref: "ent-user" }],
  ]),
  E("ent-case", "Case", "One surgery at one hospital and everything used in it — the spine from usage to cash.", ["uc-new-case", "uc-cancel", "uc-dashboard", "uc-quote", "uc-po", "uc-req", "uc-bill"], col(1), row(2), [
    ["case_no", "text", { unique: true }], ["hospital_id", "uuid", { ref: "ent-hospital" }], ["rep_id", "uuid", { ref: "ent-user" }], ["doctor_id", "uuid", { opt: true, ref: "ent-doctor" }], ["patient_hn", "text", { opt: true, note: "personal data — masked in lists, PDPA" }], ["patient_an", "text", { opt: true, note: "admission number from the patient sticker — personal data" }], ["procedure", "text", { opt: true }], ["case_date", "date"], ["status", "enum"], ["cancel_reason", "text", { opt: true }], ["created_at", "timestamp"],
  ]),
  E("ent-photo", "Usage Photo", "A photo of the usage sheet — one or more patient stickers, each followed by its equipment stickers (REF LOT SERIAL) — and the job reading it.", ["uc-ocr"], col(0), row(3), [
    ["case_id", "uuid", { ref: "ent-case" }], ["file_url", "text"], ["status", "enum"], ["confidence", "decimal", { opt: true }], ["extracted", "json", { opt: true }],
  ]),
  E("ent-usage", "Usage Item", "One product and lot used in a case, how many, at what price, and how it was captured.", ["uc-new-case", "uc-ocr", "uc-quote", "uc-history"], col(1), row(3), [
    ["case_id", "uuid", { ref: "ent-case" }], ["product_id", "uuid", { ref: "ent-product" }], ["lot_id", "uuid", { ref: "ent-lot" }], ["serial_no", "text", { opt: true, note: "third token of the hospital sticker: REF LOT SERIAL" }], ["qty", "integer"], ["unit_price", "decimal"], ["source", "enum", { note: "OCR | SCAN | MANUAL" }],
  ]),
  E("ent-quotation", "Quotation", "ใบเสนอราคา — the priced usage sent to the hospital.", ["uc-quote", "uc-approve", "uc-po", "uc-followup"], col(2), row(2), [
    ["quote_no", "text", { unique: true, note: "QT-YYYY-NNN, no gaps" }], ["case_id", "uuid", { ref: "ent-case" }], ["hospital_id", "uuid", { ref: "ent-hospital" }], ["quote_date", "date"], ["valid_until", "date"], ["subtotal", "decimal"], ["discount_pct", "decimal"], ["vat", "decimal"], ["total", "decimal"], ["status", "enum"], ["sent_via", "enum", { opt: true, note: "EMAIL | LINE" }],
  ]),
  E("ent-qitem", "Quotation Item", "A line on a quotation.", ["uc-quote"], col(2), row(3), [
    ["quotation_id", "uuid", { ref: "ent-quotation" }], ["product_id", "uuid", { ref: "ent-product" }], ["unit", "text"], ["qty", "integer"], ["unit_price", "decimal"], ["line_total", "decimal"],
  ]),
  E("ent-cpo", "Hospital PO", "The hospital's purchase order answering a quotation.", ["uc-po", "uc-bill"], col(3), row(2), [
    ["po_no", "text", { unique: true }], ["hospital_id", "uuid", { ref: "ent-hospital" }], ["quotation_id", "uuid", { ref: "ent-quotation" }], ["po_date", "date"], ["amount", "decimal"], ["file_url", "text", { opt: true }],
  ]),
  E("ent-requisition", "Requisition", "ใบเบิก — a request to issue stock and refill a hospital's consignment.", ["uc-req", "uc-approve"], col(3), row(3), [
    ["req_no", "text", { unique: true }], ["case_id", "uuid", { opt: true, ref: "ent-case" }], ["department", "text"], ["purpose", "text"], ["requester_id", "uuid", { ref: "ent-user" }], ["status", "enum"],
  ]),
  E("ent-ritem", "Requisition Item", "A line on a requisition, with its reason.", ["uc-req"], col(3), row(4), [
    ["requisition_id", "uuid", { ref: "ent-requisition" }], ["product_id", "uuid", { ref: "ent-product" }], ["qty", "integer"], ["reason", "text"],
  ]),
  E("ent-pr", "Purchase Request", "ใบขอซื้อ — a request to buy from a supplier; becomes the supplier PO once approved.", ["uc-pr", "uc-approve", "uc-receive"], col(6), row(1), [
    ["pr_no", "text", { unique: true }], ["supplier_id", "uuid", { ref: "ent-supplier" }], ["requester_id", "uuid", { ref: "ent-user" }], ["needed_by", "date"], ["supplier_po_no", "text", { opt: true }], ["status", "enum"],
  ]),
  E("ent-pritem", "Purchase Request Item", "A line on a purchase request.", ["uc-pr", "uc-receive"], col(6), row(2), [
    ["pr_id", "uuid", { ref: "ent-pr" }], ["product_id", "uuid", { ref: "ent-product" }], ["qty", "integer"], ["est_price", "decimal"],
  ]),
  E("ent-invoice", "Invoice", "ใบแจ้งหนี้/ใบกำกับภาษี — billed against the hospital PO.", ["uc-bill"], col(2), row(4), [
    ["invoice_no", "text", { unique: true }], ["case_id", "uuid", { ref: "ent-case" }], ["cpo_id", "uuid", { ref: "ent-cpo" }], ["amount", "decimal"], ["due_date", "date"], ["paid_at", "timestamp", { opt: true }], ["status", "enum"],
  ]),
  E("ent-approval", "Approval", "A manager's decision on a quotation, requisition or purchase request.", ["uc-approve"], col(4), row(3), [
    ["doc_type", "enum", { note: "QUOTATION | REQUISITION | PURCHASE_REQUEST" }], ["doc_id", "uuid"], ["approver_id", "uuid", { ref: "ent-user" }], ["decision", "enum", { note: "APPROVED | REJECTED" }], ["note", "text", { opt: true }], ["decided_at", "timestamp"],
  ]),
  E("ent-activity", "Activity Log", "Who did what to which record, when — the feed on the dashboard and the audit trail.", ["uc-dashboard", "uc-master"], col(0), row(2), [
    ["actor_id", "uuid", { ref: "ent-user" }], ["action", "text"], ["entity_type", "text"], ["entity_id", "uuid"], ["at", "timestamp"],
  ]),
];

const R = (id: string, fromId: string, toId: string, cardinality: Relationship["cardinality"], label: string, identifying = false): Relationship => ({ id, fromId, toId, cardinality, label, identifying });

export const relationships: Relationship[] = [
  R("r-ua", "ent-user", "ent-assignment", "1-n", "is assigned", true),
  R("r-ha", "ent-hospital", "ent-assignment", "1-n", "is covered by", true),
  R("r-hd", "ent-hospital", "ent-doctor", "1-n", "employs"),
  R("r-hp", "ent-hospital", "ent-price", "1-n", "has contract prices"),
  R("r-pp", "ent-product", "ent-price", "1-n", "is priced by"),
  R("r-sp", "ent-supplier", "ent-product", "1-n", "supplies"),
  R("r-hl", "ent-hospital", "ent-location", "1-n", "holds consignment at"),
  R("r-pl", "ent-product", "ent-lot", "1-n", "is made in", true),
  R("r-lb", "ent-location", "ent-balance", "1-n", "stocks"),
  R("r-lob", "ent-lot", "ent-balance", "1-n", "is counted in"),
  R("r-lm", "ent-lot", "ent-movement", "1-n", "moves by"),
  R("r-locm", "ent-location", "ent-movement", "1-n", "sends or receives"),
  R("r-um", "ent-user", "ent-movement", "1-n", "posts"),
  R("r-hc", "ent-hospital", "ent-case", "1-n", "hosts"),
  R("r-rc", "ent-user", "ent-case", "1-n", "records"),
  R("r-dc", "ent-doctor", "ent-case", "1-n", "performs"),
  R("r-cph", "ent-case", "ent-photo", "1-n", "is evidenced by", true),
  R("r-cu", "ent-case", "ent-usage", "1-n", "used", true),
  R("r-pu", "ent-product", "ent-usage", "1-n", "is used as"),
  R("r-lu", "ent-lot", "ent-usage", "1-n", "is consumed by"),
  R("r-cq", "ent-case", "ent-quotation", "1-n", "is priced by"),
  R("r-hq", "ent-hospital", "ent-quotation", "1-n", "receives"),
  R("r-qi", "ent-quotation", "ent-qitem", "1-n", "lists", true),
  R("r-pqi", "ent-product", "ent-qitem", "1-n", "is quoted as"),
  R("r-qpo", "ent-quotation", "ent-cpo", "1-n", "is answered by"),
  R("r-hpo", "ent-hospital", "ent-cpo", "1-n", "issues"),
  R("r-creq", "ent-case", "ent-requisition", "1-n", "is restocked by"),
  R("r-ureq", "ent-user", "ent-requisition", "1-n", "requests"),
  R("r-ri", "ent-requisition", "ent-ritem", "1-n", "lists", true),
  R("r-pri", "ent-product", "ent-ritem", "1-n", "is requested as"),
  R("r-spr", "ent-supplier", "ent-pr", "1-n", "is asked by"),
  R("r-upr", "ent-user", "ent-pr", "1-n", "raises"),
  R("r-prit", "ent-pr", "ent-pritem", "1-n", "lists", true),
  R("r-ppri", "ent-product", "ent-pritem", "1-n", "is bought as"),
  R("r-ci", "ent-case", "ent-invoice", "1-n", "is billed by"),
  R("r-poi", "ent-cpo", "ent-invoice", "1-n", "is invoiced by"),
  R("r-uap", "ent-user", "ent-approval", "1-n", "decides"),
  R("r-uact", "ent-user", "ent-activity", "1-n", "performs"),
];

/* =========================================================== stage 4: state */

type S = [id: string, kind: "initial" | "state" | "final", name: string, description?: string];
type T = [id: string, from: string, to: string, trigger: string, guard?: string, effect?: string];

function SM(entityId: string, name: string, states: S[], transitions: T[]): StateMachine {
  const short = entityId.slice(4);
  return {
    id: `sm-${short}`,
    entityId,
    attributeId: `${short}-status`,
    tracedName: name,
    nodes: states.map(([id, kind, n, description = ""], i) => ({ id, kind, name: n, description, x: 60 + (i % 5) * 230, y: 60 + Math.floor(i / 5) * 160 })),
    transitions: transitions.map(([id, from, to, trigger, guard = "", effect = ""]) => ({ id, from, to, trigger, guard, effect })),
  };
}

export const stateMachines: Record<string, StateMachine> = {
  "ent-case": SM("ent-case", "Case", [
    ["c-i", "initial", "start"],
    ["c-draft", "state", "DRAFT", "Created, usage not yet confirmed."],
    ["c-usage", "state", "USAGE_RECORDED", "Items confirmed; consignment stock deducted."],
    ["c-quoted", "state", "QUOTED", "A quotation exists but has not been sent."],
    ["c-waitpo", "state", "WAITING_PO", "Quotation sent; waiting for the hospital's PO."],
    ["c-po", "state", "PO_RECEIVED", "Hospital PO recorded against the quotation."],
    ["c-req", "state", "REQUISITIONED", "Stock issued and consignment refilled."],
    ["c-billed", "state", "BILLED", "Invoice issued to the hospital."],
    ["c-closed", "state", "CLOSED", "Paid. Nothing left to do."],
    ["c-cancel", "state", "CANCELLED", "Recorded in error or refused by the hospital."],
    ["c-f", "final", "end"],
  ], [
    ["ct1", "c-i", "c-draft", "case created"],
    ["ct2", "c-draft", "c-usage", "usage confirmed", "at least one item", "post OUT movements from the hospital location"],
    ["ct3", "c-usage", "c-quoted", "quotation generated"],
    ["ct4", "c-quoted", "c-waitpo", "quotation sent"],
    ["ct5", "c-waitpo", "c-po", "hospital PO recorded", "PO amount matches the quotation"],
    ["ct6", "c-po", "c-req", "requisition issued", "", "refill the hospital location"],
    ["ct7", "c-req", "c-billed", "invoice issued"],
    ["ct8", "c-billed", "c-closed", "payment recorded"],
    ["ct9", "c-draft", "c-cancel", "case cancelled"],
    ["ct10", "c-usage", "c-cancel", "case cancelled", "", "return stock to the hospital location"],
    ["ct11", "c-waitpo", "c-cancel", "quotation withdrawn", "hospital declines", "return stock to the hospital location"],
    ["ct12", "c-closed", "c-f", ""],
    ["ct13", "c-cancel", "c-f", ""],
  ]),
  "ent-quotation": SM("ent-quotation", "Quotation", [
    ["q-i", "initial", "start"],
    ["q-draft", "state", "DRAFT"],
    ["q-pending", "state", "PENDING_APPROVAL", "Discount over the 10% limit."],
    ["q-approved", "state", "APPROVED"],
    ["q-sent", "state", "SENT"],
    ["q-accepted", "state", "ACCEPTED", "A hospital PO answers it."],
    ["q-expired", "state", "EXPIRED", "30-day validity passed with no PO."],
    ["q-rejected", "state", "REJECTED", "Hospital declined."],
    ["q-f", "final", "end"],
  ], [
    ["qt1", "q-i", "q-draft", "quotation generated"],
    ["qt2", "q-draft", "q-pending", "submitted", "discount > 10%"],
    ["qt3", "q-draft", "q-approved", "submitted", "discount ≤ 10%"],
    ["qt4", "q-pending", "q-approved", "manager approves"],
    ["qt5", "q-pending", "q-draft", "manager returns", "", "comment shown to the admin"],
    ["qt6", "q-approved", "q-sent", "sent", "", "PDF by email or LINE"],
    ["qt7", "q-sent", "q-accepted", "hospital PO recorded"],
    ["qt8", "q-sent", "q-expired", "validity passed", "today > valid_until"],
    ["qt9", "q-sent", "q-rejected", "hospital declines"],
    ["qt10", "q-accepted", "q-f", ""],
    ["qt11", "q-expired", "q-f", ""],
    ["qt12", "q-rejected", "q-f", ""],
  ]),
  "ent-requisition": SM("ent-requisition", "Requisition", [
    ["r-i", "initial", "start"],
    ["r-sub", "state", "SUBMITTED"],
    ["r-app", "state", "APPROVED"],
    ["r-rej", "state", "REJECTED"],
    ["r-iss", "state", "ISSUED", "Stock picked first-expiry-first-out and moved."],
    ["r-f", "final", "end"],
  ], [
    ["rt1", "r-i", "r-sub", "requisition submitted"],
    ["rt2", "r-sub", "r-app", "manager approves"],
    ["rt3", "r-sub", "r-rej", "manager rejects", "", "reason required"],
    ["rt4", "r-app", "r-iss", "stock issued", "enough stock in the warehouse"],
    ["rt5", "r-iss", "r-f", ""],
    ["rt6", "r-rej", "r-f", ""],
  ]),
  "ent-pr": SM("ent-pr", "Purchase Request", [
    ["p-i", "initial", "start"],
    ["p-sub", "state", "SUBMITTED"],
    ["p-app", "state", "APPROVED"],
    ["p-rej", "state", "REJECTED"],
    ["p-ord", "state", "ORDERED", "Supplier PO sent."],
    ["p-rec", "state", "RECEIVED", "Goods received with lot and expiry."],
    ["p-f", "final", "end"],
  ], [
    ["prt1", "p-i", "p-sub", "purchase request submitted"],
    ["prt2", "p-sub", "p-app", "manager approves"],
    ["prt3", "p-sub", "p-rej", "manager rejects"],
    ["prt4", "p-app", "p-ord", "supplier PO sent"],
    ["prt5", "p-ord", "p-rec", "goods received", "quantities match the PO"],
    ["prt6", "p-rec", "p-f", ""],
    ["prt7", "p-rej", "p-f", ""],
  ]),
  "ent-invoice": SM("ent-invoice", "Invoice", [
    ["i-i", "initial", "start"],
    ["i-iss", "state", "ISSUED"],
    ["i-over", "state", "OVERDUE"],
    ["i-paid", "state", "PAID"],
    ["i-void", "state", "VOID", "Disputed and cancelled; a credit note follows."],
    ["i-f", "final", "end"],
  ], [
    ["it1", "i-i", "i-iss", "invoice issued"],
    ["it2", "i-iss", "i-paid", "payment recorded"],
    ["it3", "i-iss", "i-over", "due date passed"],
    ["it4", "i-over", "i-paid", "payment recorded"],
    ["it5", "i-iss", "i-void", "invoice voided", "hospital disputes"],
    ["it6", "i-paid", "i-f", ""],
    ["it7", "i-void", "i-f", ""],
  ]),
  "ent-photo": SM("ent-photo", "Usage Photo", [
    ["o-i", "initial", "start"],
    ["o-up", "state", "UPLOADED"],
    ["o-proc", "state", "PROCESSING"],
    ["o-ext", "state", "EXTRACTED", "Items read and matched to the catalogue; waiting for the rep."],
    ["o-conf", "state", "CONFIRMED"],
    ["o-fail", "state", "FAILED", "Unreadable — retake or enter by hand."],
    ["o-f", "final", "end"],
  ], [
    ["ot1", "o-i", "o-up", "photo uploaded"],
    ["ot2", "o-up", "o-proc", "OCR job picked up"],
    ["ot3", "o-proc", "o-ext", "items extracted", "confidence ≥ 0.6"],
    ["ot4", "o-proc", "o-fail", "unreadable", "confidence < 0.6"],
    ["ot5", "o-ext", "o-conf", "rep confirms the items"],
    ["ot6", "o-conf", "o-f", ""],
    ["ot7", "o-fail", "o-f", ""],
  ]),
};
