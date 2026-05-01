import { Router } from "express";
import { db, projectsTable, projectMembersTable, tasksTable, usersTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/requireAuth";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";

const router = Router();

router.get("/projects", requireAuth, async (req, res) => {
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
    const projects = await db
      .select()
      .from(projectsTable)
      .where(sql`${projectsTable.id} = ANY(${sql.raw(`ARRAY[${projectIds.join(",")}]`)})`);

    const result = await Promise.all(
      projects.map(async (p) => {
        const [memberCount] = await db
          .select({ count: count() })
          .from(projectMembersTable)
          .where(eq(projectMembersTable.projectId, p.id));

        const [taskCount] = await db
          .select({ count: count() })
          .from(tasksTable)
          .where(eq(tasksTable.projectId, p.id));

        const [completedCount] = await db
          .select({ count: count() })
          .from(tasksTable)
          .where(and(eq(tasksTable.projectId, p.id), eq(tasksTable.status, "done")));

        const myMembership = memberships.find((m) => m.projectId === p.id);

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          ownerId: p.ownerId,
          memberCount: Number(memberCount?.count ?? 0),
          taskCount: Number(taskCount?.count ?? 0),
          completedTaskCount: Number(completedCount?.count ?? 0),
          myRole: myMembership?.role ?? "member",
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/projects", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  try {
    const [project] = await db
      .insert(projectsTable)
      .values({ ...parsed.data, ownerId: userId })
      .returning();

    await db.insert(projectMembersTable).values({
      projectId: project.id,
      userId,
      role: "admin",
    });

    res.status(201).json({
      ...project,
      memberCount: 1,
      taskCount: 0,
      completedTaskCount: 0,
      myRole: "admin",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/projects/:projectId", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }
  try {
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

    if (!membership.length) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const membersRaw = await db
      .select()
      .from(projectMembersTable)
      .where(eq(projectMembersTable.projectId, projectId));

    const userIds = membersRaw.map((m) => m.userId);
    const users =
      userIds.length > 0
        ? await db
            .select()
            .from(usersTable)
            .where(sql`${usersTable.id} = ANY(${sql.raw(`ARRAY['${userIds.join("','")}']`)})`)
        : [];

    const members = membersRaw.map((m) => {
      const user = users.find((u) => u.id === m.userId);
      return {
        userId: m.userId,
        projectId: m.projectId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: {
          id: m.userId,
          email: user?.email ?? "",
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          imageUrl: user?.imageUrl ?? null,
        },
      };
    });

    const [taskCount] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(eq(tasksTable.projectId, projectId));

    const [completedCount] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(and(eq(tasksTable.projectId, projectId), eq(tasksTable.status, "done")));

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      memberCount: members.length,
      taskCount: Number(taskCount?.count ?? 0),
      completedTaskCount: Number(completedCount?.count ?? 0),
      myRole: membership[0].role,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      members,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

router.put("/projects/:projectId", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  try {
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

    if (!membership.length || membership[0].role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(projectsTable)
      .set(updateData)
      .where(eq(projectsTable.id, projectId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [memberCount] = await db
      .select({ count: count() })
      .from(projectMembersTable)
      .where(eq(projectMembersTable.projectId, projectId));

    const [taskCount] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(eq(tasksTable.projectId, projectId));

    const [completedCount] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(and(eq(tasksTable.projectId, projectId), eq(tasksTable.status, "done")));

    res.json({
      ...updated,
      memberCount: Number(memberCount?.count ?? 0),
      taskCount: Number(taskCount?.count ?? 0),
      completedTaskCount: Number(completedCount?.count ?? 0),
      myRole: "admin",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:projectId", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }
  try {
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

    if (!membership.length || membership[0].role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
