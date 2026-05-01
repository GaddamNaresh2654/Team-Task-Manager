import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const projectMemberRoleEnum = ["admin", "member"] as const;
export type ProjectMemberRole = (typeof projectMemberRoleEnum)[number];

export const projectMembersTable = pgTable(
  "project_members",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").$type<ProjectMemberRole>().notNull().default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export type ProjectMember = typeof projectMembersTable.$inferSelect;
export type InsertProjectMember = typeof projectMembersTable.$inferInsert;
