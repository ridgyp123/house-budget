import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, lineItems } from "@/db/schema";

export async function GET() {
  const cats = await db.select().from(categories).orderBy(categories.sortOrder);
  const items = await db.select().from(lineItems).orderBy(lineItems.sortOrder);
  return NextResponse.json({
    categories: cats.map((c) => ({
      id: c.id,
      name: c.name,
      lineItems: items.filter((i) => i.categoryId === c.id).map((i) => ({ id: i.id, name: i.name })),
    })),
  });
}
