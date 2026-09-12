import { Router, type IRouter } from "express";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import {
  CreateExchangeRateBody,
  CreateProductBody,
  CreateOrderBody,
  GetProductParams,
  GetOrderParams,
  ListProductsQueryParams,
  ListOrdersQueryParams,
  ListPaymentsQueryParams,
  SubmitPaymentBody,
  UpdateProductBody,
  UpdateProductParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusParams,
} from "@workspace/api-zod";
import {
  db,
  exchangeRatesTable,
  merchantsTable,
  orderItemsTable,
  ordersTable,
  paymentsTable,
  productsTable,
} from "@workspace/db";
import { requireAuth, optionalUser, type RequestWithUser } from "./auth";

const router: IRouter = Router();
const today = () => new Date().toISOString().slice(0, 10);
const pageInfo = (page: number, pageSize: number, total: number) => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

async function decorateProduct(product: typeof productsTable.$inferSelect) {
  const [merchant] = await db.select({ name: merchantsTable.name })
    .from(merchantsTable).where(eq(merchantsTable.id, product.merchantId)).limit(1);
  return { ...product, priceUsd: Number(product.priceUsd), merchantName: merchant?.name ?? "Comerciante" };
}

async function decorateOrder(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  return {
    ...order,
    totalUsd: Number(order.totalUsd),
    totalBs: Number(order.totalBs),
    exchangeRate: Number(order.exchangeRate),
    items: items.map((item) => ({
      ...item,
      unitPriceUsd: Number(item.unitPriceUsd),
      subtotalUsd: Number(item.subtotalUsd),
    })),
  };
}

router.get("/dashboard/summary", requireAuth, async (_req, res, next) => {
  try {
    const user = (_req as RequestWithUser).user;
    if (user?.role !== "admin" && user?.role !== "merchant") {
      res.status(403).json({ error: "No tienes permisos para ver el panel de operaciones." });
      return;
    }
    const [products, merchants, payments, orders] = await Promise.all([
      db.select({ value: count() }).from(productsTable).where(eq(productsTable.isVisible, true)),
      db.select({ value: count() }).from(merchantsTable).where(eq(merchantsTable.isVisible, true)),
      db.select({ value: count() }).from(paymentsTable).where(eq(paymentsTable.status, "pending")),
      db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(5),
    ]);
    const recentOrders = await Promise.all(orders.map(decorateOrder));
    res.json({
      todaySalesUsd: recentOrders.filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.totalUsd), 0),
      pendingPayments: Number(payments[0]?.value ?? 0),
      activeProducts: Number(products[0]?.value ?? 0),
      activeMerchants: Number(merchants[0]?.value ?? 0),
      recentOrders,
      topCategories: [],
    });
  } catch (error) {
    next(error);
  }
});

router.get("/rates/today", async (_req, res, next) => {
  try {
    const [rate] = await db.select().from(exchangeRatesTable)
      .where(eq(exchangeRatesTable.effectiveDate, today())).limit(1);
    if (!rate) {
      res.status(404).json({ error: "No hay una tasa configurada para hoy." });
      return;
    }
    res.json({ ...rate, value: Number(rate.value) });
  } catch (error) {
    next(error);
  }
});

