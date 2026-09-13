import { Router, type IRouter, type RequestHandler, type Request } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

export const MASTER_EMAIL = "alexaelperdomo2410@gmail.com";

async function resolveUser(auth: ReturnType<typeof getAuth>) {
  const userId = auth?.userId;
  if (!userId) return null;
  const claims = auth.sessionClaims as { email?: string; name?: string } | undefined;
  const email = claims?.email ?? "cliente@repuestos.local";
  const name = claims?.name ?? "Cliente";
  const [existing] = await db.select().from(usersTable)
    .where(or(eq(usersTable.id, userId), eq(usersTable.email, email))).limit(1);
  if (existing) {
    if (existing.id !== userId && email.toLowerCase() === MASTER_EMAIL) {
      const [migrated] = await db.update(usersTable).set({
        id: userId,
        name,
        role: "admin",
        isMaster: true,
      }).where(eq(usersTable.id, existing.id)).returning();
      return migrated;
    }
    return existing;
  }
  return (await db.insert(usersTable).values({
    id: userId,
    email,
    name,
    role: email.toLowerCase() === MASTER_EMAIL ? "admin" : "customer",
    isMaster: email.toLowerCase() === MASTER_EMAIL,
  } as any).returning())[0];
}

export const optionalUser: RequestHandler = async (req, _res, next) => {
  const auth = getAuth(req);
  try {
    (req as RequestWithUser).user = await resolveUser(auth);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Debes iniciar sesión para continuar." });
    return;
  }
  try {
    const user = await resolveUser(auth);
    (req as RequestWithUser).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export type RequestWithUser = Request & {
  user?: typeof usersTable.$inferSelect | null;
};

const router: IRouter = Router();
router.get("/auth/me", optionalUser, (req, res) => {
  const user = (req as RequestWithUser).user;
  if (!user) {
    res.json(null);
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isMaster: user.isMaster,
    merchantId: user.merchantId,
  });
});

export default router;