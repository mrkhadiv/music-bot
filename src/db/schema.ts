import { pgTable, serial, text, timestamp, integer, bigint } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const editTasks = pgTable("edit_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
  originalFileName: text("original_file_name"),
  editType: text("edit_type").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  totalEdits: integer("total_edits").default(0).notNull(),
  totalUsers: integer("total_users").default(0).notNull(),
  totalCuts: integer("total_cuts").default(0).notNull(),
  totalRenames: integer("total_renames").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
