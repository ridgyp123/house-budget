import { NextResponse } from "next/server";
import { db } from "@/db";
import { lineItemQuotes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quotes = await db
    .select()
    .from(lineItemQuotes)
    .where(eq(lineItemQuotes.lineItemId, Number(id)))
    .orderBy(lineItemQuotes.createdAt);
  return NextResponse.json({ quotes });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { label, url, amount } = await req.json();
  if (!url || !amount) {
    return NextResponse.json({ error: "url and amount required" }, { status: 400 });
  }
  const [quote] = await db
    .insert(lineItemQuotes)
    .values({ lineItemId: Number(id), label: label || null, url, amount: String(amount) })
    .returning();
  return NextResponse.json({ quote });
}
