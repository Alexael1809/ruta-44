/**
 * @file orders-page.tsx
 * @description Customer order history list displaying order status badges,
 * item counts, order totals in USD and Bs., and direct link to order tracking details.
 */

import { Link } from 'wouter';
import {
  ArrowRight,
  ClipboardList,
  ShoppingCart,
} from 'lucide-react';
import { useListOrders } from '@workspace/api-client-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { OrderRow } from '@/components/shared/order-row';

/**
 * Orders history page for customer tracking of past and active purchases.
 */
export default function OrdersPage() {
  const query = useListOrders({ page: 1, pageSize: 30 });
  const orders = query.data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Historial</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em]">Mis pedidos</h1>
        </div>
        <Link
          href="/"
          className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground sm:flex"
          data-testid="link-orders-shop"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Seguir comprando</span>
        </Link>
      </div>

      <div className="mt-9">
        {query.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-2xl bg-muted"
                data-testid={`skeleton-order-${item}`}
              />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState retry={() => query.refetch()} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Todavía no tienes pedidos"
            description="Cuando confirmes una compra, el seguimiento aparecerá en este espacio."
            action={
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                data-testid="link-orders-empty-shop"
              >
                <span>Ver catálogo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
