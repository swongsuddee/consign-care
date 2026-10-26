import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByPatient, parsePatientCode, type SheetCode } from "./patients";

const eq = (text: string, x: number, y: number): SheetCode => ({ text, x, y, w: 560, h: 58 });
const pt = (text: string, x: number, y: number): SheetCode => ({ text, x, y, w: 300, h: 50 });
const shape = (ps: ReturnType<typeof groupByPatient>) => ps.map((p) => `${p.hn ?? "-"}/${p.an ?? "-"}: ${p.items.map((i) => i.ref ?? i.raw).join(",")}`);

test("parsePatientCode reads the usual sticker formats", () => {
  assert.deepEqual(parsePatientCode("HN:65-20026 AN:69-19920"), { hn: "65-20026", an: "69-19920" });
  assert.deepEqual(parsePatientCode("HN-640112"), { hn: "640112", an: undefined });
  assert.deepEqual(parsePatientCode("65-20026"), { hn: "65-20026" });
  assert.deepEqual(parsePatientCode("AN 69/10231"), { hn: undefined, an: "69/10231" });
  assert.deepEqual(parsePatientCode('{"hn":"HN-1","an":"69-2"}'), { hn: "HN-1", an: "69-2" });
  for (const notPatient of ["410105 21004417 560121", "(01)08845210000017(17)271231(10)240105", "8850000999999", "MAP-KIT-3-01 21005803 560113", "CHANNEL 3"]) assert.equal(parsePatientCode(notPatient), null, notPatient);
});

test("one column, two patients, scattered x", () => {
  const codes = [
    pt("HN:64-0112 AN:69-10231", 260, 150), eq("410105 21004417 560121", 440, 330), eq("410212 21005582 560135", 470, 450), eq("410320 21006139 560142", 430, 570),
    pt("HN:58-0437 AN:69-10232", 250, 900), eq("410438 21007264 560167", 450, 1080), eq("410105 21004417 560122", 420, 1200),
  ];
  assert.deepEqual(shape(groupByPatient(codes.sort(() => Math.random() - 0.5))), ["64-0112/69-10231: 410105,410212,410320", "58-0437/69-10232: 410438,410105"]);
});

test("two columns, a patient in each", () => {
  const codes = [
    pt("HN-111111", 260, 100), eq("410105 21004417 000001", 400, 250), eq("410212 21005582 000002", 410, 370),
    pt("HN-222222", 1020, 110), eq("410320 21006139 000003", 1150, 260), eq("410438 21007264 000004", 1160, 380), eq("410105 21004417 000005", 1140, 500),
  ];
  assert.deepEqual(shape(groupByPatient(codes)), ["111111/-: 410105,410212", "222222/-: 410320,410438,410105"]);
});

test("three patients, HN and AN as two barcodes, same device twice for one patient", () => {
  const codes = [
    pt("HN:1-1", 200, 100), pt("AN:9-1", 520, 100), eq("410105 21004417 000011", 420, 250), eq("410105 21004417 000012", 420, 370),
    pt("HN:2-2", 200, 520), pt("AN:9-2", 520, 520), eq("410212 21005582 000021", 420, 650),
    pt("HN:3-3", 200, 800), eq("410320 21006139 000031", 420, 930),
  ];
  assert.deepEqual(shape(groupByPatient(codes)), ["1-1/9-1: 410105,410105", "2-2/9-2: 410212", "3-3/-: 410320"]);
});

test("equipment above the first patient sticker stays apart, for the rep to assign", () => {
  const codes = [eq("410105 21004417 000001", 420, 80), pt("HN-5", 250, 300), eq("410212 21005582 000002", 420, 450)];
  assert.deepEqual(shape(groupByPatient(codes)), ["-/-: 410105", "5/-: 410212"]);
});

test("no patient barcode: falls back to gaps and repeated REFs", () => {
  const codes = [eq("410105 21004417 000001", 420, 300), eq("410212 21005582 000002", 420, 420), eq("410320 21006139 000003", 420, 540), eq("410105 21004417 000004", 420, 1100), eq("410212 21005582 000005", 420, 1220)];
  assert.deepEqual(shape(groupByPatient(codes)), ["-/-: 410105,410212,410320", "-/-: 410105,410212"]);
});

test("the same sticker decoded twice is counted once", () => {
  const codes = [pt("HN-7", 250, 100), eq("410105 21004417 000001", 420, 250), eq("410105 21004417 000001", 422, 252)];
  assert.deepEqual(shape(groupByPatient(codes)), ["7/-: 410105"]);
});
