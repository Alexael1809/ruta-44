import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  getGetCurrentUserQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetOrderQueryKey,
  getGetPaymentReceiverQueryKey,
  getGetProductQueryKey,
  getGetTodayRateQueryKey,
  getListAdminUsersQueryKey,
  getListDeliveryLocationsQueryKey,
  getListOrdersQueryKey,
  getListPaymentsQueryKey,
  getListProductsQueryKey,
  useCreateExchangeRate,
  useCreateDeliveryLocation,
  useCreateOrder,
  useCreateProduct,
  useDeleteProduct,
  useGetCurrentUser,
  useGetDashboardSummary,
  useGetOrder,
  useGetPaymentReceiver,
  useGetProduct,
  useGetTodayRate,
  useListOrders,
  useListAdminUsers,
  useListDeliveryLocations,
  useListPayments,
  useListProducts,
  useSubmitPayment,
  useUpdateDeliveryLocation,
  useUpdateOrderStatus,
  useUpdatePaymentReceiver,
  useUpdateProduct,
  useUpdateUserRole,
  type Product,
  type Order,
  type AdminUser,
  type DeliveryLocation,
} from '@workspace/api-client-react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Boxes,
  CarFront,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Eye,
  EyeOff,
  Gauge,
  Heart,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  MapPin,
  Menu,
  Minus,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  UserCircle,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

type Notice = { tone: 'success' | 'error' | 'info'; text: string };
type CartItem = { product: Product; quantity: number };
type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalUsd: number;
  add: (product: Product, quantity?: number) => void;
  update: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ruta44-cart') ?? '[]') as CartItem[];
    } catch {
      return [];
    }
  });
  useEffect(() => localStorage.setItem('ruta44-cart', JSON.stringify(items)), [items]);
  const value = useMemo<CartContextValue>(() => ({
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalUsd: items.reduce((sum, item) => sum + item.product.priceUsd * item.quantity, 0),
    add: (product, quantity = 1) => setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) return current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) } : item);
      return [...current, { product, quantity: Math.min(quantity, product.stock) }];
    }),
    update: (productId, quantity) => setItems((current) => quantity <= 0 ? current.filter((item) => item.product.id !== productId) : current.map((item) => item.product.id === productId ? { ...item, quantity: Math.min(quantity, item.product.stock) } : item)),
    remove: (productId) => setItems((current) => current.filter((item) => item.product.id !== productId)),
    clear: () => setItems([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}

function usd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function bs(value: number) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }).format(value).replace('VES', 'Bs.');
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function statusLabel(status?: string) {
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

function statusClass(status?: string) {
  if (status === 'approved' || status === 'paid' || status === 'delivered') return 'bg-[#d9eee5] text-[#256b55] border-[#b8dccd]';
  if (status === 'rejected' || status === 'cancelled') return 'bg-[#f7dfd8] text-[#a94535] border-[#e8bdb3]';
  if (status === 'ready') return 'bg-[#fcecc4] text-[#835b0b] border-[#eed795]';
  return 'bg-[#e8e9db] text-[#53604d] border-[#d4d8bf]';
}

function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = (next: Notice) => {
    setNotice(next);
    window.setTimeout(() => setNotice(null), 3500);
  };
  return { notice, notify };
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary shadow-sm">
        <Wrench className="h-5 w-5" strokeWidth={2.6} />
      </span>
      {!compact && <span className="font-display text-[1.15rem] font-bold tracking-[-.03em] text-sidebar-foreground">RUTA <span className="text-secondary">44</span></span>}
    </Link>
  );
}

