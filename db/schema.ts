import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const terms = pgTable("terms", {
  id: text().primaryKey(),
  term: text().notNull(),
  langs: text().array().notNull(),
  note: text().notNull().default(""),
  char: text().notNull().default(""),
  // Key of the uploaded image in the "symbol-images" blob store, empty when the symbol is a character.
  imageKey: text("image_key").notNull().default(""),
  // SHA-256 of the uploader's secret token, so only whoever uploaded a symbol can delete it.
  ownerHash: text("owner_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
