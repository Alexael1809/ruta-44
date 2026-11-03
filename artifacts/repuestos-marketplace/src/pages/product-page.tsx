/**
 * @file product-page.tsx
 * @description Product detail page with photo visual, technical specs, stock verification,
 * interactive keyboard-editable quantity picker, and cart addition.
 */

import { useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import {
  ArrowLeft,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
} from 'lucide-react';
import { getGetProductQueryKey, useGetProduct } from '@workspace/api-client-react';
import { usd } from '@/lib/formatters';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/error-state';
import { PageLoader } from '@/components/shared/page-loader';
import { ProductVisual } from '@/components/shared/product-visual';

/**
 * Product detail view allowing customers to inspect SKU details, merchant info,
 * stock availability, and select quantity to add to their cart.
 */
export default function ProductPage() {
  const { id = '' } = useParams<{ id: string }>();
  const query = useGetProduct(id, {
    query: { enabled: Boolean(id), queryKey: getGetProductQueryKey(id) },
  });
  const cart = useCart();
  const [, navigate] = useLocation();
  const [quantity, setQuantity] = useState('1');

  if (query.isLoading) {
    return <PageLoader />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10">
        <ErrorState retry={() => query.refetch()} />
      </div>
    );
  }

  const product = query.data;
  const safeQuantity = Math.max(1, Math.min(product.stock || 1, Number(quantity) || 1));

  const handleDecrease = () => {
    setQuantity((value) => String(Math.max(1, (Number(value) || 1) - 1)));
  };

  const handleIncrease = () => {
    setQuantity((value) => String(Math.min(product.stock || 1, (Number(value) || 1) + 1)));
  };

  const handleAddToCart = () => {
    cart.add(product, safeQuantity);
    navigate('/cart');
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        data-testid="link-back-catalog"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_.92fr]">
        {/* Product Visual Card */}
        <div className="overflow-hidden rounded-3xl border border-card-border bg-card shadow-sm">
          <ProductVisual product={product} large />
          <div className="flex items-center justify-between border-t border-border px-5 py-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Publicación verificada
            </span>
            <span className="font-mono">{product.sku}</span>
          </div>
        </div>

        {/* Product Details & Actions */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-muted px-3 py-1 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">
              {product.category}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[.12em] ${
                product.condition === 'new'
                  ? 'border-[#b8dccd] bg-[#e8f4ef] text-[#256b55]'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {product.condition === 'new'
                ? 'Nuevo'
                : product.condition === 'used'
                  ? 'Usado'
                  : 'Reacondicionado'}
            </span>
          </div>

          <h1
            className="mt-5 max-w-xl font-display text-4xl font-bold leading-[1.02] tracking-[-.055em] sm:text-6xl"
            data-testid="text-product-title"
          >
            {product.name}
          </h1>

          <p
            className="mt-5 max-w-xl text-base leading-7 text-muted-foreground"
            data-testid="text-product-description"
          >
            {product.description ||
              'Pieza seleccionada por comerciantes locales. Confirma compatibilidad antes de pagar.'}
          </p>

          <div className="mt-8 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
            <div className="bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Precio USD</p>
              <p className="mt-1 font-display text-3xl font-bold text-primary" data-testid="text-product-price">
                {usd(product.priceUsd)}
              </p>
            </div>
            <div className="bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Disponibilidad</p>
              <div className="mt-1">
                {product.stock > 5 ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-400"
                    data-testid="badge-product-detail-stock"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Disponible ({product.stock})
                  </span>
                ) : product.stock >= 1 ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 animate-pulse dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
                    data-testid="badge-product-detail-stock"
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    ¡Solo quedan {product.stock}!
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                    data-testid="badge-product-detail-stock"
                  >
                    <span className="h-2 w-2 rounded-full bg-zinc-400" />
                    Agotado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quantity Controls & Add to Cart */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-border bg-card">
              <button
                type="button"
                className="grid h-11 w-10 place-items-center text-muted-foreground hover:text-primary"
                onClick={handleDecrease}
                aria-label="Disminuir cantidad"
                data-testid="button-decrease-quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min="1"
                max={product.stock}
                inputMode="numeric"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => setQuantity(String(safeQuantity))}
                className="h-11 w-14 bg-transparent text-center font-mono text-sm outline-none"
                aria-label="Cantidad"
                data-testid="input-product-quantity"
              />
              <button
                type="button"
                className="grid h-11 w-10 place-items-center text-muted-foreground hover:text-primary"
                onClick={handleIncrease}
                aria-label="Aumentar cantidad"
                data-testid="button-increase-quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              type="button"
              size="lg"
              className="flex-1 sm:flex-none"
              disabled={product.stock < 1}
              onClick={handleAddToCart}
              data-testid="button-add-to-cart"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Agregar al carrito</span>
            </Button>
          </div>

          <div className="mt-8 flex items-start gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">Comercio Verificado Ruta 44</span>
                <div
                  className="flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500"
                  data-testid="badge-product-merchant-reputation"
                >
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{Number(product.merchantRating ?? 5.0).toFixed(1)} / 5</span>
                  <span className="font-normal text-[11px] text-muted-foreground">
                    ({product.merchantRatingsCount ? `${product.merchantRatingsCount} calificaciones` : 'Nuevo'})
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Los datos de contacto y WhatsApp directo de la tienda se habilitan tras la confirmación del pago para coordinar la entrega.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
