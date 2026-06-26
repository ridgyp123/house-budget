import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const lineItems = pgTable("line_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  budgetAmount: numeric("budget_amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull(),
});

// One uploaded document (a quote, receipt, or multi-item builder invoice).
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  vendor: text("vendor"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  docType: text("doc_type"), // 'quote' | 'receipt' | 'invoice'
  date: text("date"),
  extracted: jsonb("extracted"), // raw model output
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A product link/price the Paynes are considering for a line item — not a commitment.
export const lineItemQuotes = pgTable("line_item_quotes", {
  id: serial("id").primaryKey(),
  lineItemId: integer("line_item_id")
    .notNull()
    .references(() => lineItems.id, { onDelete: "cascade" }),
  label: text("label"),
  url: text("url").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One line within a receipt, allocated against a single budget line item.
export const receiptAllocations = pgTable("receipt_allocations", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id")
    .notNull()
    .references(() => receipts.id),
  lineItemId: integer("line_item_id").references(() => lineItems.id),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  matchConfidence: numeric("match_confidence", { precision: 4, scale: 3 }),
  verdict: jsonb("verdict"), // computed go/no-go + variance snapshot at confirm time
  status: text("status").notNull().default("pending_review"), // pending_review | confirmed | rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
