import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const taskStatusEnum = ["todo", "in_progress", "done"] as const;
export const taskPriorityEnum = ["low", "medium", "high"] as const;

export type TaskStatus = (typeof taskStatusEnum)[number];
export type TaskPriority = (typeof taskPriorityEnum)[number];

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").$type<TaskStatus>().notNull().default("todo"),
  priority: text("priority").$type<TaskPriority>().notNull().default("medium"),
  assigneeId: text("assignee_id"),
  creatorId: text("creator_id").notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
