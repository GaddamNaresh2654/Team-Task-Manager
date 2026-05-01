import { Router } from "express";
import { db, tasksTable, projectMembersTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/requireAuth";
import {
  CreateTaskBody,
  UpdateTaskBody,
  ListProjectTasksQueryParams,
} from "@workspace/api-zod";

const router = Router();

async function checkProjectMembership(projectId: number, userId: string) {
  const membership = await db
    .select()
    .from(projectMembersTable)
    .where(
      and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, userId),
      ),
    )
    .limit(1);
  return membership[0] ?? null;
}

async function enrichTaskWithAssignee(task: typeof tasksTable.$inferSelect) {
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
    projectName: null,
  };
}

router.get("/projects/:projectId/tasks", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const queryParsed = ListProjectTasksQueryParams.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: "Invalid query params", details: queryParsed.error.issues });
    return;
  }

  try {
    const membership = await checkProjectMembership(projectId, userId);
    if (!membership) {
      res.status(403).json({ error: "Not a member of this project" });
      return;
    }

    const conditions = [eq(tasksTable.projectId, projectId)];
    if (queryParsed.data.status) {
      conditions.push(eq(tasksTable.status, queryParsed.data.status));
    }
    if (queryParsed.data.assigneeId) {
      conditions.push(eq(tasksTable.assigneeId, queryParsed.data.assigneeId));
    }

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    const enriched = await Promise.all(tasks.map(enrichTaskWithAssignee));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list tasks");
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/projects/:projectId/tasks", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  try {
    const membership = await checkProjectMembership(projectId, userId);
    if (!membership) {
      res.status(403).json({ error: "Not a member of this project" });
      return;
    }

    const [task] = await db
      .insert(tasksTable)
      .values({
        projectId,
        creatorId: userId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status ?? "todo",
        priority: parsed.data.priority ?? "medium",
        assigneeId: parsed.data.assigneeId ?? null,
        dueDate: parsed.data.dueDate ?? null,
      })
      .returning();

    const enriched = await enrichTaskWithAssignee(task);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.get("/projects/:projectId/tasks/:taskId", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  const taskId = parseInt(req.params.taskId, 10);
  if (isNaN(projectId) || isNaN(taskId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const membership = await checkProjectMembership(projectId, userId);
    if (!membership) {
      res.status(403).json({ error: "Not a member of this project" });
      return;
    }

    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.projectId, projectId)))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const enriched = await enrichTaskWithAssignee(task);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to get task");
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

router.put("/projects/:projectId/tasks/:taskId", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  const taskId = parseInt(req.params.taskId, 10);
  if (isNaN(projectId) || isNaN(taskId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  try {
    const membership = await checkProjectMembership(projectId, userId);
    if (!membership) {
      res.status(403).json({ error: "Not a member of this project" });
      return;
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
    if (parsed.data.assigneeId !== undefined) updateData.assigneeId = parsed.data.assigneeId;
    if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate;

    const [updated] = await db
      .update(tasksTable)
      .set(updateData)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.projectId, projectId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const enriched = await enrichTaskWithAssignee(updated);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/projects/:projectId/tasks/:taskId", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  const taskId = parseInt(req.params.taskId, 10);
  if (isNaN(projectId) || isNaN(taskId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const membership = await checkProjectMembership(projectId, userId);
    if (!membership) {
      res.status(403).json({ error: "Not a member of this project" });
      return;
    }

    await db
      .delete(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.projectId, projectId)));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
