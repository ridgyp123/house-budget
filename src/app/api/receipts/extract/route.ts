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
      "Every distinct cost line on the document. Most invoices/draws list many separate items (e.g. a builder draw with 20 line items) — extract each one separately rather than collapsing them into a single total."
    ),
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
              "This is a quote, invoice, or receipt for a home construction project. It may contain a single charge or many separate line items (common for builder draw invoices). Extract every distinct line item with its own amount and description — do not merge them into one total. For each line item, match it to the single best line item from this budget list (respond with its numeric id), or null if nothing fits well:\n\n" +
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

  const totalAmount = object.lineItems.reduce((s, li) => s + li.amount, 0);

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
    object.lineItems.map(async (li) => {
      const matchedLineItemId =
        li.lineItemMatchId != null && validIds.has(li.lineItemMatchId) ? li.lineItemMatchId : null;
      const verdict = matchedLineItemId != null ? await computeVerdict(matchedLineItemId, li.amount) : null;
      const [row] = await db
        .insert(receiptAllocations)
        .values({
          receiptId: receipt.id,
          lineItemId: matchedLineItemId,
          description: li.description,
          amount: li.amount.toFixed(2),
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
