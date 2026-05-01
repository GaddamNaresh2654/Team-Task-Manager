import { Router } from "express";
import { db, tasksTable, projectMembersTable, projectsTable, usersTable } from "@workspace/db";
import { eq, and, count, lt, ne, sql } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const memberships = await db
      .select()
      .from(projectMembersTable)
      .where(eq(projectMembersTable.userId, userId));

    const totalProjects = memberships.length;

    if (totalProjects === 0) {
      res.json({
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        overdueTasks: 0,
        myAssignedTasks: 0,
        tasksByPriority: { high: 0, medium: 0, low: 0 },
      });
      return;
    }

    const projectIds = memberships.map((m) => m.projectId);
    const projectIdArraySql = sql.raw(`ARRAY[${projectIds.join(",")}]`);

    const [totalTasksRow] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(sql`${tasksTable.projectId} = ANY(${projectIdArraySql})`);

    const [completedRow] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          sql`${tasksTable.projectId} = ANY(${projectIdArraySql})`,
          eq(tasksTable.status, "done"),
        ),
      );

    const [inProgressRow] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          sql`${tasksTable.projectId} = ANY(${projectIdArraySql})`,
          eq(tasksTable.status, "in_progress"),
        ),
      );

    const [todoRow] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          sql`${tasksTable.projectId} = ANY(${projectIdArraySql})`,
          eq(tasksTable.status, "todo"),
        ),
      );

    const now = new Date();
    const [overdueRow] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          sql`${tasksTable.projectId} = ANY(${projectIdArraySql})`,
          ne(tasksTable.status, "done"),
          lt(tasksTable.dueDate, now),
          sql`${tasksTable.dueDate} IS NOT NULL`,
        ),
      );

    const [myTasksRow] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          sql`${tasksTable.projectId} = ANY(${projectIdArraySql})`,
          eq(tasksTable.assigneeId, userId),
          ne(tasksTable.status, "done"),
        ),
      );

    const [highRow] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          sql`${tasksTable.projectId} = ANY(${projectIdArraySql})`,
          eq(tasksTable.priority, "high"),
          ne(tasksTable.status, "done"),
        ),
      );

    const [mediumRow] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          sql`${tasksTable.projectId} = ANY(${projectIdArraySql})`,
          eq(tasksTable.priority, "medium"),
          ne(tasksTable.status, "done"),
        ),
      );

    const [lowRow] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          sql`${tasksTable.projectId} = ANY(${projectIdArraySql})`,
          eq(tasksTable.priority, "low"),
          ne(tasksTable.status, "done"),
        ),
      );

    res.json({
      totalProjects,
      totalTasks: Number(totalTasksRow?.count ?? 0),
      completedTasks: Number(completedRow?.count ?? 0),
      inProgressTasks: Number(inProgressRow?.count ?? 0),
      todoTasks: Number(todoRow?.count ?? 0),
      overdueTasks: Number(overdueRow?.count ?? 0),
      myAssignedTasks: Number(myTasksRow?.count ?? 0),
      tasksByPriority: {
        high: Number(highRow?.count ?? 0),
        medium: Number(mediumRow?.count ?? 0),
        low: Number(lowRow?.count ?? 0),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

router.get("/dashboard/my-tasks", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.assigneeId, userId),
          ne(tasksTable.status, "done"),
        ),
      )
      .orderBy(tasksTable.dueDate, tasksTable.priority);

    const projectIds = [...new Set(tasks.map((t) => t.projectId))];
    const projects =
      projectIds.length > 0
        ? await db
            .select()
            .from(projectsTable)
            .where(sql`${projectsTable.id} = ANY(${sql.raw(`ARRAY[${projectIds.join(",")}]`)})`)
        : [];

    const result = tasks.map((task) => {
      const project = projects.find((p) => p.id === task.projectId);
      return {
        ...task,
        assignee: null,
        projectName: project?.name ?? null,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get my tasks");
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/dashboard/overdue", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const memberships = await db
      .select()
      .from(projectMembersTable)
      .where(eq(projectMembersTable.userId, userId));

    if (!memberships.length) {
      res.json([]);
      return;
    }

    const projectIds = memberships.map((m) => m.projectId);
    const now = new Date();

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          sql`${tasksTable.projectId} = ANY(${sql.raw(`ARRAY[${projectIds.join(",")}]`)})`,
          ne(tasksTable.status, "done"),
          lt(tasksTable.dueDate, now),
          sql`${tasksTable.dueDate} IS NOT NULL`,
        ),
      )
      .orderBy(tasksTable.dueDate);

    const projects =
      projectIds.length > 0
        ? await db
            .select()
            .from(projectsTable)
            .where(sql`${projectsTable.id} = ANY(${sql.raw(`ARRAY[${projectIds.join(",")}]`)})`)
        : [];

    const result = await Promise.all(
      tasks.map(async (task) => {
        const project = projects.find((p) => p.id === task.projectId);
        let assignee = null;
        if (task.assigneeId) {
          const user = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, task.assigneeId))
            .limit(1);
          if (user[0]) {
            assignee = {
              id: user[0].id,
              email: user[0].email,
              firstName: user[0].firstName,
              lastName: user[0].lastName,
              imageUrl: user[0].imageUrl,
            };
          }
        }
        return {
          ...task,
          assignee,
          projectName: project?.name ?? null,
        };
      }),
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get overdue tasks");
    res.status(500).json({ error: "Failed to fetch overdue tasks" });
  }
});

export default router;
