/**
 * Shared OrderRow component for displaying order summary in lists and dashboards.
 */
import type { Order } from '@workspace/api-client-react';
import { Package, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { usd, bs, dateLabel, statusLabel, statusClass } from '@/lib/formatters';

export interface OrderRowProps {
  order: Order;
}

export function OrderRow({ order }: OrderRowProps) {
  const itemCount = order.items?.length ?? 0;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm sm:flex-row sm:items-center"
      data-testid={`row-order-${order.id}`}
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-accent">
        <Package className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs font-bold text-primary">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <Badge className={`border text-[10px] font-medium ${statusClass(order.status)}`}>
            {statusLabel(order.status)}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.customerName ? `${order.customerName} · ` : ''}
          {itemCount} {itemCount === 1 ? 'pieza' : 'piezas'} · {dateLabel(order.createdAt)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <div className="text-left sm:text-right">
          <p className="font-mono font-bold">{usd(order.totalUsd)}</p>
          <p className="text-xs text-accent">{bs(order.totalBs)}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" />
      </div>
    </Link>
  );
}
