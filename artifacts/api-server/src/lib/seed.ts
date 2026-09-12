import { count, eq } from "drizzle-orm";
import {
  db,
  exchangeRatesTable,
  merchantsTable,
  productsTable,
} from "@workspace/db";

const today = () => new Date().toISOString().slice(0, 10);

export async function ensureMarketplaceSeed() {
  const [merchantCount] = await db.select({ value: count() }).from(merchantsTable);
  if (Number(merchantCount?.value ?? 0) === 0) {
    const [merchant] = await db.insert(merchantsTable).values({
      name: "Autopartes Caracas",
      city: "Caracas",
      isVisible: true,
    }).returning();
    await db.insert(productsTable).values([
      {
        merchantId: merchant.id,
        name: "Kit de pastillas de freno delantero",
        sku: "BRK-2048",
        category: "Frenos",
        description: "Juego cerámico de alta duración para uso urbano.",
        priceUsd: 42,
        stock: 12,
        imageUrl: null,
        isVisible: true,
        condition: "new",
      },
      {
        merchantId: merchant.id,
        name: "Filtro de aceite premium",
        sku: "FIL-1170",
        category: "Mantenimiento",
        description: "Filtro de aceite con sello reforzado y mayor capacidad.",
        priceUsd: 8.5,
        stock: 31,
        imageUrl: null,
        isVisible: true,
        condition: "new",
      },
      {
        merchantId: merchant.id,
        name: "Batería 12V 700 CCA",
        sku: "BAT-700C",
        category: "Eléctrico",
        description: "Batería sellada para arranque confiable en cualquier clima.",
        priceUsd: 96,
        stock: 6,
        imageUrl: null,
        isVisible: true,
        condition: "new",
      },
    ]);
  }
  const [rate] = await db.select().from(exchangeRatesTable)
    .where(eq(exchangeRatesTable.effectiveDate, today())).limit(1);
  if (!rate) {
    await db.insert(exchangeRatesTable).values({
      value: 145.25,
      currency: "USD",
      effectiveDate: today(),
      updatedBy: null,
    });
  }
}