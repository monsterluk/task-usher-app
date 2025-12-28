import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Clock,
  AlertTriangle,
  Settings,
  BarChart3,
  Calendar,
  Loader2
} from 'lucide-react';

// Admin Dashboard Component
const AdminHome = () => {
  const { orders, workers, timeEntries } = useApp();
  const navigate = useNavigate();

  // Calculate financial metrics
  const activeOrders = orders.filter(o => !o.archived && o.status !== 'GOTOWE');
  const completedOrders = orders.filter(o => o.status === 'GOTOWE');

  // Revenue calculations
  const totalRevenue = orders
    .filter(o => o.status === 'GOTOWE')
    .reduce((sum, o) => sum + (o.price_total || 0), 0);

  const pendingRevenue = activeOrders.reduce((sum, o) => sum + (o.price_total || 0), 0);

  // Labor costs (simplified calculation based on time entries)
  const totalLaborHours = timeEntries.reduce((sum, te) => sum + te.totalSeconds / 3600, 0);
  const avgHourlyRate = workers.length > 0
    ? workers.reduce((sum, w) => sum + w.hourly_rate, 0) / workers.length
    : 50;
  const estimatedLaborCost = totalLaborHours * avgHourlyRate;

  // Profit margin (simplified)
  const grossProfit = totalRevenue - estimatedLaborCost;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const ordersThisMonth = orders.filter(o => {
    const created = new Date(o.created_at || 0);
    return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
  });
  const revenueThisMonth = ordersThisMonth
    .filter(o => o.status === 'GOTOWE')
    .reduce((sum, o) => sum + (o.price_total || 0), 0);

  // Overdue orders
  const overdueOrders = activeOrders.filter(o => new Date(o.planned_completion_date) < new Date());

  // Worker stats
  const activeWorkers = workers.filter(w => w.active);
  const workersByPosition = activeWorkers.reduce((acc, w) => {
    acc[w.position] = (acc[w.position] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    trend?: { value: number; positive: boolean };
  }

  const KPICard = ({ title, value, subtitle, icon: Icon, color, trend }: KPICardProps) => (
    <div className="card-industrial">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{trend.positive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10`} style={{ backgroundColor: `${color.replace('text-', '')}20` }}>
          <Icon size={24} className={color} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Panel Administratora</h1>
          <p className="text-sm text-muted-foreground">Przegląd finansowy i operacyjny firmy</p>
        </div>
        <button onClick={() => navigate('/admin/settings')} className="btn-secondary">
          <Settings size={18} className="mr-2" />
          Ustawienia
        </button>
      </div>

      {/* Financial KPIs */}
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <DollarSign size={20} />
        Finanse
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Przychód (zrealizowane)"
          value={`${totalRevenue.toLocaleString('pl-PL')} zł`}
          icon={DollarSign}
          color="text-green-600"
          subtitle={`${completedOrders.length} zleceń`}
        />
        <KPICard
          title="Przychód oczekiwany"
          value={`${pendingRevenue.toLocaleString('pl-PL')} zł`}
          icon={Clock}
          color="text-blue-600"
          subtitle={`${activeOrders.length} aktywnych zleceń`}
        />
        <KPICard
          title="Koszty pracy (szac.)"
          value={`${estimatedLaborCost.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł`}
          icon={Users}
          color="text-orange-600"
          subtitle={`${totalLaborHours.toFixed(1)} godz. pracy`}
        />
        <KPICard
          title="Marża brutto"
          value={`${profitMargin.toFixed(1)}%`}
          icon={TrendingUp}
          color={profitMargin > 30 ? "text-green-600" : "text-yellow-600"}
          subtitle={`${grossProfit.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł zysku`}
        />
      </div>

      {/* Operations KPIs */}
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <BarChart3 size={20} />
        Operacje
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Zlecenia w tym miesiącu"
          value={ordersThisMonth.length}
          icon={Package}
          color="text-primary"
          subtitle={`${revenueThisMonth.toLocaleString('pl-PL')} zł`}
        />
        <KPICard
          title="Aktywni pracownicy"
          value={activeWorkers.length}
          icon={Users}
          color="text-blue-600"
          subtitle={`z ${workers.length} w systemie`}
        />
        <KPICard
          title="Przeterminowane"
          value={overdueOrders.length}
          icon={AlertTriangle}
          color={overdueOrders.length > 0 ? "text-red-600" : "text-green-600"}
          subtitle={overdueOrders.length > 0 ? 'Wymaga uwagi!' : 'Wszystko na czas'}
        />
        <KPICard
          title="Średni czas realizacji"
          value="N/A"
          icon={Clock}
          color="text-muted-foreground"
          subtitle="Brak danych"
        />
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workers by Position */}
        <div className="card-industrial">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={20} />
            Zespół wg stanowisk
          </h3>
          <div className="space-y-3">
            {Object.entries(workersByPosition).map(([position, count]) => (
              <div key={position} className="flex items-center justify-between">
                <span className="text-sm">{position}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-primary rounded-full" style={{ width: `${(count / activeWorkers.length) * 100}px` }} />
                  <span className="font-bold">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(workersByPosition).length === 0 && (
              <p className="text-muted-foreground text-center py-4">Brak danych</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card-industrial">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Ostatnia aktywność
          </h3>
          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-mono font-semibold">{order.order_number}</span>
                  <p className="text-xs text-muted-foreground">{order.client_name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  order.status === 'GOTOWE' ? 'bg-green-100 text-green-800' :
                  order.status === 'W_TRAKCIE' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Page
const AdminSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        ← Wróć do panelu
      </button>

      <h1 className="text-2xl md:text-3xl font-bold mb-6">Ustawienia systemu</h1>

      <div className="space-y-6">
        <div className="card-industrial">
          <h2 className="font-bold mb-4">Dane firmy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nazwa firmy</label>
              <input type="text" defaultValue="PLEXI SYSTEM" className="input-industrial w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">NIP</label>
              <input type="text" placeholder="000-000-00-00" className="input-industrial w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Adres</label>
              <input type="text" placeholder="ul. Przykładowa 1" className="input-industrial w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Miasto</label>
              <input type="text" placeholder="Kraków" className="input-industrial w-full" />
            </div>
          </div>
        </div>

        <div className="card-industrial">
          <h2 className="font-bold mb-4">Integracje</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Apaczka API</p>
                <p className="text-sm text-muted-foreground">Integracja z kurierami</p>
              </div>
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Tryb demo</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Google Drive</p>
                <p className="text-sm text-muted-foreground">Dokumentacja produkcyjna</p>
              </div>
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">Nie połączono</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">wFirma</p>
                <p className="text-sm text-muted-foreground">Księgowość i faktury</p>
              </div>
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">Nie połączono</span>
            </div>
          </div>
        </div>

        <div className="card-industrial">
          <h2 className="font-bold mb-4">Powiadomienia</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-primary" />
              <span>Email przy nowym zleceniu</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-primary" />
              <span>Alerty o przeterminowanych zleceniach</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded accent-primary" />
              <span>Dzienny raport email</span>
            </label>
          </div>
        </div>

        <button className="btn-primary w-full">
          Zapisz ustawienia
        </button>
      </div>
    </div>
  );
};

// Main Admin Dashboard
const AdminDashboard = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <main className="container mx-auto">
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
