/**
 * @file cart-context.tsx
 * Shopping cart state management provider and custom hook with localStorage persistence.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '@workspace/api-client-react';

export type CartItem = {
  product: Product;
  quantity: number;
};

export type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalUsd: number;
  add: (product: Product, quantity?: number) => void;
  update: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ruta44-cart') ?? '[]') as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ruta44-cart', JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalUsd: items.reduce((sum, item) => sum + item.product.priceUsd * item.quantity, 0),
      add: (product, quantity = 1) =>
        setItems((current) => {
          const existing = current.find((item) => item.product.id === product.id);
          if (existing) {
            return current.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
                : item,
            );
          }
          return [...current, { product, quantity: Math.min(quantity, product.stock) }];
        }),
      update: (productId, quantity) =>
        setItems((current) =>
          quantity <= 0
            ? current.filter((item) => item.product.id !== productId)
            : current.map((item) =>
                item.product.id === productId
                  ? { ...item, quantity: Math.min(quantity, item.product.stock) }
                  : item,
              ),
        ),
      remove: (productId) =>
        setItems((current) => current.filter((item) => item.product.id !== productId)),
      clear: () => setItems([]),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
}
