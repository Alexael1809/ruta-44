/**
 * @file product-visual.tsx
 * Visual representation of an auto part product, displaying the image or a stylized geometric placeholder.
 */

import type { Product } from '@workspace/api-client-react';

export interface ProductVisualProps {
  product: Product;
  large?: boolean;
}

export function ProductVisual({ product, large = false }: ProductVisualProps) {
  const initials = product.name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return product.imageUrl ? (
    <img
      src={product.imageUrl}
      alt={product.name}
      className={`w-full object-cover ${large ? 'h-[340px]' : 'h-44'}`}
      data-testid={`img-product-${product.id}`}
    />
  ) : (
    <div
      className={`relative flex w-full items-end overflow-hidden bg-[#dfe5d8] ${
        large ? 'h-[340px]' : 'h-44'
      }`}
      data-testid={`img-product-${product.id}`}
    >
      <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border-[18px] border-[#b9c8bb]/70" />
      <div className="absolute -bottom-16 -left-6 h-36 w-36 rounded-full border-[18px] border-[#c6d2c1]/60" />
      <div className="relative z-10 p-5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[.22em] text-primary/55">
          {product.category}
        </span>
        <div className="mt-1 font-display text-5xl font-bold tracking-[-.08em] text-primary/80">
          {initials}
        </div>
      </div>
      <div className="absolute bottom-5 right-5 h-12 w-12 rounded-full border-4 border-primary/15" />
    </div>
  );
}
