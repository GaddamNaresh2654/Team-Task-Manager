import { Router } from "express";
import { db, projectMembersTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/requireAuth";
import { AddProjectMemberBody, UpdateProjectMemberBody } from "@workspace/api-zod";

const router = Router();

async function getMembersWithUsers(projectId: number) {
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

  return membersRaw.map((m) => {
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
}

async function checkAdminAccess(projectId: number, userId: string): Promise<boolean> {
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
  return membership.length > 0 && membership[0].role === "admin";
}

router.get("/projects/:projectId/members", requireAuth, async (req, res) => {
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
      res.status(403).json({ error: "Not a member of this project" });
      return;
    }

    const members = await getMembersWithUsers(projectId);
    res.json(members);
  } catch (err) {
    req.log.error({ err }, "Failed to list project members");
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.post("/projects/:projectId/members", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }
  const parsed = AddProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  try {
    const isAdmin = await checkAdminAccess(projectId, userId);
    if (!isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    await db
      .insert(projectMembersTable)
      .values({
        projectId,
        userId: parsed.data.userId,
        role: parsed.data.role,
      })
      .onConflictDoNothing();

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, parsed.data.userId))
      .limit(1);

    const newMember = await db
      .select()
      .from(projectMembersTable)
      .where(
        and(
          eq(projectMembersTable.projectId, projectId),
          eq(projectMembersTable.userId, parsed.data.userId),
        ),
      )
      .limit(1);

    res.status(201).json({
      userId: parsed.data.userId,
      projectId,
      role: newMember[0]?.role ?? parsed.data.role,
      joinedAt: newMember[0]?.joinedAt ?? new Date(),
      user: {
        id: parsed.data.userId,
        email: user[0]?.email ?? "",
        firstName: user[0]?.firstName ?? null,
        lastName: user[0]?.lastName ?? null,
        imageUrl: user[0]?.imageUrl ?? null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add project member");
    res.status(500).json({ error: "Failed to add member" });
  }
});

router.put("/projects/:projectId/members/:memberId", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  const memberId = req.params.memberId;
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }
  const parsed = UpdateProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  try {
    const isAdmin = await checkAdminAccess(projectId, userId);
    if (!isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    await db
      .update(projectMembersTable)
      .set({ role: parsed.data.role })
      .where(
        and(
          eq(projectMembersTable.projectId, projectId),
          eq(projectMembersTable.userId, memberId),
        ),
      );

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, memberId))
      .limit(1);

    const updated = await db
      .select()
      .from(projectMembersTable)
      .where(
        and(
          eq(projectMembersTable.projectId, projectId),
          eq(projectMembersTable.userId, memberId),
        ),
      )
      .limit(1);

    res.json({
      userId: memberId,
      projectId,
      role: updated[0]?.role ?? parsed.data.role,
      joinedAt: updated[0]?.joinedAt ?? new Date(),
      user: {
        id: memberId,
        email: user[0]?.email ?? "",
        firstName: user[0]?.firstName ?? null,
        lastName: user[0]?.lastName ?? null,
        imageUrl: user[0]?.imageUrl ?? null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update project member");
    res.status(500).json({ error: "Failed to update member" });
  }
});

router.delete("/projects/:projectId/members/:memberId", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = parseInt(req.params.projectId, 10);
  const memberId = req.params.memberId;
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }
  try {
    const isAdmin = await checkAdminAccess(projectId, userId);
    if (!isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    await db
      .delete(projectMembersTable)
      .where(
        and(
          eq(projectMembersTable.projectId, projectId),
          eq(projectMembersTable.userId, memberId),
        ),
      );

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to remove project member");
    res.status(500).json({ error: "Failed to remove member" });
  }
});

export default router;
