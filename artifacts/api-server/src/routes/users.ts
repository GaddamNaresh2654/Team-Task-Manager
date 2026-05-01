import { Router } from "express";
import { clerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

router.get("/users/me", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const clerkUser = await clerkClient().users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!existing.length) {
      await db
        .insert(usersTable)
        .values({
          id: userId,
          email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        })
        .onConflictDoNothing();
    }

    res.json({
      id: userId,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user profile");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.get("/users", requireAuth, async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        imageUrl: u.imageUrl,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export default router;