router.post("/rates/today", requireAuth, async (req, res, next) => {
  try {
    const body = CreateExchangeRateBody.parse(req.body);
    const user = (req as RequestWithUser).user;
    const [rate] = await db.insert(exchangeRatesTable).values({
      value: body.value,
      currency: body.currency,
      effectiveDate: today(),
      updatedBy: user?.id ?? null,
    }).onConflictDoUpdate({
      target: exchangeRatesTable.effectiveDate,
      set: { value: body.value, currency: body.currency, updatedBy: user?.id ?? null },
    }).returning();
    res.status(201).json({ ...rate, value: Number(rate.value) });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const query = ListProductsQueryParams.parse(req.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const filters = [eq(productsTable.isVisible, true)];
    if (query.category) filters.push(eq(productsTable.category, query.category));
    if (query.search) {
      filters.push(or(
        ilike(productsTable.name, `%${query.search}%`),
        ilike(productsTable.sku, `%${query.search}%`),
        ilike(productsTable.description, `%${query.search}%`),
      )!);
    }
    if (query.merchantId) filters.push(eq(productsTable.merchantId, query.merchantId));
    const [rows, totals] = await Promise.all([
      db.select().from(productsTable).where(and(...filters))
        .orderBy(desc(productsTable.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ value: count() }).from(productsTable).where(and(...filters)),
    ]);
    res.json({ items: await Promise.all(rows.map(decorateProduct)), ...pageInfo(page, pageSize, Number(totals[0]?.value ?? 0)) });
  } catch (error) {
    next(error);
  }
});

router.get("/products/:productId", async (req, res, next) => {
  try {
    const { productId } = GetProductParams.parse(req.params);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (!product) {
      res.status(404).json({ error: "Repuesto no encontrado." });
      return;
    }
    res.json(await decorateProduct(product));
  } catch (error) {
    next(error);
  }
});

router.post("/products", requireAuth, async (req, res, next) => {
  try {
    const body = CreateProductBody.parse(req.body);
    const user = (req as RequestWithUser).user;
    if (!user?.merchantId) {
      res.status(403).json({ error: "Solo los comerciantes pueden publicar inventario." });
      return;
    }
    const [product] = await db.insert(productsTable).values({ ...body, merchantId: user.merchantId }).returning();
    res.status(201).json(await decorateProduct(product));
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:productId", requireAuth, async (req, res, next) => {
  try {
    const params = UpdateProductParams.parse(req.params);
    const body = UpdateProductBody.parse(req.body);
    const user = (req as RequestWithUser).user;
    const [current] = await db.select().from(productsTable).where(eq(productsTable.id, params.productId)).limit(1);
    if (!current) {
      res.status(404).json({ error: "Repuesto no encontrado." });
      return;
    }
    if (user?.role !== "admin" && user?.merchantId !== current.merchantId) {
      res.status(403).json({ error: "No puedes modificar inventario de otro comerciante." });
      return;
    }
    const [product] = await db.update(productsTable).set({ ...body, updatedAt: new Date() })
      .where(eq(productsTable.id, params.productId)).returning();
    res.json(await decorateProduct(product));
  } catch (error) {
    next(error);
  }
});

router.delete("/products/:productId", requireAuth, async (req, res, next) => {
  try {
    const { productId } = UpdateProductParams.parse(req.params);
    const user = (req as RequestWithUser).user;
    const [current] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (!current) {
      res.status(404).json({ error: "Repuesto no encontrado." });
      return;
    }
    if (user?.role !== "admin" && user?.merchantId !== current.merchantId) {
      res.status(403).json({ error: "No puedes archivar inventario de otro comerciante." });
      return;
    }
    await db.update(productsTable).set({ isVisible: false, updatedAt: new Date() })
      .where(eq(productsTable.id, productId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/orders", requireAuth, async (req, res, next) => {
  try {
    const query = ListOrdersQueryParams.parse(req.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const user = (req as RequestWithUser).user;
    const filters = user?.role === "admin" ? [] : [eq(ordersTable.customerId, user?.id ?? "")];
    if (query.status) filters.push(eq(ordersTable.status, query.status));
    const [rows, totals] = await Promise.all([
      db.select().from(ordersTable).where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(ordersTable.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ value: count() }).from(ordersTable).where(filters.length ? and(...filters) : undefined),
    ]);
    res.json({ items: await Promise.all(rows.map(decorateOrder)), ...pageInfo(page, pageSize, Number(totals[0]?.value ?? 0)) });
  } catch (error) {
    next(error);
  }
});

router.post("/orders", optionalUser, async (req, res, next) => {
  try {
    const body = CreateOrderBody.parse(req.body);
    const user = (req as RequestWithUser).user;
    const [rate] = await db.select().from(exchangeRatesTable)
      .where(eq(exchangeRatesTable.effectiveDate, today())).limit(1);
    if (!rate) {
      res.status(400).json({ error: "La tasa del día aún no está configurada." });
      return;
    }
    const ids = body.items.map((item) => item.productId);
    const products = await db.select().from(productsTable).where(and(
      or(...ids.map((id) => eq(productsTable.id, id)))!,
      eq(productsTable.isVisible, true),
    ));
    if (products.length !== ids.length) {
      res.status(400).json({ error: "Uno de los repuestos ya no está disponible." });
      return;
    }
    const items = body.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPriceUsd: Number(product.priceUsd),
        subtotalUsd: Number(product.priceUsd) * item.quantity,
      };
    });
    const totalUsd = items.reduce((sum, item) => sum + item.subtotalUsd, 0);
    const [order] = await db.insert(ordersTable).values({
      customerId: user?.id ?? null,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      pickupNotes: body.pickupNotes ?? null,
      totalUsd,
      totalBs: totalUsd * Number(rate.value),
      exchangeRate: Number(rate.value),
    }).returning();
    await db.insert(orderItemsTable).values(items.map((item) => ({ ...item, orderId: order.id })));
    res.status(201).json(await decorateOrder(order));
  } catch (error) {
    next(error);
  }
});

router.get("/orders/:orderId", requireAuth, async (req, res, next) => {
  try {
    const { orderId } = GetOrderParams.parse(req.params);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado." });
      return;
    }
    const user = (req as RequestWithUser).user;
    if (user?.role !== "admin" && order.customerId !== user?.id) {
      res.status(403).json({ error: "No puedes consultar este pedido." });
      return;
    }
    res.json(await decorateOrder(order));
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:orderId", requireAuth, async (req, res, next) => {
  try {
    const { orderId } = UpdateOrderStatusParams.parse(req.params);
    const body = UpdateOrderStatusBody.parse(req.body);
    const user = (req as RequestWithUser).user;
    if (user?.role !== "admin" && user?.role !== "merchant") {
      res.status(403).json({ error: "No tienes permisos para cambiar el estado del pedido." });
      return;
    }
    const [order] = await db.update(ordersTable).set({ status: body.status })
      .where(eq(ordersTable.id, orderId)).returning();
    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado." });
      return;
    }
    res.json(await decorateOrder(order));
  } catch (error) {
    next(error);
  }
});

router.get("/payments", requireAuth, async (req, res, next) => {
  try {
    const user = (req as RequestWithUser).user;
    if (user?.role !== "admin") {
      res.status(403).json({ error: "Solo administración puede revisar pagos." });
      return;
    }
    const query = ListPaymentsQueryParams.parse(req.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const filters = query.status ? [eq(paymentsTable.status, query.status)] : [];
    const [items, totals] = await Promise.all([
      db.select().from(paymentsTable).where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(paymentsTable.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ value: count() }).from(paymentsTable).where(filters.length ? and(...filters) : undefined),
    ]);
    res.json({ items: items.map((item) => ({ ...item, amountBs: Number(item.amountBs) })), ...pageInfo(page, pageSize, Number(totals[0]?.value ?? 0)) });
  } catch (error) {
    next(error);
  }
});

router.post("/payments", requireAuth, async (req, res, next) => {
  try {
    const body = SubmitPaymentBody.parse(req.body);
    const [payment] = await db.insert(paymentsTable).values(body).returning();
    res.status(201).json({ ...payment, amountBs: Number(payment.amountBs) });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: "Esta referencia de pago ya fue utilizada." });
      return;
    }
    next(error);
  }
});

export default router;