function NoticeBar({ notice, onDismiss }: { notice: Notice | null; onDismiss?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [notice]);
  if (!notice || dismissed) return null;
  return (
    <div className={`fixed right-4 top-20 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-workshop ${notice.tone === 'success' ? 'border-[#b8dccd] bg-[#e8f4ef] text-[#256b55]' : notice.tone === 'error' ? 'border-[#e8bdb3] bg-[#fae9e5] text-[#a94535]' : 'border-[#e5d394] bg-[#fff5d8] text-[#73540c]'}`} data-testid="status-notice">
      {notice.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{notice.text}</span>
      <button type="button" className="ml-1 opacity-60 hover:opacity-100" onClick={() => { setDismissed(true); onDismiss?.(); }} aria-label="Cerrar mensaje" data-testid="button-dismiss-notice"><X className="h-4 w-4" /></button>
    </div>
  );
}

function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const [location] = useLocation();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const links = [
    { href: '/', label: 'Catálogo', icon: Store },
    { href: '/orders', label: 'Mis pedidos', icon: ClipboardList },
    ...((user?.role === 'admin' || user?.role === 'merchant') ? [{ href: '/dashboard', label: 'Operaciones', icon: Gauge }] : []),
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm">
      <div className="mx-auto flex h-[4.5rem] max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Logo />
        <div className="hidden h-7 w-px bg-sidebar-border md:block" />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${location === href ? 'bg-sidebar-accent font-semibold text-secondary' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/cart" className="relative grid h-10 w-10 place-items-center rounded-lg text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-secondary" aria-label="Ver carrito" data-testid="link-cart">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 font-mono text-[10px] font-bold text-primary" data-testid="text-cart-count">{totalItems}</span>}
          </Link>
          <Link href={user ? '/settings' : '/sign-in'} className="hidden items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:border-secondary hover:text-secondary sm:flex" data-testid="link-account">
            <UserCircle className="h-4 w-4" />
            <span>{user?.name?.split(' ')[0] ?? 'Mi cuenta'}</span>
          </Link>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-lg text-sidebar-foreground md:hidden" onClick={() => setMobileOpen((open) => !open)} aria-label="Abrir menú" data-testid="button-mobile-menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-sidebar-border px-4 py-3 md:hidden">
          <nav className="grid gap-1">
             {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent" data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon className="h-4 w-4" />{label}</Link>)}
             {(user?.role === 'admin' || user?.role === 'merchant') && <Link href="/inventory" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent" data-testid="link-mobile-inventario"><Boxes className="h-4 w-4" />Inventario</Link>}
            <Link href="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent" data-testid="link-mobile-ajustes"><Settings2 className="h-4 w-4" />Ajustes</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_.8fr_.8fr] lg:px-10">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-primary-foreground/65">Repuestos claros, precios al día y comerciantes que responden. Compra con la pieza correcta desde cualquier punto de Venezuela.</p>
        </div>
        <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-secondary">Comprar</p><div className="mt-4 grid gap-3 text-sm text-primary-foreground/70"><Link href="/" data-testid="link-footer-catalogo">Catálogo</Link><Link href="/orders" data-testid="link-footer-orders">Seguimiento de pedidos</Link><Link href="/cart" data-testid="link-footer-cart">Carrito</Link></div></div>
        <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-secondary">Operaciones</p><div className="mt-4 grid gap-3 text-sm text-primary-foreground/70"><Link href="/inventory" data-testid="link-footer-inventory">Inventario</Link><Link href="/payments" data-testid="link-footer-payments">Pagos móviles</Link><Link href="/settings" data-testid="link-footer-settings">Ajustes y tasa</Link></div></div>
      </div>
      <div className="border-t border-primary-foreground/10 px-4 py-4 text-center font-mono text-[10px] uppercase tracking-[.14em] text-primary-foreground/45">Hecho para los talleres que mantienen a Venezuela en movimiento</div>
    </footer>
  );
}

function AppFrame({ children }: { children: ReactNode }) {
  const { notice } = useNotice();
  return <div className="min-h-[100dvh]"><AppHeader /><main className="route-enter">{children}</main><AppFooter /><NoticeBar notice={notice} /></div>;
}

function ProductVisual({ product, large = false }: { product: Product; large?: boolean }) {
  const initials = product.name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return product.imageUrl ? <img src={product.imageUrl} alt={product.name} className={`w-full object-cover ${large ? 'h-[340px]' : 'h-44'}`} data-testid={`img-product-${product.id}`} /> : (
    <div className={`relative flex w-full items-end overflow-hidden bg-[#dfe5d8] ${large ? 'h-[340px]' : 'h-44'}`} data-testid={`img-product-${product.id}`}>
      <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border-[18px] border-[#b9c8bb]/70" />
      <div className="absolute -bottom-16 -left-6 h-36 w-36 rounded-full border-[18px] border-[#c6d2c1]/60" />
      <div className="relative z-10 p-5"><span className="font-mono text-[10px] font-bold uppercase tracking-[.22em] text-primary/55">{product.category}</span><div className="mt-1 font-display text-5xl font-bold tracking-[-.08em] text-primary/80">{initials}</div></div>
      <div className="absolute bottom-5 right-5 h-12 w-12 rounded-full border-4 border-primary/15" />
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const [, navigate] = useLocation();
  return (
    <article className="group overflow-hidden rounded-2xl border border-card-border bg-card shadow-xs transition duration-300 hover:-translate-y-1 hover:shadow-workshop" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.id}`} className="block" data-testid={`link-product-${product.id}`}><ProductVisual product={product} /></Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3"><span className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">{product.category}</span><button type="button" className="text-muted-foreground transition hover:text-destructive" aria-label={`Guardar ${product.name}`} data-testid={`button-favorite-${product.id}`}><Heart className="h-4 w-4" /></button></div>
        <Link href={`/product/${product.id}`} className="mt-2 block font-display text-[1.08rem] font-semibold leading-tight text-foreground hover:text-accent" data-testid={`link-product-name-${product.id}`}>{product.name}</Link>
        <p className="mt-1 text-xs text-muted-foreground">{product.merchantName} · {product.condition === 'new' ? 'Nuevo' : product.condition === 'used' ? 'Usado' : 'Reacondicionado'}</p>
        <div className="mt-4 flex items-end justify-between gap-3"><div><p className="font-mono text-lg font-bold text-primary">{usd(product.priceUsd)}</p><p className="text-xs text-muted-foreground">Stock: {product.stock}</p></div><Button type="button" size="sm" onClick={() => { cart.add(product); navigate('/cart'); }} disabled={product.stock < 1} data-testid={`button-add-product-${product.id}`}><Plus className="h-4 w-4" />Agregar</Button></div>
      </div>
    </article>
  );
}

function CatalogSkeleton() {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="overflow-hidden rounded-2xl border border-card-border bg-card" data-testid={`skeleton-product-${item}`}><div className="h-44 animate-pulse bg-muted" /><div className="space-y-3 p-4"><div className="h-3 w-20 animate-pulse rounded bg-muted" /><div className="h-5 w-4/5 animate-pulse rounded bg-muted" /><div className="h-9 w-full animate-pulse rounded bg-muted" /></div></div>)}</div>;
}

function HomePage() {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ search: submittedSearch || undefined, category: category || undefined, page, pageSize: 12 }), [category, page, submittedSearch]);
  const productsQuery = useListProducts(params);
  const products = productsQuery.data?.items ?? [];
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).slice(0, 6), [products]);
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setPage(1); setSubmittedSearch(search.trim()); };
  return (
    <div>
      <section className="stripe-bg overflow-hidden text-primary-foreground">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:py-24">
          <div className="rise-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.16em] text-secondary"><span className="pulse-dot h-2 w-2 rounded-full bg-secondary" />Marketplace venezolano de repuestos</div>
            <h1 className="max-w-2xl font-display text-5xl font-bold leading-[.98] tracking-[-.06em] sm:text-7xl">La pieza correcta.<br /><span className="text-secondary">Sin adivinar.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-primary-foreground/70 sm:text-lg">Busca por nombre, código o categoría. Compara precios en USD, mira el equivalente en bolívares y compra a comerciantes locales que conocen su inventario.</p>
            <form className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-primary-foreground p-2 shadow-workshop sm:flex-row" onSubmit={submitSearch} data-testid="form-search-catalog">
              <div className="flex flex-1 items-center gap-3 px-3"><Search className="h-5 w-5 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. pastillas de freno, SKF 6204..." className="min-w-0 flex-1 bg-transparent py-3 text-sm text-primary outline-none placeholder:text-muted-foreground" data-testid="input-search-products" /></div>
              <Button type="submit" className="h-12 rounded-xl px-6" data-testid="button-search-products">Buscar repuesto</Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-primary-foreground/55"><span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-secondary" />Comerciantes verificados</span><span className="flex items-center gap-1.5"><CircleDollarSign className="h-3.5 w-3.5 text-secondary" />Tasa visible del día</span><span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-secondary" />Retiro y envío coordinado</span></div>
          </div>
          <div className="relative hidden min-h-[360px] lg:block">
            <div className="absolute inset-8 rotate-3 rounded-[2rem] border border-secondary/20 bg-secondary/10" />
            <div className="absolute inset-0 flex items-center justify-center"><div className="relative grid h-[310px] w-[310px] place-items-center rounded-full border border-secondary/35 bg-primary/50 shadow-workshop"><div className="absolute inset-7 rounded-full border border-secondary/15" /><CarFront className="h-40 w-40 text-secondary" strokeWidth={1.1} /><span className="absolute bottom-7 rounded-full bg-secondary px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-primary">Verificado en ruta</span></div></div>
            <div className="absolute left-0 top-12 w-44 rounded-xl border border-primary-foreground/10 bg-primary-foreground/10 p-4 backdrop-blur-sm"><p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Hoy</p><p className="mt-2 font-display text-2xl font-bold">2.418</p><p className="text-xs text-primary-foreground/55">piezas disponibles</p></div>
            <div className="absolute bottom-7 right-0 w-48 rounded-xl border border-primary-foreground/10 bg-primary-foreground/10 p-4 backdrop-blur-sm"><p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Confianza</p><p className="mt-2 flex items-center gap-2 font-display text-lg font-bold"><ShieldCheck className="h-5 w-5 text-secondary" />Datos claros</p></div>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Explora el catálogo</p><h2 className="mt-2 font-display text-3xl font-bold tracking-[-.04em] sm:text-4xl">{submittedSearch ? `Resultados para “${submittedSearch}”` : 'Lo que más se mueve esta semana'}</h2></div><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-muted-foreground">Filtrar:</span><button type="button" onClick={() => { setCategory(''); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs transition ${!category ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary'}`} data-testid="button-filter-all">Todo</button>{categories.map((item) => <button type="button" key={item} onClick={() => { setCategory(item); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs transition ${category === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary'}`} data-testid={`button-filter-${item}`}>{item}</button>)}</div></div>
        {productsQuery.isLoading ? <CatalogSkeleton /> : productsQuery.isError ? <ErrorState retry={() => productsQuery.refetch()} /> : products.length === 0 ? <EmptyState icon={Search} title="No encontramos esa pieza" description="Prueba con otro código, una categoría distinta o limpia los filtros." action={<Button type="button" onClick={() => { setSearch(''); setSubmittedSearch(''); setCategory(''); }} data-testid="button-clear-filters">Limpiar filtros</Button>} /> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
        {productsQuery.data && productsQuery.data.totalPages > 1 && <div className="mt-8 flex items-center justify-center gap-3"><Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} data-testid="button-previous-page"><ArrowLeft className="h-4 w-4" />Anterior</Button><span className="font-mono text-xs text-muted-foreground" data-testid="text-pagination">Página {page} de {productsQuery.data.totalPages}</span><Button type="button" variant="outline" size="sm" disabled={page >= productsQuery.data.totalPages} onClick={() => setPage((current) => current + 1)} data-testid="button-next-page">Siguiente<ArrowRight className="h-4 w-4" /></Button></div>}
        <section className="mt-20 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl bg-secondary p-7 text-primary sm:p-10"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary/65">Antes de comprar</p><h3 className="mt-3 max-w-md font-display text-3xl font-bold leading-tight tracking-[-.04em]">Un código correcto ahorra una devolución.</h3><p className="mt-4 max-w-md text-sm leading-6 text-primary/70">Si no estás seguro, ten a mano marca, modelo y año del vehículo. Los comerciantes pueden confirmar compatibilidad antes de que pagues.</p><Link href="/sign-in" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline" data-testid="link-help-buying">Quiero comprar con cuenta <ArrowRight className="h-4 w-4" /></Link></div>
           <div className="rounded-2xl border border-card-border bg-card p-7 shadow-xs sm:p-10"><div className="flex items-start justify-between gap-5"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">¿Quieres formar parte?</p><h3 className="mt-3 max-w-md font-display text-3xl font-bold tracking-[-.04em]">Si quieres ser aliado nuestro contáctanos al</h3></div><Phone className="h-8 w-8 shrink-0 text-[#25D366]" /></div><a href="https://wa.me/qr/VALY6ZX5YZLKE1o" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2" data-testid="link-merchant-whatsapp"><Phone className="h-4 w-4" />Escribir por WhatsApp</a></div>
        </section>
      </main>
    </div>
  );
}

function ErrorState({ retry }: { retry: () => void }) {
  return <div className="rounded-2xl border border-[#e8bdb3] bg-[#fae9e5] p-10 text-center" data-testid="state-error"><AlertCircle className="mx-auto h-8 w-8 text-destructive" /><h3 className="mt-3 font-display text-xl font-bold text-[#71372e]">Algo no cargó bien</h3><p className="mx-auto mt-2 max-w-md text-sm text-[#8c554a]">Revisa tu conexión y vuelve a intentarlo. No se ha perdido nada.</p><Button type="button" variant="outline" className="mt-5 border-[#d99c90] text-[#71372e]" onClick={retry} data-testid="button-retry"><RefreshCw className="h-4 w-4" />Reintentar</Button></div>;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof Search; title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center" data-testid="state-empty"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-accent"><Icon className="h-6 w-6" /></span><h3 className="mt-5 font-display text-2xl font-bold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function ProductPage() {
  const { id = '' } = useParams<{ id: string }>();
  const query = useGetProduct(id, { query: { enabled: Boolean(id), queryKey: getGetProductQueryKey(id) } });
  const cart = useCart();
  const [, navigate] = useLocation();
  const [quantity, setQuantity] = useState('1');
  if (query.isLoading) return <PageLoader />;
  if (query.isError || !query.data) return <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10"><ErrorState retry={() => query.refetch()} /></div>;
  const product = query.data;
  const safeQuantity = Math.max(1, Math.min(product.stock || 1, Number(quantity) || 1));
  return <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-catalog"><ArrowLeft className="h-4 w-4" />Volver al catálogo</Link><div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_.92fr]"><div className="overflow-hidden rounded-3xl border border-card-border bg-card shadow-sm"><ProductVisual product={product} large /><div className="flex items-center justify-between border-t border-border px-5 py-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" />Publicación verificada</span><span className="font-mono">{product.sku}</span></div></div><div className="flex flex-col justify-center"><div className="flex items-center gap-3"><span className="rounded-full bg-muted px-3 py-1 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">{product.category}</span><span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[.12em] ${product.condition === 'new' ? 'border-[#b8dccd] bg-[#e8f4ef] text-[#256b55]' : 'border-border bg-card text-muted-foreground'}`}>{product.condition === 'new' ? 'Nuevo' : product.condition === 'used' ? 'Usado' : 'Reacondicionado'}</span></div><h1 className="mt-5 max-w-xl font-display text-4xl font-bold leading-[1.02] tracking-[-.055em] sm:text-6xl" data-testid="text-product-title">{product.name}</h1><p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground" data-testid="text-product-description">{product.description || 'Pieza seleccionada por comerciantes locales. Confirma compatibilidad antes de pagar.'}</p><div className="mt-8 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border"><div className="bg-card p-4"><p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Precio USD</p><p className="mt-1 font-display text-3xl font-bold text-primary" data-testid="text-product-price">{usd(product.priceUsd)}</p></div><div className="bg-card p-4"><p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Disponibilidad</p><p className="mt-1 font-display text-3xl font-bold text-accent" data-testid="text-product-stock">{product.stock} <span className="text-sm font-normal text-muted-foreground">unid.</span></p></div></div><div className="mt-8 flex flex-wrap items-center gap-3"><div className="flex items-center rounded-lg border border-border bg-card"><button type="button" className="grid h-11 w-10 place-items-center text-muted-foreground hover:text-primary" onClick={() => setQuantity((value) => String(Math.max(1, (Number(value) || 1) - 1)))} aria-label="Disminuir cantidad" data-testid="button-decrease-quantity"><Minus className="h-4 w-4" /></button><input type="number" min="1" max={product.stock} inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/[^0-9]/g, ''))} onBlur={() => setQuantity(String(safeQuantity))} className="h-11 w-14 bg-transparent text-center font-mono text-sm outline-none" aria-label="Cantidad" data-testid="input-product-quantity" /><button type="button" className="grid h-11 w-10 place-items-center text-muted-foreground hover:text-primary" onClick={() => setQuantity((value) => String(Math.min(product.stock || 1, (Number(value) || 1) + 1)))} aria-label="Aumentar cantidad" data-testid="button-increase-quantity"><Plus className="h-4 w-4" /></button></div><Button type="button" size="lg" className="flex-1 sm:flex-none" disabled={product.stock < 1} onClick={() => { cart.add(product, safeQuantity); navigate('/cart'); }} data-testid="button-add-to-cart"><ShoppingCart className="h-4 w-4" />Agregar al carrito</Button></div><div className="mt-8 flex items-start gap-3 border-t border-border pt-6 text-sm text-muted-foreground"><Store className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><span>Vendido por <strong className="text-foreground">{product.merchantName}</strong>. Pregunta por compatibilidad y coordina retiro o envío.</span></div></div></div></div>;
}

function CartPage() {
  const cart = useCart();
  const { data: rate } = useGetTodayRate({ query: { queryKey: getGetTodayRateQueryKey() } });
  const rateValue = rate?.value ?? 0;
  if (!cart.items.length) return <div className="mx-auto max-w-[900px] px-4 py-20 sm:px-6"><EmptyState icon={ShoppingCart} title="Tu carrito está esperando una pieza" description="Agrega repuestos desde el catálogo y aquí verás el total con su equivalente en bolívares." action={<Link href="/" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" data-testid="link-empty-cart-catalog">Explorar catálogo <ArrowRight className="h-4 w-4" /></Link>} /></div>;
  return <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 lg:py-14"><div className="flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Revisión de compra</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em] sm:text-5xl">Tu carrito</h1></div><button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline" onClick={cart.clear} data-testid="button-clear-cart">Vaciar carrito</button></div><div className="mt-10 grid gap-7 lg:grid-cols-[1fr_360px]"><div className="space-y-3">{cart.items.map(({ product, quantity }) => <div key={product.id} className="flex gap-4 rounded-2xl border border-card-border bg-card p-4 shadow-xs sm:p-5" data-testid={`row-cart-${product.id}`}><div className="w-24 shrink-0 overflow-hidden rounded-xl sm:w-32"><ProductVisual product={product} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">{product.sku}</p><Link href={`/product/${product.id}`} className="mt-1 block font-display text-lg font-semibold leading-tight hover:text-accent" data-testid={`link-cart-product-${product.id}`}>{product.name}</Link><p className="mt-1 text-xs text-muted-foreground">{product.merchantName}</p></div><button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => cart.remove(product.id)} aria-label={`Eliminar ${product.name}`} data-testid={`button-remove-cart-${product.id}`}><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 flex items-center justify-between"><div className="flex items-center rounded-lg border border-border bg-background"><button type="button" className="grid h-8 w-8 place-items-center" onClick={() => cart.update(product.id, quantity - 1)} aria-label="Disminuir cantidad" data-testid={`button-decrease-cart-${product.id}`}><Minus className="h-3.5 w-3.5" /></button><input type="number" min="1" max={product.stock} inputMode="numeric" value={quantity} onChange={(event) => { const value = event.target.value; if (value !== '') cart.update(product.id, Math.min(product.stock, Math.max(1, Number(value)))); }} className="h-8 w-12 bg-transparent text-center font-mono text-xs outline-none" aria-label={`Cantidad de ${product.name}`} data-testid={`input-cart-quantity-${product.id}`} /><button type="button" className="grid h-8 w-8 place-items-center" onClick={() => cart.update(product.id, quantity + 1)} aria-label="Aumentar cantidad" data-testid={`button-increase-cart-${product.id}`}><Plus className="h-3.5 w-3.5" /></button></div><div className="text-right"><p className="font-mono font-bold">{usd(product.priceUsd * quantity)}</p><p className="text-xs text-muted-foreground">{quantity} × {usd(product.priceUsd)}</p></div></div></div></div>)}</div><aside className="h-fit rounded-2xl border border-card-border bg-card p-6 shadow-sm"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Resumen</p><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-muted-foreground"><span>Repuestos ({cart.totalItems})</span><span className="font-mono text-foreground">{usd(cart.totalUsd)}</span></div><div className="flex justify-between text-muted-foreground"><span>Envío</span><span className="text-xs">A coordinar</span></div><div className="border-t border-border pt-4"><div className="flex items-end justify-between"><span className="font-semibold">Total</span><span className="font-display text-3xl font-bold text-primary">{usd(cart.totalUsd)}</span></div><p className="mt-1 text-right font-mono text-xs text-accent" data-testid="text-cart-total-bs">{rateValue ? `${bs(cart.totalUsd * rateValue)} · tasa ${rateValue.toFixed(2)}` : 'Tasa no disponible'}</p></div></div><Link href="/checkout" className="mt-7 flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-accent" data-testid="link-checkout">Continuar al checkout <ArrowRight className="h-4 w-4" /></Link><div className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />Tus datos se usan solo para coordinar este pedido.</div></aside></div></div>;
}

function CheckoutPage() {
  const cart = useCart();
  const { data: rate } = useGetTodayRate({ query: { queryKey: getGetTodayRateQueryKey() } });
  const { data: deliveryLocations = [] } = useListDeliveryLocations({ query: { queryKey: getListDeliveryLocationsQueryKey(), staleTime: 5 * 60 * 1000 } });
  const { data: receiver } = useGetPaymentReceiver({ query: { queryKey: getGetPaymentReceiverQueryKey(), retry: false } });
  const createOrder = useCreateOrder();
  const submitPayment = useSubmitPayment();
  const queryClient = useQueryClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Barinas');
  const [notes, setNotes] = useState('');
  const [bank, setBank] = useState('');
  const [identity, setIdentity] = useState('');
  const [reference, setReference] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = (next: Notice) => { setNotice(next); window.setTimeout(() => setNotice(null), 4000); };
  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!cart.items.length) return;
      createOrder.mutate({ data: { customerName: name, customerPhone: phone, deliveryCity, pickupNotes: notes || undefined, items: cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })) } }, {
      onSuccess: (created) => { setOrder(created); cart.clear(); queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }); notify({ tone: 'success', text: `Pedido ${created.id.slice(0, 8)} creado. Ahora registra tu pago móvil.` }); },
      onError: () => notify({ tone: 'error', text: 'No pudimos crear el pedido. Revisa tus datos e inténtalo de nuevo.' }),
    });
  };
  const sendPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!order) return;
    submitPayment.mutate({ data: { orderId: order.id, bank, identityNumber: identity, reference, phone: paymentPhone || phone, amountBs: order.totalBs } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(order.id) }); notify({ tone: 'success', text: 'Pago enviado. Te avisaremos cuando el equipo lo valide.' }); },
      onError: () => notify({ tone: 'error', text: 'No pudimos enviar el pago. Verifica la referencia.' }),
    });
  };
  if (!order && !cart.items.length) return <div className="mx-auto max-w-[900px] px-4 py-20 sm:px-6"><EmptyState icon={ShoppingCart} title="No hay nada que cobrar todavía" description="Vuelve al catálogo, agrega una pieza y el checkout aparecerá aquí." action={<Link href="/" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" data-testid="link-checkout-catalog">Ver catálogo <ArrowRight className="h-4 w-4" /></Link>} /></div>;
  return <div className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6 lg:py-14"><Link href="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-cart"><ArrowLeft className="h-4 w-4" />Volver al carrito</Link><div className="mt-7 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Compra segura</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em] sm:text-5xl">{order ? 'Registra tu pago móvil' : 'Coordina tu pedido'}</h1></div><div className="hidden items-center gap-2 sm:flex"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${order ? 'bg-accent text-white' : 'bg-primary text-primary-foreground'}`}>{order ? <Check className="h-4 w-4" /> : '1'}</span><span className="h-px w-8 bg-border" /><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${order ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</span></div></div>{notice && <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />} {!order ? <form key="create-order-form" onSubmit={create} className="mt-9 grid gap-7 lg:grid-cols-[1fr_340px]" data-testid="form-create-order"><div className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-8"><h2 className="font-display text-2xl font-bold">Datos de contacto</h2><p className="mt-1 text-sm text-muted-foreground">El comerciante los usará para confirmar disponibilidad y entrega.</p><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium sm:col-span-2">Nombre completo<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-offset-background focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Ej. Mariana González" data-testid="input-checkout-name" /></label><label className="grid gap-2 text-sm font-medium">Teléfono<input required minLength={7} value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="0412 000 0000" data-testid="input-checkout-phone" /></label><label className="grid gap-2 text-sm font-medium">Ciudad de entrega<select value={deliveryCity} onChange={(event) => setDeliveryCity(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" data-testid="input-checkout-city">{(deliveryLocations.length ? deliveryLocations : [{ id: 'barinas', state: 'Barinas', city: 'Barinas', isEnabled: true }]).map((location) => <option key={location.id} value={location.city}>{location.city}</option>)}</select></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Nota<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" data-testid="textarea-checkout-notes" /></label></div></div><OrderSummary amountUsd={cart.totalUsd} rate={rate?.value} submitting={createOrder.isPending} /></form> : <form key="submit-payment-form" onSubmit={sendPayment} className="mt-9 grid gap-7 lg:grid-cols-[1fr_340px]" data-testid="form-submit-payment"><div className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-8"><div className="rounded-xl border border-[#b8dccd] bg-[#e8f4ef] p-4 text-sm text-[#256b55]"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />Pedido creado: {order.id.slice(0, 8)}</div><p className="mt-1 text-xs leading-5">Transfiere el equivalente exacto de {bs(order.totalBs)} y registra los datos abajo.</p></div>{receiver && <div className="mt-6 rounded-xl border border-border bg-background p-4"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent">Datos del receptor</p><p className="mt-2 font-semibold">{receiver.bank}</p><p className="mt-1 text-sm text-muted-foreground">Teléfono: {receiver.phone} · Cédula: {receiver.identityNumber}</p></div>}<h2 className="mt-8 font-display text-2xl font-bold">Datos del pago móvil</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Banco emisor<input required value={bank} onChange={(event) => setBank(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Ej. Banesco" data-testid="input-payment-bank" /></label><label className="grid gap-2 text-sm font-medium">Cédula<input required value={identity} onChange={(event) => setIdentity(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="V-12.345.678" data-testid="input-payment-identity" /></label><label className="grid gap-2 text-sm font-medium">Referencia<input required value={reference} onChange={(event) => setReference(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Últimos 6 dígitos" data-testid="input-payment-reference" /></label><label className="grid gap-2 text-sm font-medium">Teléfono<input required value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="0412 000 0000" data-testid="input-payment-phone" /></label></div><p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />El equipo revisará tu comprobante antes de preparar la pieza.</p></div><aside className="h-fit rounded-2xl border border-card-border bg-card p-6 shadow-sm"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Monto a enviar</p><p className="mt-3 font-display text-4xl font-bold text-primary" data-testid="text-payment-total-bs">{bs(order.totalBs)}</p><p className="mt-1 text-sm text-muted-foreground">{usd(order.totalUsd)} · tasa {order.exchangeRate.toFixed(2)}</p><Button type="submit" className="mt-7 w-full" disabled={submitPayment.isPending} data-testid="button-submit-payment">{submitPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar pago móvil</Button><Link href={`/orders/${order.id}`} className="mt-3 flex h-10 items-center justify-center text-sm text-muted-foreground hover:text-foreground" data-testid="link-view-created-order">Ver pedido</Link></aside></form>}</div>;
}

function OrderSummary({ amountUsd, rate, submitting }: { amountUsd: number; rate?: number; submitting: boolean }) {
  return <aside className="h-fit rounded-2xl border border-card-border bg-card p-6 shadow-sm"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Resumen del pedido</p><div className="mt-5 flex items-center justify-between text-sm text-muted-foreground"><span>Repuestos</span><span className="font-mono text-foreground">{usd(amountUsd)}</span></div><div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>Entrega</span><span className="text-xs">A coordinar</span></div><div className="mt-5 border-t border-border pt-4"><div className="flex items-end justify-between"><span className="font-semibold">Total</span><span className="font-display text-3xl font-bold">{usd(amountUsd)}</span></div>{rate ? <p className="mt-1 text-right font-mono text-xs text-accent">{bs(amountUsd * rate)}</p> : <p className="mt-1 text-right text-xs text-muted-foreground">Tasa pendiente</p>}</div><Button type="submit" className="mt-7 w-full" disabled={submitting} data-testid="button-create-order">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}Crear pedido</Button><p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Después podrás registrar tu pago móvil.</p></aside>;
}

function OrdersPage() {
  const query = useListOrders({ page: 1, pageSize: 30 });
  const orders = query.data?.items ?? [];
  return <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 lg:py-14"><div className="flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Historial</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em]">Mis pedidos</h1></div><Link href="/" className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground sm:flex" data-testid="link-orders-shop"><ShoppingCart className="h-4 w-4" />Seguir comprando</Link></div><div className="mt-9">{query.isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" data-testid={`skeleton-order-${item}`} />)}</div> : query.isError ? <ErrorState retry={() => query.refetch()} /> : orders.length === 0 ? <EmptyState icon={ClipboardList} title="Todavía no tienes pedidos" description="Cuando confirmes una compra, el seguimiento aparecerá en este espacio." action={<Link href="/" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" data-testid="link-orders-empty-shop">Ver catálogo <ArrowRight className="h-4 w-4" /></Link>} /> : <div className="space-y-3">{orders.map((order) => <OrderRow key={order.id} order={order} />)}</div>}</div></div>;
}

function OrderRow({ order }: { order: Order }) {
  return <Link href={`/orders/${order.id}`} className="group flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm sm:flex-row sm:items-center" data-testid={`row-order-${order.id}`}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-accent"><Package className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs font-bold text-primary">#{order.id.slice(0, 8).toUpperCase()}</span><Badge className={`border text-[10px] font-medium ${statusClass(order.status)}`}>{statusLabel(order.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{order.items.length} {order.items.length === 1 ? 'pieza' : 'piezas'} · {dateLabel(order.createdAt)}</p></div><div className="flex items-center justify-between gap-5 sm:justify-end"><div className="text-left sm:text-right"><p className="font-mono font-bold">{usd(order.totalUsd)}</p><p className="text-xs text-accent">{bs(order.totalBs)}</p></div><ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" /></div></Link>;
}

function OrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const query = useGetOrder(id, { query: { queryKey: getGetOrderQueryKey(id), enabled: Boolean(id) } });
  const updateStatus = useUpdateOrderStatus();
  const client = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);
  if (query.isLoading) return <PageLoader />;
  if (query.isError || !query.data) return <div className="mx-auto max-w-[1000px] px-4 py-16 sm:px-6"><ErrorState retry={() => query.refetch()} /></div>;
  const order = query.data;
  const canConfirm = order.status === 'ready';
  const confirmDelivery = () => updateStatus.mutate({ orderId: order.id, data: { status: 'delivered' } }, { onSuccess: (updated) => { client.setQueryData(getGetOrderQueryKey(order.id), updated); client.invalidateQueries({ queryKey: getListOrdersQueryKey() }); setNotice({ tone: 'success', text: 'Entrega confirmada. Gracias por usar Ruta 44.' }); } });
  const timeline = ['pending_payment', 'paid', 'preparing', 'ready', 'delivered'];
  const currentIndex = timeline.indexOf(order.status);
  return <div className="mx-auto max-w-[1050px] px-4 py-10 sm:px-6 lg:py-14"><Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-orders"><ArrowLeft className="h-4 w-4" />Volver a pedidos</Link><div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Detalle de pedido</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em]">#{order.id.slice(0, 8).toUpperCase()}</h1><p className="mt-2 text-sm text-muted-foreground">{dateLabel(order.createdAt)} · {order.customerName}</p></div><Badge className={`w-fit border px-3 py-1.5 text-xs ${statusClass(order.status)}`} data-testid="status-order-detail">{statusLabel(order.status)}</Badge></div>{notice && <div className="mt-5"><NoticeBar notice={notice} /></div>}<div className="mt-9 rounded-2xl border border-card-border bg-card p-5 shadow-xs sm:p-7"><div className="grid gap-6 md:grid-cols-5">{timeline.map((step, index) => <div key={step} className="relative flex gap-3 md:block md:text-center"><div className={`relative z-10 mx-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 ${index <= currentIndex ? 'border-accent bg-accent text-white' : 'border-border bg-background text-muted-foreground'}`}>{index < currentIndex ? <Check className="h-4 w-4" /> : <span className="font-mono text-xs">{index + 1}</span>}</div><p className={`mt-2 text-xs ${index <= currentIndex ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{statusLabel(step)}</p>{index < timeline.length - 1 && <span className={`absolute left-9 top-4 h-px w-[calc(100%-2rem)] md:left-[calc(50%+1.25rem)] md:top-4 md:w-[calc(100%-2.5rem)] ${index < currentIndex ? 'bg-accent' : 'bg-border'}`} />}</div>)}</div></div><div className="mt-7 grid gap-7 lg:grid-cols-[1fr_330px]"><div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs sm:p-7"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold">Piezas del pedido</h2><span className="font-mono text-xs text-muted-foreground">{order.items.length} líneas</span></div><div className="mt-6 divide-y divide-border">{order.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" data-testid={`row-order-item-${item.id}`}><div><p className="font-medium">{item.productName}</p><p className="mt-1 text-xs text-muted-foreground">{item.quantity} × {usd(item.unitPriceUsd)}</p></div><p className="font-mono font-bold">{usd(item.subtotalUsd)}</p></div>)}</div></div><aside className="h-fit rounded-2xl border border-card-border bg-card p-6 shadow-sm"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Total confirmado</p><p className="mt-3 font-display text-4xl font-bold">{usd(order.totalUsd)}</p><p className="mt-1 font-mono text-sm text-accent">{bs(order.totalBs)} · tasa {order.exchangeRate.toFixed(2)}</p><div className="mt-6 border-t border-border pt-5 text-sm"><p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 text-accent" />{order.customerPhone}</p>{order.pickupNotes && <p className="mt-3 flex items-start gap-2 leading-5 text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{order.pickupNotes}</p>}</div>{canConfirm && <Button type="button" className="mt-6 w-full" disabled={updateStatus.isPending} onClick={confirmDelivery} data-testid="button-confirm-delivery">{updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Confirmar entrega</Button>}</aside></div></div>;
}

function DashboardPage() {
  const query = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  if (query.isLoading) return <PageLoader />;
  if (query.isError || !query.data) return <div className="mx-auto max-w-[1250px] px-4 py-16 sm:px-6 lg:px-10"><ErrorState retry={() => query.refetch()} /></div>;
  const summary = query.data;
  return <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10 lg:py-14"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Centro de operaciones</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em] sm:text-5xl">Buenos días, equipo.</h1><p className="mt-2 text-sm text-muted-foreground">Aquí tienes una lectura rápida de lo que está pasando hoy.</p></div><Link href="/inventory" className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-xs hover:border-primary" data-testid="link-dashboard-inventory"><Boxes className="h-4 w-4 text-accent" />Revisar inventario</Link></div><div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Ventas de hoy" value={usd(summary.todaySalesUsd)} hint="acumulado del día" icon={Banknote} accent="amber" /><MetricCard label="Pagos por revisar" value={String(summary.pendingPayments)} hint="requieren atención" icon={WalletCards} accent="coral" href="/payments" /><MetricCard label="Productos activos" value={String(summary.activeProducts)} hint="visibles en catálogo" icon={Boxes} accent="teal" href="/inventory" /><MetricCard label="Comerciantes activos" value={String(summary.activeMerchants)} hint="con inventario publicado" icon={Store} accent="navy" /></div><div className="mt-8 grid gap-7 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-7"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Movimiento reciente</p><h2 className="mt-2 font-display text-2xl font-bold">Últimos pedidos</h2></div><Link href="/orders" className="text-xs font-semibold text-accent hover:underline" data-testid="link-dashboard-orders">Ver todos</Link></div><div className="mt-6 divide-y divide-border">{summary.recentOrders.length ? summary.recentOrders.slice(0, 6).map((order) => <OrderRow key={order.id} order={order} />) : <p className="py-10 text-center text-sm text-muted-foreground">Aún no hay movimiento para mostrar.</p>}</div></section><section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-7"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Demanda</p><h2 className="mt-2 font-display text-2xl font-bold">Categorías fuertes</h2></div><TrendingMark /></div><div className="mt-7 space-y-5">{summary.topCategories.length ? summary.topCategories.map((item, index) => { const max = Math.max(...summary.topCategories.map((category) => category.count), 1); return <div key={item.category} data-testid={`row-category-${item.category}`}><div className="flex items-center justify-between text-sm"><span className="font-medium">{item.category}</span><span className="font-mono text-xs text-muted-foreground">{item.count} ventas</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${index === 0 ? 'bg-secondary' : index === 1 ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${(item.count / max) * 100}%` }} /></div></div>; }) : <p className="py-10 text-center text-sm text-muted-foreground">Sin categorías todavía.</p>}</div></section></div></div>;
}

function TrendingMark() {
  return <div className="flex items-end gap-1.5" aria-label="Tendencia al alza"><span className="h-3 w-1.5 rounded-full bg-accent" /><span className="h-5 w-1.5 rounded-full bg-accent" /><span className="h-8 w-1.5 rounded-full bg-secondary" /></div>;
}

function MetricCard({ label, value, hint, icon: Icon, accent, href }: { label: string; value: string; hint: string; icon: typeof Banknote; accent: string; href?: string }) {
  const content = <div className={`rounded-2xl border border-card-border bg-card p-5 shadow-xs transition ${href ? 'hover:-translate-y-0.5 hover:shadow-sm' : ''}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${accent === 'amber' ? 'bg-[#fcecc4] text-[#835b0b]' : accent === 'coral' ? 'bg-[#f7dfd8] text-[#a94535]' : accent === 'teal' ? 'bg-[#d9eee5] text-[#256b55]' : 'bg-muted text-primary'}`}><Icon className="h-5 w-5" /></span>{href && <ChevronRight className="h-4 w-4 text-muted-foreground" />}</div><p className="mt-5 text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-bold tracking-[-.04em]" data-testid={`value-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></div>;
  return href ? <Link href={href} data-testid={`link-metric-${accent}`}>{content}</Link> : content;
}

function InventoryPage() {
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const params = useMemo(() => ({ merchantId: user?.merchantId ?? undefined, page: 1, pageSize: 50 }), [user?.merchantId]);
  const query = useListProducts(params);
  const client = useQueryClient();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const products = query.data?.items ?? [];
  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (product: Product) => { setEditing(product); setEditorOpen(true); };
  const saveProduct = (form: ProductFormValues) => {
    if (editing) updateProduct.mutate({ productId: editing.id, data: form }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListProductsQueryKey(params) }); setEditorOpen(false); setNotice({ tone: 'success', text: 'Inventario actualizado.' }); } });
    else createProduct.mutate({ data: form }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListProductsQueryKey(params) }); setEditorOpen(false); setNotice({ tone: 'success', text: 'Repuesto publicado en el catálogo.' }); } });
  };
  const archive = (product: Product) => { if (!window.confirm(`¿Archivar ${product.name}?`)) return; deleteProduct.mutate({ productId: product.id }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListProductsQueryKey(params) }); setNotice({ tone: 'success', text: 'Repuesto archivado.' }); } }); };
  return <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10 lg:py-14"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Comerciante</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em]">Inventario</h1><p className="mt-2 text-sm text-muted-foreground">Mantén visible lo que de verdad tienes en anaquel.</p></div><Button type="button" onClick={openCreate} data-testid="button-new-product"><Plus className="h-4 w-4" />Nuevo repuesto</Button></div>{notice && <div className="mt-5"><NoticeBar notice={notice} /></div>}<div className="mt-9 overflow-hidden rounded-2xl border border-card-border bg-card shadow-xs">{query.isLoading ? <div className="p-8"><div className="h-10 animate-pulse rounded bg-muted" /></div> : query.isError ? <div className="p-6"><ErrorState retry={() => query.refetch()} /></div> : products.length === 0 ? <div className="p-6"><EmptyState icon={Boxes} title="Tu inventario está vacío" description="Publica tu primer repuesto para empezar a recibir pedidos." action={<Button type="button" onClick={openCreate} data-testid="button-empty-new-product"><Plus className="h-4 w-4" />Publicar repuesto</Button>} /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border bg-muted/60 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground"><tr><th className="px-5 py-4">Repuesto</th><th className="px-5 py-4">SKU</th><th className="px-5 py-4">Precio</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Visibilidad</th><th className="px-5 py-4 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-border">{products.map((product) => <tr key={product.id} className="transition hover:bg-muted/30" data-testid={`row-inventory-${product.id}`}><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted font-mono text-xs font-bold text-accent">{product.name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</div><div><p className="font-semibold">{product.name}</p><p className="text-xs text-muted-foreground">{product.category}</p></div></div></td><td className="px-5 py-4 font-mono text-xs text-muted-foreground">{product.sku}</td><td className="px-5 py-4 font-mono font-bold">{usd(product.priceUsd)}</td><td className="px-5 py-4"><span className={product.stock < 5 ? 'font-semibold text-destructive' : ''}>{product.stock} unid.</span></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 text-xs ${product.isVisible ? 'text-accent' : 'text-muted-foreground'}`}>{product.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{product.isVisible ? 'Visible' : 'Oculto'}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => openEdit(product)} aria-label={`Editar ${product.name}`} data-testid={`button-edit-product-${product.id}`}><Pencil className="h-4 w-4" /></button><button type="button" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-[#f7dfd8] hover:text-destructive" onClick={() => archive(product)} aria-label={`Archivar ${product.name}`} data-testid={`button-delete-product-${product.id}`}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>}</div><ProductEditor open={editorOpen} product={editing} pending={createProduct.isPending || updateProduct.isPending} onClose={() => setEditorOpen(false)} onSave={saveProduct} /></div>;
}

type ProductFormValues = { name: string; sku: string; category: string; description: string; priceUsd: number; stock: number; imageUrl: string | null; isVisible: boolean; condition: 'new' | 'used' | 'refurbished' };

function ProductEditor({ open, product, pending, onClose, onSave }: { open: boolean; product: Product | null; pending: boolean; onClose: () => void; onSave: (values: ProductFormValues) => void }) {
  const [values, setValues] = useState<ProductFormValues>({ name: '', sku: '', category: 'Motor', description: '', priceUsd: 0, stock: 0, imageUrl: null, isVisible: true, condition: 'new' });
  useEffect(() => { setValues(product ? { name: product.name, sku: product.sku, category: product.category, description: product.description, priceUsd: product.priceUsd, stock: product.stock, imageUrl: product.imageUrl, isVisible: product.isVisible, condition: product.condition as ProductFormValues['condition'] } : { name: '', sku: '', category: 'Motor', description: '', priceUsd: 0, stock: 0, imageUrl: null, isVisible: true, condition: 'new' }); }, [product, open]);
  const update = (key: keyof ProductFormValues, value: string | number | boolean | null) => setValues((current) => ({ ...current, [key]: value }));
  return <Dialog open={open} onOpenChange={(next) => !next && onClose()}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle className="font-display text-2xl">{product ? 'Editar repuesto' : 'Nuevo repuesto'}</DialogTitle><DialogDescription>Los datos claros reducen preguntas y devoluciones.</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); onSave(values); }} className="grid gap-4 sm:grid-cols-2" data-testid="form-product-editor"><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Nombre<input required minLength={2} value={values.name} onChange={(event) => update('name', event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent" placeholder="Ej. Pastillas de freno delanteras" data-testid="input-product-name" /></label><label className="grid gap-1.5 text-sm font-medium">SKU<input required value={values.sku} onChange={(event) => update('sku', event.target.value)} disabled={Boolean(product)} className="h-10 rounded-md border border-input bg-background px-3 font-mono text-xs outline-none focus:border-accent disabled:bg-muted" placeholder="FR-0001" data-testid="input-product-sku" /></label><label className="grid gap-1.5 text-sm font-medium">Categoría<input required value={values.category} onChange={(event) => update('category', event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent" placeholder="Frenos" data-testid="input-product-category" /></label><label className="grid gap-1.5 text-sm font-medium">Precio USD<input required type="number" min="0" step="0.01" value={values.priceUsd} onChange={(event) => update('priceUsd', Number(event.target.value))} className="h-10 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent" data-testid="input-product-price" /></label><label className="grid gap-1.5 text-sm font-medium">Stock<input required type="number" min="0" step="1" value={values.stock} onChange={(event) => update('stock', Number(event.target.value))} className="h-10 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent" data-testid="input-product-stock" /></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Condición<select value={values.condition} onChange={(event) => update('condition', event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent" data-testid="select-product-condition"><option value="new">Nuevo</option><option value="used">Usado</option><option value="refurbished">Reacondicionado</option></select></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Descripción<textarea value={values.description} onChange={(event) => update('description', event.target.value)} className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Qué incluye y para qué modelos sirve" data-testid="textarea-product-description" /></label><label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" checked={values.isVisible} onChange={(event) => update('isVisible', event.target.checked)} className="h-4 w-4 accent-[hsl(var(--accent))]" data-testid="checkbox-product-visible" /><span>Mostrar en el catálogo público</span></label><DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-product">Cancelar</Button><Button type="submit" disabled={pending} data-testid="button-save-product">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{product ? 'Guardar cambios' : 'Publicar repuesto'}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function PaymentsPage() {
  const query = useListPayments({ page: 1, pageSize: 40 });
  const payments = query.data?.items ?? [];
  return <div className="mx-auto max-w-[1250px] px-4 py-10 sm:px-6 lg:px-10 lg:py-14"><div className="flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Administración</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em]">Pagos móviles</h1><p className="mt-2 text-sm text-muted-foreground">Revisa referencias y mantén el estado de cada pedido alineado.</p></div><div className="hidden rounded-xl border border-border bg-card px-4 py-3 text-right sm:block"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pendientes</p><p className="font-display text-2xl font-bold">{payments.filter((payment) => payment.status === 'pending').length}</p></div></div><div className="mt-9 overflow-hidden rounded-2xl border border-card-border bg-card shadow-xs">{query.isLoading ? <div className="space-y-3 p-6"><div className="h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /></div> : query.isError ? <div className="p-6"><ErrorState retry={() => query.refetch()} /></div> : payments.length === 0 ? <div className="p-6"><EmptyState icon={CreditCard} title="Sin pagos por revisar" description="Los pagos móviles enviados por tus clientes aparecerán aquí." /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-border bg-muted/60 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground"><tr><th className="px-5 py-4">Pedido</th><th className="px-5 py-4">Banco / referencia</th><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Monto</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4 text-right">Ver</th></tr></thead><tbody className="divide-y divide-border">{payments.map((payment) => <tr key={payment.id} className="hover:bg-muted/30" data-testid={`row-payment-${payment.id}`}><td className="px-5 py-4 font-mono text-xs font-bold">#{payment.orderId.slice(0, 8).toUpperCase()}</td><td className="px-5 py-4"><p className="font-medium">{payment.bank}</p><p className="font-mono text-xs text-muted-foreground">{payment.reference}</p></td><td className="px-5 py-4"><p>{payment.phone}</p><p className="font-mono text-xs text-muted-foreground">{payment.identityNumber}</p></td><td className="px-5 py-4 font-mono font-bold">{bs(payment.amountBs)}</td><td className="px-5 py-4"><Badge className={`border text-[10px] font-medium ${statusClass(payment.status)}`}>{statusLabel(payment.status)}</Badge></td><td className="px-5 py-4 text-xs text-muted-foreground">{dateLabel(payment.createdAt)}</td><td className="px-5 py-4 text-right"><Link href={`/orders/${payment.orderId}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Ver pedido asociado" data-testid={`link-payment-order-${payment.id}`}><ChevronRight className="h-4 w-4" /></Link></td></tr>)}</tbody></table></div>}</div></div>;
}

function SettingsPage() {
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const { data: rate, isLoading, isError, refetch } = useGetTodayRate({ query: { queryKey: getGetTodayRateQueryKey() } });
  const { data: receiver } = useGetPaymentReceiver({ query: { queryKey: getGetPaymentReceiverQueryKey(), retry: false } });
  const { data: locations = [] } = useListDeliveryLocations({ query: { queryKey: getListDeliveryLocationsQueryKey(), staleTime: 5 * 60 * 1000 } });
  const usersQuery = useListAdminUsers({ query: { queryKey: getListAdminUsersQueryKey(), enabled: Boolean(user?.isMaster), retry: false } });
  const createRate = useCreateExchangeRate();
  const updateReceiver = useUpdatePaymentReceiver();
  const createLocation = useCreateDeliveryLocation();
  const updateLocation = useUpdateDeliveryLocation();
  const updateRole = useUpdateUserRole();
  const client = useQueryClient();
  const [value, setValue] = useState('');
  const [bank, setBank] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverIdentity, setReceiverIdentity] = useState('');
  const [state, setState] = useState('Barinas');
  const [city, setCity] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (receiver) {
      setBank(receiver.bank);
      setReceiverPhone(receiver.phone);
      setReceiverIdentity(receiver.identityNumber);
    }
  }, [receiver]);

  const saveRate = (event: FormEvent) => {
    event.preventDefault();
    createRate.mutate({ data: { value: Number(value), currency: 'USD' } }, {
      onSuccess: (created) => {
        client.setQueryData(getGetTodayRateQueryKey(), created);
        client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setValue('');
        setNotice({ tone: 'success', text: `Tasa actualizada a ${created.value.toFixed(2)} Bs. por USD.` });
      },
      onError: () => setNotice({ tone: 'error', text: 'No se pudo actualizar la tasa. Verifica el valor.' }),
    });
  };

  const saveReceiver = (event: FormEvent) => {
    event.preventDefault();
    updateReceiver.mutate({ data: { bank, phone: receiverPhone, identityNumber: receiverIdentity } }, {
      onSuccess: (updated) => {
        client.setQueryData(getGetPaymentReceiverQueryKey(), updated);
        setNotice({ tone: 'success', text: 'Datos receptores actualizados.' });
      },
      onError: () => setNotice({ tone: 'error', text: 'No se pudieron guardar los datos de pago.' }),
    });
  };

  const addLocation = (event: FormEvent) => {
    event.preventDefault();
    createLocation.mutate({ data: { state, city, isEnabled: true } }, {
      onSuccess: () => {
        setCity('');
        client.invalidateQueries({ queryKey: getListDeliveryLocationsQueryKey() });
        setNotice({ tone: 'success', text: 'Ciudad habilitada para entregas.' });
      },
      onError: () => setNotice({ tone: 'error', text: 'No se pudo habilitar esa ciudad.' }),
    });
  };

  const changeRole = (target: AdminUser, role: AdminUser['role']) => {
    if (target.isMaster) return;
    updateRole.mutate({ userId: target.id, data: { role, merchantId: null } }, {
      onSuccess: () => {
        client.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        setNotice({ tone: 'success', text: `Rol actualizado para ${target.name}.` });
      },
      onError: () => setNotice({ tone: 'error', text: 'No se pudo actualizar el rol.' }),
    });
  };

  return <div className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6 lg:py-14">
    <div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Cuenta y operación</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em]">Ajustes</h1><p className="mt-2 text-sm text-muted-foreground">La información que mantiene el marketplace en hora.</p></div>
    {notice && <div className="mt-5"><NoticeBar notice={notice} /></div>}
    <div className="mt-9 grid gap-7 lg:grid-cols-[1fr_330px]">
      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-8"><div className="flex items-start gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-accent"><UserCircle className="h-5 w-5" /></span><div><h2 className="font-display text-2xl font-bold">Tu cuenta</h2><p className="mt-1 text-sm text-muted-foreground">Identidad y permisos dentro de Ruta 44.</p></div></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-border bg-background p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Nombre</p><p className="mt-2 font-medium" data-testid="text-settings-name">{user?.name ?? 'No disponible'}</p></div><div className="rounded-xl border border-border bg-background p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Correo</p><p className="mt-2 truncate font-medium" data-testid="text-settings-email">{user?.email ?? 'No disponible'}</p></div><div className="rounded-xl border border-border bg-background p-4 sm:col-span-2"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Rol</p><p className="mt-2 flex items-center gap-2 font-medium capitalize"><ShieldCheck className="h-4 w-4 text-accent" />{user?.isMaster ? 'Admin Master' : user?.role ?? 'Cliente'}</p></div></div></section>
      <section className="h-fit rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-7"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Tasa del día</p><h2 className="mt-2 font-display text-3xl font-bold">{isLoading ? '—' : rate ? `${rate.value.toFixed(2)} Bs.` : 'Sin tasa'}</h2></div><CircleDollarSign className="h-8 w-8 text-secondary" /></div>{isError ? <div className="mt-5"><p className="text-sm text-muted-foreground">No pudimos cargar la tasa.</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetch()} data-testid="button-retry-rate"><RefreshCw className="h-3.5 w-3.5" />Reintentar</Button></div> : <><p className="mt-2 text-xs text-muted-foreground">Última actualización: {rate ? dateLabel(rate.effectiveDate) : 'pendiente'}</p><form onSubmit={saveRate} className="mt-6 space-y-3" data-testid="form-exchange-rate"><label className="grid gap-1.5 text-sm font-medium">Nueva tasa USD / Bs.<input required min="0.01" step="0.01" type="number" value={value} onChange={(event) => setValue(event.target.value)} placeholder={rate?.value.toFixed(2) ?? '36.50'} className="h-11 rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent" data-testid="input-exchange-rate" /></label><Button type="submit" className="w-full" disabled={createRate.isPending} data-testid="button-save-rate">{createRate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Actualizar tasa</Button></form></>}</section>
    </div>
    <section className="mt-7 rounded-2xl border border-[#d7dcbf] bg-[#f0f3df] p-6 sm:p-7"><div className="flex gap-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><LockKeyhole className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-bold">Una nota sobre la conversión</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-primary/70">Los precios se publican en USD para facilitar la comparación. El equivalente en bolívares se calcula con la tasa vigente al momento de crear el pedido.</p></div></div></section>
    {user?.isMaster && <div className="mt-7 space-y-7">
      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-8">
        <div className="flex items-start gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8f4ef] text-[#256b55]"><CreditCard className="h-5 w-5" /></span><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Admin Master</p><h2 className="font-display text-2xl font-bold">Datos receptores de pago</h2><p className="mt-1 text-sm text-muted-foreground">Estos datos se muestran al cliente después de crear su pedido.</p></div></div>
        <form onSubmit={saveReceiver} className="mt-6 grid gap-4 sm:grid-cols-3" data-testid="form-payment-receiver"><label className="grid gap-1.5 text-sm font-medium">Banco<input required value={bank} onChange={(event) => setBank(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" data-testid="input-receiver-bank" /></label><label className="grid gap-1.5 text-sm font-medium">Teléfono<input required value={receiverPhone} onChange={(event) => setReceiverPhone(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" data-testid="input-receiver-phone" /></label><label className="grid gap-1.5 text-sm font-medium">Cédula<input required value={receiverIdentity} onChange={(event) => setReceiverIdentity(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" data-testid="input-receiver-identity" /></label><Button type="submit" className="sm:col-span-3 sm:w-fit" disabled={updateReceiver.isPending}>{updateReceiver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Guardar datos de pago</Button></form>
      </section>
      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-8">
        <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Cobertura</p><h2 className="font-display text-2xl font-bold">Ciudades de entrega</h2><p className="mt-1 text-sm text-muted-foreground">Barinas queda habilitada por defecto. Solo el Admin Master puede ampliar la cobertura.</p></div>
        <div className="mt-5 flex flex-wrap gap-2">{locations.map((location) => <span key={location.id} className="rounded-full border border-[#b8dccd] bg-[#e8f4ef] px-3 py-1.5 text-xs font-medium text-[#256b55]">{location.city}, {location.state}</span>)}</div>
        <form onSubmit={addLocation} className="mt-6 grid gap-4 sm:grid-cols-[.8fr_1fr_auto]" data-testid="form-delivery-location"><label className="grid gap-1.5 text-sm font-medium">Estado<input required value={state} onChange={(event) => setState(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" data-testid="input-location-state" /></label><label className="grid gap-1.5 text-sm font-medium">Ciudad<input required value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" placeholder="Ej. Barquisimeto" data-testid="input-location-city" /></label><Button type="submit" className="self-end" disabled={createLocation.isPending}>{createLocation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Habilitar</Button></form>
      </section>
      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-8">
        <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Accesos</p><h2 className="font-display text-2xl font-bold">Usuarios y roles</h2><p className="mt-1 text-sm text-muted-foreground">Los registros públicos nacen como clientes. Aquí puedes asignar comerciante o administración.</p></div>
        <div className="mt-6 divide-y divide-border">{usersQuery.isLoading ? <p className="py-5 text-sm text-muted-foreground">Cargando usuarios…</p> : usersQuery.data?.map((target) => <div key={target.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-admin-user-${target.id}`}><div><p className="font-medium">{target.name}</p><p className="text-xs text-muted-foreground">{target.email}</p></div><div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{target.isMaster ? 'Admin Master' : 'Rol'}</span>{target.isMaster ? <ShieldCheck className="h-4 w-4 text-accent" /> : <select value={target.role} onChange={(event) => changeRole(target, event.target.value as AdminUser['role'])} className="h-9 rounded-md border border-input bg-background px-2 text-sm" data-testid={`select-user-role-${target.id}`}><option value="customer">Cliente</option><option value="merchant">Comerciante</option><option value="admin">Admin</option></select>}</div></div>)}</div>
      </section>
    </div>}
  </div>;
}

function PageLoader() {
  return <div className="mx-auto flex min-h-[50vh] max-w-[1000px] flex-col justify-center px-4 py-16 sm:px-6" data-testid="state-loading"><div className="h-7 w-44 animate-pulse rounded bg-muted" /><div className="mt-4 h-4 w-72 animate-pulse rounded bg-muted" /><div className="mt-8 h-44 animate-pulse rounded-2xl bg-muted" /></div>;
}

function AuthUnavailable({ kind }: { kind: 'sign-in' | 'sign-up' }) {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-primary px-4"><div className="w-full max-w-md rounded-3xl border border-primary-foreground/10 bg-card p-8 text-center shadow-workshop"><Logo compact={false} /><h1 className="mt-10 font-display text-3xl font-bold">{kind === 'sign-in' ? 'Entra a tu cuenta' : 'Crea tu cuenta'}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">La autenticación está preparándose para este entorno. Vuelve al catálogo para continuar explorando.</p><Link href="/" className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" data-testid={`link-auth-fallback-${kind}`}>Volver al catálogo <ArrowRight className="h-4 w-4" /></Link></div></div>;
}

function SignInPage() {
  if (!clerkPubKey) return <AuthUnavailable kind="sign-in" />;
  return <div className="flex min-h-[100dvh] items-center justify-center bg-primary px-4 py-10"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  if (!clerkPubKey) return <AuthUnavailable kind="sign-up" />;
  return <div className="flex min-h-[100dvh] items-center justify-center bg-primary px-4 py-10"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previous.current !== undefined && previous.current !== userId) client.clear();
      previous.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function RoutedApp() {
  return <Switch><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route path="/" component={HomeRoute} /><Route path="/product/:id" component={ProductRoute} /><Route path="/cart" component={CartRoute} /><Route path="/checkout" component={CheckoutRoute} /><Route path="/orders" component={OrdersRoute} /><Route path="/orders/:id" component={OrderDetailRoute} /><Route path="/dashboard" component={DashboardRoute} /><Route path="/inventory" component={InventoryRoute} /><Route path="/payments" component={PaymentsRoute} /><Route path="/settings" component={SettingsRoute} /><Route component={NotFound} /></Switch>;
}

function HomeRoute() { return <AppFrame><HomePage /></AppFrame>; }
function ProductRoute() { return <AppFrame><ProductPage /></AppFrame>; }
function CartRoute() { return <AppFrame><CartPage /></AppFrame>; }
function CheckoutRoute() { return <AppFrame><CheckoutPage /></AppFrame>; }
function OrdersRoute() { return <AppFrame><OrdersPage /></AppFrame>; }
function OrderDetailRoute() { return <AppFrame><OrderDetailPage /></AppFrame>; }
function DashboardRoute() { return <AppFrame><DashboardPage /></AppFrame>; }
function InventoryRoute() { return <AppFrame><InventoryPage /></AppFrame>; }
function PaymentsRoute() { return <AppFrame><PaymentsPage /></AppFrame>; }
function SettingsRoute() { return <AppFrame><SettingsPage /></AppFrame>; }

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  if (!clerkPubKey) return <RoutedApp />;
  const appearance = {
    theme: shadcn,
    cssLayerName: 'clerk',
    options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
    variables: { colorPrimary: '#256b55', colorForeground: '#17333a', colorMutedForeground: '#65736e', colorDanger: '#a94535', colorBackground: '#fbfaf4', colorInput: '#f4f3eb', colorInputForeground: '#17333a', colorNeutral: '#d9ded2', fontFamily: 'DM Sans', borderRadius: '0.75rem' },
    elements: { rootBox: 'w-full flex justify-center', cardBox: 'bg-[#fbfaf4] rounded-2xl w-[440px] max-w-full overflow-hidden', card: '!shadow-none !border-0 !bg-transparent !rounded-none', footer: '!shadow-none !border-0 !bg-transparent !rounded-none', headerTitle: 'text-[#17333a] font-display', headerSubtitle: 'text-[#65736e]', socialButtonsBlockButtonText: 'text-[#17333a]', formFieldLabel: 'text-[#17333a]', footerActionLink: 'text-[#256b55]', footerActionText: 'text-[#65736e]', dividerText: 'text-[#65736e]', identityPreviewEditButton: 'text-[#256b55]', formFieldSuccessText: 'text-[#256b55]', alertText: 'text-[#a94535]', logoBox: 'p-4', logoImage: 'max-h-10', socialButtonsBlockButton: 'border-[#d9ded2] bg-[#f4f3eb]', formButtonPrimary: 'bg-[#17333a] hover:bg-[#256b55]', formFieldInput: 'border-[#d9ded2] bg-[#f4f3eb] text-[#17333a]', footerAction: 'border-t border-[#d9ded2]', dividerLine: 'bg-[#d9ded2]', alert: 'bg-[#fae9e5] border-[#e8bdb3]', otpCodeFieldInput: 'border-[#d9ded2] bg-[#f4f3eb]', formFieldRow: 'gap-2', main: 'gap-5' },
  };
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Bienvenido de nuevo', subtitle: 'Entra para continuar tu compra' } }, signUp: { start: { title: 'Crea tu cuenta', subtitle: 'Compra con más control y seguimiento' } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}><ClerkQueryClientCacheInvalidator /><RoutedApp /></ClerkProvider>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><CartProvider><WouterRouter base={basePath}><ErrorBoundary><ClerkProviderWithRoutes /></ErrorBoundary></WouterRouter></CartProvider></TooltipProvider><Toaster /></QueryClientProvider>;
}

export default App;