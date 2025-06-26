import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => households.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  sin: text("sin"),
  dateOfBirth: text("date_of_birth"),
  province: text("province"),
  isPrimary: boolean("is_primary").default(false),
  disabled: boolean("disabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => households.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  disabled: boolean("disabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const t1Returns = pgTable("t1_returns", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  taxYear: integer("tax_year").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path"), // Store the actual file path for reprocessing
  fileSize: integer("file_size").notNull(),
  extractedData: jsonb("extracted_data"),
  processingStatus: text("processing_status").default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const t1FormFields = pgTable("t1_form_fields", {
  id: serial("id").primaryKey(),
  t1ReturnId: integer("t1_return_id").references(() => t1Returns.id).notNull(),
  fieldName: text("field_name").notNull(),
  fieldCode: text("field_code"),
  fieldValue: text("field_value"),
  fieldType: text("field_type"), // text, number, currency, boolean
});

// Relations
export const householdsRelations = relations(households, ({ many }) => ({
  clients: many(clients),
  children: many(children),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  household: one(households, {
    fields: [clients.householdId],
    references: [households.id],
  }),
  t1Returns: many(t1Returns),
}));

export const childrenRelations = relations(children, ({ one }) => ({
  household: one(households, {
    fields: [children.householdId],
    references: [households.id],
  }),
}));

export const t1ReturnsRelations = relations(t1Returns, ({ one, many }) => ({
  client: one(clients, {
    fields: [t1Returns.clientId],
    references: [clients.id],
  }),
  formFields: many(t1FormFields),
}));

export const t1FormFieldsRelations = relations(t1FormFields, ({ one }) => ({
  t1Return: one(t1Returns, {
    fields: [t1FormFields.t1ReturnId],
    references: [t1Returns.id],
  }),
}));

// Tax Brackets Reference Table
export const taxBrackets = pgTable("tax_brackets", {
  id: serial("id").primaryKey(),
  jurisdiction: varchar("jurisdiction", { length: 50 }).notNull(), // 'federal' or province code like 'ON', 'BC', etc.
  taxYear: integer("tax_year").notNull(),
  bracketOrder: integer("bracket_order").notNull(), // 1, 2, 3, etc.
  minIncome: decimal("min_income", { precision: 12, scale: 2 }).notNull(),
  maxIncome: decimal("max_income", { precision: 12, scale: 2 }), // null for highest bracket
  marginalRate: decimal("marginal_rate", { precision: 5, scale: 4 }).notNull(), // stored as decimal (e.g., 0.2005 for 20.05%)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taxBracketsRelations = relations(taxBrackets, ({ many }) => ({
  // No relations needed for now
}));

// Insert schemas
export const insertHouseholdSchema = createInsertSchema(households).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  createdAt: true,
});

export const insertT1ReturnSchema = createInsertSchema(t1Returns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertT1FormFieldSchema = createInsertSchema(t1FormFields).omit({
  id: true,
});

export const insertTaxBracketSchema = createInsertSchema(taxBrackets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type InsertT1Return = z.infer<typeof insertT1ReturnSchema>;
export type InsertT1FormField = z.infer<typeof insertT1FormFieldSchema>;
export type InsertTaxBracket = z.infer<typeof insertTaxBracketSchema>;

export type Household = typeof households.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Child = typeof children.$inferSelect;
export type T1Return = typeof t1Returns.$inferSelect;
export type T1FormField = typeof t1FormFields.$inferSelect;
export type TaxBracket = typeof taxBrackets.$inferSelect;

// Extended types for API responses
export type HouseholdWithClients = Household & {
  clients: ClientWithT1Returns[];
  children: Child[];
};

export type ClientWithT1Returns = Client & {
  t1Returns: (T1Return & { formFields?: T1FormField[] })[];
};

export type T1ReturnWithFields = T1Return & {
  formFields: T1FormField[];
  client: Client;
};
