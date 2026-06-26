import { NextResponse } from "next/server";
import { db } from "@/db";
import { lineItemQuotes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { label, url, amount, qty } = await req.json();
  const [quote] = await db
    .update(lineItemQuotes)
    .set({
      ...(label !== undefined ? { label: label || null } : {}),
      ...(url !== undefined ? { url } : {}),
      ...(amount !== undefined ? { amount: String(amount) } : {}),
      ...(qty !== undefined ? { qty: Number(qty) } : {}),
    })
    .where(eq(lineItemQuotes.id, Number(id)))
    .returning();
  return NextResponse.json({ quote });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(lineItemQuotes).where(eq(lineItemQuotes.id, Number(id)));
  return NextResponse.json({ ok: true });
}
