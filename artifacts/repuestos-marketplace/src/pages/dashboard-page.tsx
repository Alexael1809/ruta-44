/**
 * Dashboard page displaying operational metrics, multi-currency executive analytics,
 * top/bottom performing inventory, and customer part requests inbox.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGetCurrentUserQueryKey,
  getGetDashboardSummaryQueryKey,
  useGetCurrentUser,
  useGetDashboardSummary,
} from '@workspace/api-client-react';
import {
  Banknote,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  LayoutDashboard,
  MessageSquare,
  PackageX,
  Phone,
  RefreshCw,
  Search,
  Send,
  Star,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/error-state';
import { PageLoader } from '@/components/shared/page-loader';
import { OrderRow } from '@/components/shared/order-row';
import { usd, bs } from '@/lib/formatters';

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
  href?: string;
  subValue?: string;
}

function MetricCard({ label, value, hint, icon: Icon, accent, href, subValue }: MetricCardProps) {
  const content = (
    <div
      className={`rounded-2xl border border-card-border bg-card p-5 shadow-xs transition ${
        href ? 'hover:-translate-y-0.5 hover:shadow-sm' : ''
      }`}
      data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${
            accent === 'amber'
              ? 'bg-[#fcecc4] text-[#835b0b]'
              : accent === 'coral'
                ? 'bg-[#f7dfd8] text-[#a94535]'
                : accent === 'teal'
                  ? 'bg-[#d9eee5] text-[#256b55]'
                  : accent === 'indigo'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-muted text-primary'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        {href && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">{label}</p>
      <p
        className="mt-1 font-display text-3xl font-bold tracking-[-.04em]"
        data-testid={`value-${label.toLowerCase().replaceAll(' ', '-')}`}
      >
        {value}
      </p>
      {subValue && (
        <p className="font-mono text-xs font-semibold text-accent mt-0.5">{subValue}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );

  return href ? (
    <Link href={href} data-testid={`link-metric-${accent}`}>
      {content}
    </Link>
  ) : (
    content
  );
}

interface AnalyticsData {
  revenue: {
    today: { usd: number; bs: number };
    week: { usd: number; bs: number };
    fortnight: { usd: number; bs: number };
    month: { usd: number; bs: number };
  };
  totalCustomers: number;
  totalMerchants: number;
  totalOrders: number;
  deliveryPercentage: number;
  pickupPercentage: number;
  topSoldProducts: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    priceUsd: number;
    stock: number;
    imageUrl: string | null;
    totalSold: number;
    totalRevenueUsd: number;
  }>;
  leastSoldProducts: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    priceUsd: number;
    stock: number;
    imageUrl: string | null;
    totalSold: number;
    totalRevenueUsd: number;
  }>;
}

interface PartRequest {
  id: string;
  customerName: string;
  contactPhone: string;
  partDescription: string;
  motorcycleModel: string;
  status: 'pending' | 'contacted' | 'resolved';
  createdAt: string;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'analytics' | 'requests' | 'orders'>('analytics');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'contacted' | 'resolved'>('all');

  const { data: user } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false },
  });
  const isAdmin = user?.role === 'admin' || Boolean(user?.isMaster);

  const summaryQuery = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const { data: reputation } = useQuery<{ avgScore: number; totalCount: number }>({
    queryKey: ['/api/merchant/reputation'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/reputation');
      if (!res.ok) return { avgScore: 5.0, totalCount: 0 };
      return res.json();
    },
    enabled: !isAdmin && Boolean(user?.merchantId),
  });

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics');
      if (!res.ok) throw new Error('No se pudieron cargar las analíticas.');
      return res.json();
    },
  });

  const { data: partRequests = [], isLoading: requestsLoading, refetch: refetchRequests } = useQuery<PartRequest[]>({
    queryKey: ['/api/part-requests'],
    queryFn: async () => {
      const res = await fetch('/api/part-requests');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'contacted' | 'resolved' }) => {
      const res = await fetch(`/api/part-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Error al actualizar estado.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/part-requests'] });
    },
  });

  if (summaryQuery.isLoading) return <PageLoader />;
  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <div className="mx-auto max-w-[1250px] px-4 py-16 sm:px-6 lg:px-10">
        <ErrorState retry={() => summaryQuery.refetch()} />
      </div>
    );
  }

  const summary = summaryQuery.data;

  // Filter requests
  const filteredRequests = partRequests.filter((r) => {
    if (requestStatusFilter === 'all') return true;
    return r.status === requestStatusFilter;
  });

  const pendingRequestsCount = partRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      {/* Header and Title */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">
            {isAdmin ? 'Centro Ejecutivo & Operaciones' : 'Panel de la Tienda'}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em] sm:text-5xl">
            {isAdmin ? 'Panel Ejecutivo RUTA 44' : `Buenos días${user?.name ? `, ${user.name}` : ''}`}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAdmin
              ? 'Métricas multimoneda, control operativo, analíticas de inventario y solicitudes de clientes.'
              : 'Resumen financiero, reputación, rendimiento de piezas y solicitudes en tiempo real.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-xs hover:border-primary transition"
            data-testid="link-dashboard-inventory"
          >
            <Boxes className="h-4 w-4 text-accent" />
            <span>Gestionar Inventario</span>
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-xs hover:border-primary transition"
            data-testid="link-dashboard-payments"
          >
            <WalletCards className="h-4 w-4 text-accent" />
            <span>Ver Pagos ({summary.pendingPayments})</span>
          </Link>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'analytics'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-analytics"
        >
          <TrendingUp className="h-4 w-4" />
          <span>Ingresos & Analíticas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'requests'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-requests"
        >
          <Wrench className="h-4 w-4" />
          <span>Solicitudes de Repuestos</span>
          {pendingRequestsCount > 0 && (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'orders'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          data-testid="tab-orders"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Movimiento & Pedidos Recientes</span>
        </button>
      </div>

      {/* TAB 1: REVENUE & EXECUTIVE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="mt-7 space-y-9">
          {/* Revenue Cards: Multicurrency USD & Bs */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Ingresos Consolidados</p>
                <h2 className="mt-1 font-display text-2xl font-bold">Ventas Multimoneda (USD & Bs.)</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAnalytics()}
                className="h-8 gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizar
              </Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Hoy (Día)"
                value={usd(analytics?.revenue.today.usd ?? summary.todaySalesUsd)}
                subValue={bs(analytics?.revenue.today.bs ?? 0)}
                hint="facturado hoy con pago verificado"
                icon={Banknote}
                accent="amber"
              />
              <MetricCard
                label="Últimos 7 Días (Semana)"
                value={usd(analytics?.revenue.week.usd ?? 0)}
                subValue={bs(analytics?.revenue.week.bs ?? 0)}
                hint="rendimiento semanal acumulado"
                icon={TrendingUp}
                accent="teal"
              />
              <MetricCard
                label="Quincena (Últimos 15 días)"
                value={usd(analytics?.revenue.fortnight.usd ?? 0)}
                subValue={bs(analytics?.revenue.fortnight.bs ?? 0)}
                hint="cierre y balance quincenal"
                icon={WalletCards}
                accent="indigo"
              />
              <MetricCard
                label="Mes (Últimos 30 días)"
                value={usd(analytics?.revenue.month.usd ?? 0)}
                subValue={bs(analytics?.revenue.month.bs ?? 0)}
                hint="volumen mensual total de ventas"
                icon={Store}
                accent="coral"
              />
            </div>
          </section>

          {/* Operational KPIs */}
          <section>
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Métricas de Rendimiento</p>
            <h2 className="mt-1 font-display text-2xl font-bold">KPIs Operativos & Logística</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <Users className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Clientes Registrados</p>
                <p className="mt-1 font-display text-3xl font-bold">{analytics?.totalCustomers ?? '—'}</p>
                <p className="mt-1 text-xs text-muted-foreground">usuarios compradores activos</p>
              </div>

              <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <Store className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Comercios Aliados</p>
                <p className="mt-1 font-display text-3xl font-bold">{analytics?.totalMerchants ?? summary.activeMerchants ?? 1}</p>
                <p className="mt-1 text-xs text-muted-foreground">tiendas y talleres en plataforma</p>
              </div>

              <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Truck className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-600">
                    {analytics?.deliveryPercentage ?? 0}%
                  </span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Envíos con Delivery</p>
                <p className="mt-1 font-display text-3xl font-bold">
                  {analytics?.deliveryPercentage ?? 0}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">preferencia de entrega a domicilio</p>
              </div>

              <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    <Store className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs font-bold text-purple-600">
                    {analytics?.pickupPercentage ?? 0}%
                  </span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Retiro en Tienda (Pick-up)</p>
                <p className="mt-1 font-display text-3xl font-bold">
                  {analytics?.pickupPercentage ?? 0}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">recogidas directas en local</p>
              </div>
            </div>
          </section>

          {/* Performance: Top 10 Most Sold and Top 10 Least Sold */}
          <div className="grid gap-7 lg:grid-cols-2">
            {/* Top 10 Most Sold */}
            <section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Flame className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">Top 10 Más Vendidos</h3>
                    <p className="text-xs text-muted-foreground">Repuestos de mayor demanda y rotación</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Alta rotación
                </span>
              </div>

              <div className="mt-4 divide-y divide-border overflow-hidden">
                {analytics?.topSoldProducts?.length ? (
                  analytics.topSoldProducts.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between py-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-muted font-mono font-bold text-[11px]">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">SKU: {p.sku} · {p.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{p.totalSold} unid. vendidas</p>
                        <p className="font-mono text-[11px] text-emerald-600">{usd(p.totalRevenueUsd)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    Aún no hay suficientes ventas registradas para generar el ranking.
                  </p>
                )}
              </div>
            </section>

            {/* Top 10 Least Sold */}
            <section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <TrendingDown className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">Top 10 Menos Vendidos</h3>
                    <p className="text-xs text-muted-foreground">Piezas de baja o nula rotación en anaquel</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  Oportunidad
                </span>
              </div>

              <div className="mt-4 divide-y divide-border overflow-hidden">
                {analytics?.leastSoldProducts?.length ? (
                  analytics.leastSoldProducts.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between py-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-muted font-mono font-bold text-[11px]">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">SKU: {p.sku} · Stock: {p.stock}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-muted-foreground">{p.totalSold} unid. vendidas</p>
                        <p className="font-mono text-[11px] text-accent">{usd(p.priceUsd)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No se han registrado repuestos con bajo movimiento.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: PART REQUESTS INBOX (Bandeja de Solicitudes) */}
      {activeTab === 'requests' && (
        <div className="mt-7 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Bandeja de Entrada</p>
              <h2 className="mt-1 font-display text-2xl font-bold">Solicitudes de Repuestos de Clientes</h2>
              <p className="text-xs text-muted-foreground">
                Clientes que no consiguieron su repuesto en el catálogo y solicitan cotización por WhatsApp.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Filtrar:</span>
              <button
                type="button"
                onClick={() => setRequestStatusFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  requestStatusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                Todas ({partRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestStatusFilter('pending')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  requestStatusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                Pendientes ({partRequests.filter((r) => r.status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => setRequestStatusFilter('contacted')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  requestStatusFilter === 'contacted' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                Contactados ({partRequests.filter((r) => r.status === 'contacted').length})
              </button>
              <button
                type="button"
                onClick={() => setRequestStatusFilter('resolved')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  requestStatusFilter === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                Resueltos ({partRequests.filter((r) => r.status === 'resolved').length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Moto</th>
                  <th className="px-5 py-3.5">Repuesto Solicitado</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acción Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.length ? (
                  filteredRequests.map((req) => {
                    const cleanPhone = req.contactPhone.replace(/\D/g, '');
                    const waText = encodeURIComponent(
                      `Hola ${req.customerName}, te escribimos de Ruta 44 respecto a tu solicitud del repuesto "${req.partDescription}" para tu moto ${req.motorcycleModel}. ¿Aún lo requieres? Te compartimos precio y disponibilidad.`
                    );
                    const waLink = `https://wa.me/${cleanPhone.startsWith('58') ? cleanPhone : `58${cleanPhone.replace(/^0/, '')}`}?text=${waText}`;

                    return (
                      <tr key={req.id} className="hover:bg-muted/30 transition">
                        <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(req.createdAt).toLocaleDateString('es-VE', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground">{req.customerName}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{req.contactPhone}</p>
                        </td>
                        <td className="px-5 py-4 font-medium text-foreground">
                          {req.motorcycleModel}
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          <p className="font-semibold text-foreground line-clamp-2">{req.partDescription}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              req.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : req.status === 'contacted'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {req.status === 'pending'
                              ? 'Pendiente'
                              : req.status === 'contacted'
                                ? 'Contactado'
                                : 'Resuelto'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1ebe5d] transition shadow-xs"
                              title="Contactar al cliente por WhatsApp"
                              data-testid={`link-wa-request-${req.id}`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <span>WhatsApp</span>
                            </a>

                            {req.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => updateRequestStatus.mutate({ id: req.id, status: 'contacted' })}
                                disabled={updateRequestStatus.isPending}
                                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:border-primary transition"
                              >
                                Marcar contactado
                              </button>
                            )}

                            {req.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => updateRequestStatus.mutate({ id: req.id, status: 'resolved' })}
                                disabled={updateRequestStatus.isPending}
                                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition"
                              >
                                Resolver
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                      No hay solicitudes registradas con este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS & RECENT MOVEMENT */}
      {activeTab === 'orders' && (
        <div className="mt-7 grid gap-7 xl:grid-cols-[1.25fr_.75fr]">
          <section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">
                  Movimiento reciente
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold">Últimos pedidos</h2>
              </div>
              <Link
                href="/orders"
                className="text-xs font-semibold text-accent hover:underline"
                data-testid="link-dashboard-orders"
              >
                Ver todos
              </Link>
            </div>
            <div className="mt-6 divide-y divide-border">
              {summary.recentOrders.length ? (
                summary.recentOrders.slice(0, 8).map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Aún no hay movimiento para mostrar.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">
                  Demanda
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold">Categorías fuertes</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div className="mt-7 space-y-5">
              {summary.topCategories.length ? (
                summary.topCategories.map((item, index) => {
                  const max = Math.max(
                    ...summary.topCategories.map((category) => category.count),
                    1,
                  );
                  return (
                    <div key={item.category} data-testid={`row-category-${item.category}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.count} ventas
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            index === 0
                              ? 'bg-secondary'
                              : index === 1
                                ? 'bg-accent'
                                : 'bg-primary'
                          }`}
                          style={{ width: `${(item.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sin categorías todavía.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
