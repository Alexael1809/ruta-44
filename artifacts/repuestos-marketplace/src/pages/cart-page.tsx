/**
 * @file cart-page.tsx
 * @description Shopping cart overview with live item quantity modification,
 * total calculation in USD and VEF (Bs.) based on current exchange rate,
 * and navigation forward to checkout.
 */

import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  LockKeyhole,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { getGetTodayRateQueryKey, useGetTodayRate, type Product } from '@workspace/api-client-react';
import { bs, usd } from '@/lib/formatters';
import { useCart } from '@/lib/cart-context';
import { EmptyState } from '@/components/shared/empty-state';
import { ProductVisual } from '@/components/shared/product-visual';

interface CartRowProps {
  product: Product;
  quantity: number;
}

/**
 * Individual cart item row supporting keyboard and button quantity modifications.
 */
function CartItemRow({ product, quantity }: CartRowProps) {
  const cart = useCart();
  const [localQty, setLocalQty] = useState(String(quantity));

  useEffect(() => {
    setLocalQty(String(quantity));
  }, [quantity]);

  const handleDecrease = () => {
    cart.update(product.id, quantity - 1);
  };

  const handleIncrease = () => {
    cart.update(product.id, quantity + 1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setLocalQty(val);
    const num = Number(val);
    if (num >= 1) {
      cart.update(product.id, Math.min(product.stock, num));
    }
  };

  const handleBlur = () => {
    const num = Math.min(product.stock, Math.max(1, Number(localQty) || 1));
    setLocalQty(String(num));
    cart.update(product.id, num);
  };

  return (
    <div
      className="flex gap-4 rounded-2xl border border-card-border bg-card p-4 shadow-xs sm:p-5"
      data-testid={`row-cart-${product.id}`}
    >
      <div className="w-24 shrink-0 overflow-hidden rounded-xl sm:w-32">
        <ProductVisual product={product} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
              {product.sku}
            </p>
            <Link
              href={`/product/${product.id}`}
              className="mt-1 block font-display text-lg font-semibold leading-tight hover:text-accent"
              data-testid={`link-cart-product-${product.id}`}
            >
              {product.name}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              Comercio Verificado · Reputación ⭐ {Number(product.merchantRating ?? 5.0).toFixed(1)}
            </p>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => cart.remove(product.id)}
            aria-label={`Eliminar ${product.name}`}
            data-testid={`button-remove-cart-${product.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center rounded-lg border border-border bg-background">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center"
              onClick={handleDecrease}
              aria-label="Disminuir cantidad"
              data-testid={`button-decrease-cart-${product.id}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              min="1"
              max={product.stock}
              inputMode="numeric"
              value={localQty}
              onChange={handleChange}
              onBlur={handleBlur}
              className="h-8 w-12 bg-transparent text-center font-mono text-xs outline-none"
              aria-label={`Cantidad de ${product.name}`}
              data-testid={`input-cart-quantity-${product.id}`}
            />
            <button
              type="button"
              className="grid h-8 w-8 place-items-center"
              onClick={handleIncrease}
              aria-label="Aumentar cantidad"
              data-testid={`button-increase-cart-${product.id}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-right">
            <p className="font-mono font-bold">{usd(product.priceUsd * quantity)}</p>
            <p className="text-xs text-muted-foreground">
              {quantity} × {usd(product.priceUsd)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Customer cart page displaying added products, editable quantities,
 * real-time exchange conversion, and checkout progression.
 */
export default function CartPage() {
  const cart = useCart();
  const { data: rate } = useGetTodayRate({
    query: { queryKey: getGetTodayRateQueryKey() },
  });
  const rateValue = rate?.value ?? 0;

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-20 sm:px-6">
        <EmptyState
          icon={ShoppingCart}
          title="Tu carrito está esperando una pieza"
          description="Agrega repuestos desde el catálogo y aquí verás el total con su equivalente en bolívares."
          action={
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              data-testid="link-empty-cart-catalog"
            >
              <span>Explorar catálogo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Revisión de compra</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em] sm:text-5xl">Tu carrito</h1>
        </div>
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
          onClick={cart.clear}
          data-testid="button-clear-cart"
        >
          Vaciar carrito
        </button>
      </div>

      <div className="mt-10 grid gap-7 lg:grid-cols-[1fr_360px]">
        {/* Cart Item List */}
        <div className="space-y-3">
          {cart.items.map(({ product, quantity }) => (
            <CartItemRow key={product.id} product={product} quantity={quantity} />
          ))}
        </div>

        {/* Order Summary Aside */}
        <aside className="h-fit rounded-2xl border border-card-border bg-card p-6 shadow-sm">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Resumen</p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Repuestos ({cart.totalItems})</span>
              <span className="font-mono text-foreground">{usd(cart.totalUsd)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Envío</span>
              <span className="text-xs">A coordinar</span>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex items-end justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-display text-3xl font-bold text-primary">{usd(cart.totalUsd)}</span>
              </div>
              <p className="mt-1 text-right font-mono text-xs text-accent" data-testid="text-cart-total-bs">
                {rateValue
                  ? `${bs(cart.totalUsd * rateValue)} · tasa ${rateValue.toFixed(2)}`
                  : 'Tasa no disponible'}
              </p>
            </div>
          </div>

          <Link
            href="/checkout"
            className="mt-7 flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-accent"
            data-testid="link-checkout"
          >
            <span>Continuar al checkout</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <span>Tus datos se usan solo para coordinar este pedido.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
