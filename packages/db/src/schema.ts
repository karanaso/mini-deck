import {
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value) {
    return Buffer.from(value);
  },
  fromDriver(value) {
    return new Uint8Array(value as Buffer);
  },
});

export const decks = pgTable("decks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  editTokenHash: text("edit_token_hash").notNull(),
  viewTokenHash: text("view_token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deckDocuments = pgTable("deck_documents", {
  deckId: text("deck_id")
    .primaryKey()
    .references(() => decks.id, { onDelete: "cascade" }),
  state: bytea("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deckAssets = pgTable(
  "deck_assets",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("deck_assets_deck_id_idx").on(table.deckId)],
);

export type DeckRow = typeof decks.$inferSelect;
export type DeckAssetRow = typeof deckAssets.$inferSelect;
export type NewDeckRow = typeof decks.$inferInsert;
