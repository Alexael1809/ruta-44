/**
 * @file formatters.ts
 * Utility formatting functions for currency (USD and VES/Bs.), dates,
 * and order/payment status representations.
 */

/**
 * Formats a numeric value into USD currency format (e.g. "$12.50").
 */
export function usd(value: number): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : Number(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a numeric value into Venezuelan Bolívares currency string (e.g. "Bs. 450,00").
 */
export function bs(value: number): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : Number(value) || 0;
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
  })
    .format(num)
    .replace('VES', 'Bs.');
}

/**
 * Formats an ISO date string or timestamp into human-readable es-VE date label.
 */
export function dateLabel(value?: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(value);
  }
}

/**
 * Returns localized Spanish text label for order and payment statuses.
 */
export function statusLabel(status?: string): string {
  const labels: Record<string, string> = {
    pending_payment: 'Pago pendiente',
    paid: 'Pago confirmado',
    preparing: 'Preparando',
    ready: 'Listo para retirar',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    pending: 'Por revisar',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  };
  return labels[status ?? ''] ?? status ?? 'Sin estado';
}

/**
 * Returns Tailwind CSS color & border classes for status badge badges.
 */
export function statusClass(status?: string): string {
  if (status === 'approved' || status === 'paid' || status === 'delivered') {
    return 'bg-[#d9eee5] text-[#256b55] border-[#b8dccd]';
  }
  if (status === 'rejected' || status === 'cancelled') {
    return 'bg-[#f7dfd8] text-[#a94535] border-[#e8bdb3]';
  }
  if (status === 'ready') {
    return 'bg-[#fcecc4] text-[#835b0b] border-[#eed795]';
  }
  return 'bg-[#e8e9db] text-[#53604d] border-[#d4d8bf]';
}
