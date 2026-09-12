import { Router, type IRouter, type RequestHandler, type Request } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const optionalUser: RequestHandler = async (req, _res, next) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    (req as RequestWithUser).user = user ?? null;
  } else {
    (req as RequestWithUser).user = null;
  }
  next();
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Debes iniciar sesión para continuar." });
    return;
  }
  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    const user = existing ?? (await db.insert(usersTable).values({
      id: auth.userId,
      email: auth.sessionClaims?.email ?? "cliente@repuestos.local",
      name: auth.sessionClaims?.name ?? "Cliente",
      role: "customer",
    } as any).returning())[0];
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
    merchantId: user.merchantId,
  });
});

export default router;