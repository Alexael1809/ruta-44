/**
 * @file app-header.tsx
 * Top navigation bar containing logo, main nav links, cart indicator, user profile shortcut, and mobile menu.
 */

import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Boxes,
  ClipboardList,
  Gauge,
  Menu,
  Settings2,
  ShoppingCart,
  Store,
  UserCircle,
  X,
} from 'lucide-react';
import {
  getGetCurrentUserQueryKey,
  useGetCurrentUser,
  getGetTodayRateQueryKey,
  useGetTodayRate,
} from '@workspace/api-client-react';
import { useCart } from '@/lib/cart-context';
import { Logo } from '@/components/layout/logo';

export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const [location] = useLocation();
  const { data: user } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false },
  });
  const { data: todayRate } = useGetTodayRate({
    query: { queryKey: getGetTodayRateQueryKey(), staleTime: 10 * 60 * 1000 },
  });

  const links = [
    { href: '/', label: 'Catálogo', icon: Store },
    { href: '/orders', label: 'Mis pedidos', icon: ClipboardList },
    ...(user?.role === 'admin' || user?.role === 'merchant'
      ? [{ href: '/dashboard', label: 'Operaciones', icon: Gauge }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm">
      {/* TopBar: Daily Rate & Coverage Status */}
      <div className="border-b border-sidebar-border/60 bg-black/15 py-1.5 text-xs text-sidebar-foreground/80">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] sm:text-xs">
              Tasa del día: <strong className="text-secondary">{todayRate?.value ? `Bs. ${Number(todayRate.value).toFixed(2)}` : 'Actualizando...'}</strong> / $1 USD
            </span>
          </div>
          <div className="hidden items-center gap-3 font-mono text-[11px] text-sidebar-foreground/70 sm:flex">
            <span>Entregas en Barinas</span>
            <span className="text-sidebar-border">•</span>
            <span className="text-secondary/90">Pago Móvil Seguro</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-[4.2rem] max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Logo />
        <div className="hidden h-7 w-px bg-sidebar-border md:block" />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                location === href
                  ? 'bg-sidebar-accent font-semibold text-secondary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
              data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-lg text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-secondary"
            aria-label="Ver carrito"
            data-testid="link-cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span
                className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 font-mono text-[10px] font-bold text-primary"
                data-testid="text-cart-count"
              >
                {totalItems}
              </span>
            )}
          </Link>
          <Link
            href={user ? '/settings' : '/sign-in'}
            className="hidden items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:border-secondary hover:text-secondary sm:flex"
            data-testid="link-account"
          >
            <UserCircle className="h-4 w-4" />
            <span>{user?.name?.split(' ')[0] ?? 'Mi cuenta'}</span>
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg text-sidebar-foreground md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Abrir menú"
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-sidebar-border px-4 py-3 md:hidden">
          <nav className="grid gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
                data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {(user?.role === 'admin' || user?.role === 'merchant') && (
              <Link
                href="/inventory"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
                data-testid="link-mobile-inventario"
              >
                <Boxes className="h-4 w-4" />
                Inventario
              </Link>
            )}
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
              data-testid="link-mobile-ajustes"
            >
              <Settings2 className="h-4 w-4" />
              Ajustes
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
