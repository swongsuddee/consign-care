import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reads one usage-sheet photo with Claude vision.
 * Optional: without ANTHROPIC_API_KEY the route answers 501 and the app falls
 * back to reading barcodes on the device.
 */

const Sheet = z.object({
  hospitalName: z.string().nullable().describe("Hospital name written on the sheet, as written"),
  date: z.string().nullable().describe("Case date written on the sheet, as yyyy-mm-dd"),
  patients: z.array(
    z.object({
      hn: z.string().nullable().describe("HN from the patient sticker, e.g. 12-34567"),
      an: z.string().nullable().describe("AN from the patient sticker"),
      doctorCode: z.string().nullable().describe("Doctor code before the colon on the patient sticker, e.g. 2048"),
      items: z.array(
        z.object({
          text: z.string().describe("The full line printed under the barcode"),
          ref: z.string().describe("First token: the product REF"),
          lot: z.string().describe("Second token: the lot number"),
          serial: z.string().describe("Third token: the unit serial"),
          confidence: z.number().describe("0-1, how sure you are of this line"),
        }),
      ),
    }),
  ),
});

const SYSTEM = `You read consignment usage sheets from Thai hospitals for a medical-device distributor.
A sheet has one or more patient stickers (HN, AN, patient name, age, "doctor code : doctor name").
Under each patient sticker are equipment barcode stickers; the text printed under each barcode is "REF LOT SERIAL".
Every equipment sticker belongs to the nearest patient sticker above it.
The hospital name and date may be handwritten anywhere on the sheet.
Return only what is printed or written. Do not return patient names, ages or dates of birth.
If a line is partly torn or hidden, return your best reading and lower its confidence.`;

const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
type Allowed = (typeof ALLOWED)[number];

function configured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

export async function GET() {
  return Response.json({ ai: configured() });
}

export async function POST(req: Request) {
  if (!configured()) return Response.json({ error: "not-configured" }, { status: 501 });

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return Response.json({ error: "no-image" }, { status: 400 });
  if (!ALLOWED.includes(file.type as Allowed)) return Response.json({ error: "unsupported-type" }, { status: 415 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "too-large" }, { status: 413 });

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const client = new Anthropic();

  try {
    const msg = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(Sheet) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: file.type as Allowed, data } },
            { type: "text", text: "Read this usage sheet." },
          ],
        },
      ],
    });
    if (msg.stop_reason === "refusal" || !msg.parsed_output) {
      return Response.json({ error: "unreadable", stop: msg.stop_reason }, { status: 422 });
    }
    return Response.json({ ...msg.parsed_output, model: msg.model });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return Response.json({ error: "not-configured" }, { status: 501 });
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "rate-limited" }, { status: 429 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: "ai-error", status: e.status }, { status: 502 });
    throw e;
  }
}
