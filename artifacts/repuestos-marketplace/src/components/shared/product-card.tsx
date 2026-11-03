/**
 * @file product-card.tsx
 * Catalog product card displaying image/visual, details, price, and quick add-to-cart action.
 */

import { Link, useLocation } from 'wouter';
import { Heart, Plus, Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetProductQueryOptions, type Product } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { usd } from '@/lib/formatters';
import { ProductVisual } from '@/components/shared/product-visual';

export interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const cart = useCart();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Instant Prefetching: loads product details into cache on hover or touch before navigation
  const prefetchProduct = () => {
    queryClient.prefetchQuery(getGetProductQueryOptions(product.id));
  };

  const isOutOfStock = product.stock <= 0;

  return (
    <article
      onMouseEnter={prefetchProduct}
      onTouchStart={prefetchProduct}
      className="group overflow-hidden rounded-2xl border border-card-border bg-card shadow-xs transition duration-300 hover:-translate-y-1 hover:shadow-workshop"
      data-testid={`card-product-${product.id}`}
    >
      <Link
        href={`/product/${product.id}`}
        className="block"
        data-testid={`link-product-${product.id}`}
      >
        <ProductVisual product={product} />
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
            {product.category}
          </span>
          <button
            type="button"
            className="text-muted-foreground transition hover:text-destructive"
            aria-label={`Guardar ${product.name}`}
            data-testid={`button-favorite-${product.id}`}
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
        <Link
          href={`/product/${product.id}`}
          className="mt-2 block font-display text-[1.08rem] font-semibold leading-tight text-foreground hover:text-accent"
          data-testid={`link-product-name-${product.id}`}
        >
          {product.name}
        </Link>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <div
            className="flex items-center gap-1 font-semibold text-amber-500"
            title={`Reputación del comercio: ${product.merchantRating ?? 5.0} de 5 estrellas`}
            data-testid={`badge-merchant-rating-${product.id}`}
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-mono text-[11px] text-foreground">
              {Number(product.merchantRating ?? 5.0).toFixed(1)}
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">
              ({product.merchantRatingsCount ? `${product.merchantRatingsCount}` : 'Nuevo'})
            </span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {product.condition === 'new'
              ? 'Nuevo'
              : product.condition === 'used'
                ? 'Usado'
                : 'Reacondicionado'}
          </span>
        </div>

        {/* Semantic stock urgency badges */}
        <div className="mt-2.5">
          {product.stock > 5 ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-400"
              data-testid={`badge-stock-available-${product.id}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Disponible ({product.stock})
            </span>
          ) : product.stock >= 1 ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 animate-pulse dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
              data-testid={`badge-stock-urgency-${product.id}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              ¡Solo quedan {product.stock}!
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
              data-testid={`badge-stock-out-${product.id}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              Agotado
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-lg font-bold text-primary">{usd(product.priceUsd)}</p>
            <p className="text-[11px] font-mono text-muted-foreground">SKU: {product.sku}</p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (isOutOfStock) return;
              cart.add(product);
              navigate('/cart');
            }}
            disabled={isOutOfStock}
            className={isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}
            data-testid={`button-add-product-${product.id}`}
          >
            <Plus className="h-4 w-4" />
            <span>{isOutOfStock ? 'Agotado' : 'Agregar'}</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
