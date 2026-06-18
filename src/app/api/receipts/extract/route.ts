import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { categories, lineItems, receipts, receiptAllocations } from "@/db/schema";
import { computeVerdict } from "@/lib/budget";

export const maxDuration = 60;

const extractionSchema = z.object({
  vendor: z.string().nullable(),
  date: z.string().nullable(),
  docType: z.enum(["quote", "receipt", "invoice", "unknown"]),
  lineItems: z
    .array(
      z.object({
        description: z.string().describe("the line item text as written on the document"),
        amount: z.number(),
        lineItemMatchId: z
          .number()
          .nullable()
          .describe("id of the best-matching budget line item from the candidate list, or null if nothing fits"),
        matchConfidence: z.number().min(0).max(1),
      })
    )
    .describe(
      "Every distinct cost line on the document, BEFORE tax. Most invoices/draws list many separate items (e.g. a builder draw with 20 line items) — extract each one separately rather than collapsing them into a single total."
    ),
  taxAmount: z
    .number()
    .nullable()
    .describe("Sales tax / VAT shown as its own line on the document, separate from the line items above. Null if no tax line is shown."),
  documentTotal: z
    .number()
    .nullable()
    .describe("The final printed grand total on the document (e.g. 'Total', 'Quotation Total', 'Balance Due'), including tax. Null if not shown."),
});

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const cats = await db.select().from(categories);
  const items = await db.select().from(lineItems);
  const catById = new Map(cats.map((c) => [c.id, c.name]));
  const candidates = items
    .map((i) => `${i.id}: [${catById.get(i.categoryId)}] ${i.name}`)
    .join("\n");

  const { object } = await generateObject({
    model: "anthropic/claude-haiku-4.5",
    schema: extractionSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "This is a quote, invoice, or receipt for a home construction project. It may contain a single charge or many separate line items (common for builder draw invoices). Extract every distinct line item with its own pre-tax amount and description — do not merge them into one total. Separately report any sales tax/VAT line and the final printed grand total, if shown — do not fold tax into the line item amounts. For each line item, match it to the single best line item from this budget list (respond with its numeric id), or null if nothing fits well:\n\n" +
              candidates,
          },
          {
            type: "file",
            data: buffer,
            mediaType: file.type || "application/pdf",
          },
        ],
      },
    ],
  });

  const blob = await put(`receipts/${Date.now()}-${file.name}`, buffer, {
    access: "private",
    contentType: file.type || undefined,
  });

  // Line items are extracted pre-tax. Scale them up to match the document's
  // real total (tax + any other fees folded in) so committed amounts reflect
  // what was actually paid, not just the pre-tax subtotal.
  const pretaxSum = object.lineItems.reduce((s, li) => s + li.amount, 0);
  const targetTotal = object.documentTotal ?? (object.taxAmount != null ? pretaxSum + object.taxAmount : null);
  const scale = targetTotal != null && pretaxSum > 0 ? targetTotal / pretaxSum : 1;

  const scaledAmounts = object.lineItems.map((li) => Math.round(li.amount * scale * 100) / 100);
  if (targetTotal != null && scaledAmounts.length > 0) {
    const roundingDrift = Math.round((targetTotal - scaledAmounts.reduce((s, a) => s + a, 0)) * 100) / 100;
    scaledAmounts[scaledAmounts.length - 1] = Math.round((scaledAmounts[scaledAmounts.length - 1] + roundingDrift) * 100) / 100;
  }

  const totalAmount = scaledAmounts.reduce((s, a) => s + a, 0);

  const [receipt] = await db
    .insert(receipts)
    .values({
      fileUrl: blob.url,
      fileName: file.name,
      vendor: object.vendor,
      totalAmount: totalAmount.toFixed(2),
      docType: object.docType,
      date: object.date,
      extracted: object,
    })
    .returning();

  const validIds = new Set(items.map((i) => i.id));

  const allocations = await Promise.all(
    object.lineItems.map(async (li, i) => {
      const amount = scaledAmounts[i];
      const matchedLineItemId =
        li.lineItemMatchId != null && validIds.has(li.lineItemMatchId) ? li.lineItemMatchId : null;
      const verdict = matchedLineItemId != null ? await computeVerdict(matchedLineItemId, amount) : null;
      const [row] = await db
        .insert(receiptAllocations)
        .values({
          receiptId: receipt.id,
          lineItemId: matchedLineItemId,
          description: li.description,
          amount: amount.toFixed(2),
          matchConfidence: li.matchConfidence.toFixed(3),
          verdict,
          status: "pending_review",
        })
        .returning();
      return row;
    })
  );

  return NextResponse.json({ receipt, allocations, candidates: items });
}
