import { db } from "@/db";
import { categories, lineItems, receiptAllocations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type LineItemSummary = {
  id: number;
  name: string;
  notes: string | null;
  budgetAmount: number;
  committed: number;
  remaining: number;
};

export type CategorySummary = {
  id: number;
  name: string;
  budgetAmount: number;
  committed: number;
  remaining: number;
  lineItems: LineItemSummary[];
};

export type ProjectSummary = {
  budgetAmount: number;
  committed: number;
  remaining: number;
  realizedSurplus: number;
  executedCount: number;
  categories: CategorySummary[];
};

const CONFIRMED = "confirmed";

export async function getProjectSummary(): Promise<ProjectSummary> {
  const cats = await db.select().from(categories).orderBy(categories.sortOrder);
  const items = await db.select().from(lineItems).orderBy(lineItems.sortOrder);
  const committedRows = await db
    .select({
      lineItemId: receiptAllocations.lineItemId,
      total: sql<string>`sum(${receiptAllocations.amount})`,
    })
    .from(receiptAllocations)
    .where(eq(receiptAllocations.status, CONFIRMED))
    .groupBy(receiptAllocations.lineItemId);

  const committedByLineItem = new Map<number, number>();
  for (const row of committedRows) {
    if (row.lineItemId != null) {
      committedByLineItem.set(row.lineItemId, Number(row.total ?? 0));
    }
  }

  const categorySummaries: CategorySummary[] = cats.map((cat) => {
    const catItems = items
      .filter((i) => i.categoryId === cat.id)
      .map((i) => {
        const budgetAmount = Number(i.budgetAmount);
        const committed = committedByLineItem.get(i.id) ?? 0;
        return {
          id: i.id,
          name: i.name,
          notes: i.notes ?? null,
          budgetAmount,
          committed,
          remaining: budgetAmount - committed,
        };
      });

    const budgetAmount = catItems.reduce((s, i) => s + i.budgetAmount, 0);
    const committed = catItems.reduce((s, i) => s + i.committed, 0);

    return {
      id: cat.id,
      name: cat.name,
      budgetAmount,
      committed,
      remaining: budgetAmount - committed,
      lineItems: catItems,
    };
  });

  const budgetAmount = categorySummaries.reduce((s, c) => s + c.budgetAmount, 0);
  const committed = categorySummaries.reduce((s, c) => s + c.committed, 0);

  const allExecuted = categorySummaries.flatMap((c) => c.lineItems).filter((li) => li.committed > 0);
  const realizedSurplus = allExecuted.reduce((s, li) => s + (li.budgetAmount - li.committed), 0);

  return {
    budgetAmount,
    committed,
    remaining: budgetAmount - committed,
    realizedSurplus,
    executedCount: allExecuted.length,
    categories: categorySummaries,
  };
}

export type CategoryStatus = "Complete" | "Over Budget" | "At Risk" | "On Track";

export function categoryStatus(committed: number, budgetAmount: number): CategoryStatus {
  if (budgetAmount > 0 && committed > budgetAmount) return "Over Budget";
  const pct = budgetAmount > 0 ? (committed / budgetAmount) * 100 : 0;
  if (pct >= 100) return "Complete";
  if (pct >= 90) return "At Risk";
  return "On Track";
}

export const STATUS_COLORS: Record<CategoryStatus, { bar: string; text: string; bg: string }> = {
  Complete: { bar: "#1C9A46", text: "#1C9A46", bg: "#EEFBF2" },
  "On Track": { bar: "#00B8B8", text: "#1C9A46", bg: "#EEFBF2" },
  "At Risk": { bar: "#D4860A", text: "#C47B00", bg: "#FFF8E8" },
  "Over Budget": { bar: "#D9302A", text: "#D9302A", bg: "#FFF0EF" },
};

export type Verdict = {
  recommendation: "go" | "over_budget" | "review";
  lineItem: { budgetAmount: number; committedBefore: number; quoteAmount: number; remainingAfter: number };
  category: { name: string; budgetAmount: number; committedBefore: number; remainingAfter: number };
  project: { budgetAmount: number; committedBefore: number; remainingAfter: number };
  message: string;
};

export async function computeVerdict(lineItemId: number, quoteAmount: number): Promise<Verdict> {
  const summary = await getProjectSummary();
  const category = summary.categories.find((c) => c.lineItems.some((li) => li.id === lineItemId));
  const lineItem = category?.lineItems.find((li) => li.id === lineItemId);

  if (!category || !lineItem) {
    throw new Error("Line item not found");
  }

  const lineRemainingAfter = lineItem.budgetAmount - lineItem.committed - quoteAmount;
  const categoryRemainingAfter = category.remaining - quoteAmount;
  const projectRemainingAfter = summary.remaining - quoteAmount;

  let recommendation: Verdict["recommendation"] = "go";
  let message = "";

  if (lineRemainingAfter < 0) {
    recommendation = categoryRemainingAfter >= 0 ? "review" : "over_budget";
    message = `This quote is $${Math.abs(lineRemainingAfter).toLocaleString()} over the "${lineItem.name}" line budget.`;
    if (categoryRemainingAfter >= 0) {
      message += ` The "${category.name}" category still has $${categoryRemainingAfter.toLocaleString()} of headroom, so it may be coverable by shifting budget within the category.`;
    } else {
      message += ` The "${category.name}" category would also go over budget.`;
    }
  } else {
    message = `Within budget. Line item has $${lineRemainingAfter.toLocaleString()} remaining after this.`;
    if (projectRemainingAfter > 0) {
      message += ` Overall project is tracking $${projectRemainingAfter.toLocaleString()} under budget — room for upgrades elsewhere if you want.`;
    } else {
      message += ` Overall project would be $${Math.abs(projectRemainingAfter).toLocaleString()} over budget total — worth a second look before approving.`;
      recommendation = "review";
    }
  }

  return {
    recommendation,
    lineItem: {
      budgetAmount: lineItem.budgetAmount,
      committedBefore: lineItem.committed,
      quoteAmount,
      remainingAfter: lineRemainingAfter,
    },
    category: {
      name: category.name,
      budgetAmount: category.budgetAmount,
      committedBefore: category.committed,
      remainingAfter: categoryRemainingAfter,
    },
    project: {
      budgetAmount: summary.budgetAmount,
      committedBefore: summary.committed,
      remainingAfter: projectRemainingAfter,
    },
    message,
  };
}
