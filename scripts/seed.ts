import * as XLSX from "xlsx";
import { db } from "../src/db";
import { categories, lineItems } from "../src/db/schema";

const SOURCE_FILE =
  process.env.SEED_XLSX ??
  "/Users/ridgepayne/Downloads/Payne_Build_Cost_Breakdown.xlsx";

type Row = [unknown, string | null, number | null, string | null, ...unknown[]];

async function main() {
  const wb = XLSX.readFile(SOURCE_FILE);
  const ws = wb.Sheets["Full Cost Breakdown"];
  const rows: Row[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let categorySort = 0;
  let lineItemSort = 0;
  let currentCategoryId: number | null = null;

  for (const row of rows) {
    const [colA, colB, colC] = row;
    const label = typeof colA === "string" ? colA.trim() : "";
    const itemName = typeof colB === "string" ? colB.trim() : "";
    const amount = typeof colC === "number" ? colC : null;

    const isCategoryHeader =
      label &&
      !label.startsWith("Subtotal") &&
      !label.startsWith("Total") &&
      !label.startsWith("TOTAL") &&
      !label.startsWith("Appraised") &&
      !label.startsWith("BUILD COST") &&
      !label.includes("·") &&
      !itemName;

    if (isCategoryHeader) {
      const [{ id }] = await db
        .insert(categories)
        .values({ name: label, sortOrder: categorySort++ })
        .returning({ id: categories.id });
      currentCategoryId = id;
      lineItemSort = 0;
      continue;
    }

    if (itemName && amount !== null && currentCategoryId !== null) {
      const notes = typeof row[3] === "string" ? row[3] : null;
      await db.insert(lineItems).values({
        categoryId: currentCategoryId,
        name: itemName,
        budgetAmount: amount.toFixed(2),
        notes,
        sortOrder: lineItemSort++,
      });
    }
  }

  console.log("Seed complete.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
