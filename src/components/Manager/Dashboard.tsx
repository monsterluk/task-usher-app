import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  PieChart,
  GanttChartSquare,
  Wrench,
  FileText,
  ShieldCheck,
  Gauge,
  Settings,
  Factory,
  Calculator,
  CalendarDays,
  Download,
  History,
  Plus,
  PauseCircle,
  Activity
} from 'lucide-react';
import AnnouncementBoard from '@/components/AnnouncementBoard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const Dashboard = () => {
  const { orders, workers, timeEntries, loading } = useApp();
  const navigate = useNavigate();

  // KPI Calculations
  const activeOrders = orders.filter(o => !o.archived && o.status !== 'GOTOWE');
  const overdueOrders = activeOrders.filter(o => new Date(o.planned_completion_date) < new Date());
  const totalValue = activeOrders.reduce((sum, o) => sum + (parseFloat(String(o.price_total)) || 0), 0);
  const ordersInProgress = orders.filter(o => o.status === 'W_TRAKCIE').length;
  const ordersNew = orders.filter(o => o.status === 'NOWE').length;
  const ordersCompleted = orders.filter(o => o.status === 'GOTOWE' && !o.archived).length;
  const activeWorkers = workers.filter(w => w.active).length;

  // Recent orders
  const recentOrders = [...orders]
    .filter(o => !o.archived)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  // Chart data - Orders by month (last 6 months)
  const getMonthlyData = () => {
    const months: { [key: string]: { orders: number; revenue: number } } = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
      months[key] = { orders: 0, revenue: 0 };
    }

    orders.forEach(order => {
      const created = new Date(order.created_at || 0);
      const monthDiff = (now.getFullYear() - created.getFullYear()) * 12 + now.getMonth() - created.getMonth();
      if (monthDiff >= 0 && monthDiff < 6) {
        const key = created.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
        if (months[key]) {
          months[key].orders++;
          months[key].revenue += parseFloat(String(order.price_total)) || 0;
        }
      }
    });

    return Object.entries(months).map(([name, data]) => ({
      name,
      zlecenia: data.orders,
      przychod: Math.round(data.revenue / 1000) // w tysiącach
    }));
  };

  // Pie chart data - Orders by status
  const statusData = [
    { name: 'Nowe', value: ordersNew, color: '#9ca3af' },
    { name: 'W trakcie', value: ordersInProgress, color: '#3b82f6' },
    { name: 'Gotowe', value: ordersCompleted, color: '#22c55e' },
  ].filter(d => d.value > 0);

  // Bar chart data - Orders by stage
  const getStageData = () => {
    const stages: { [key: string]: number } = {};
    orders.forEach(order => {
      if (order.currentStage && !order.archived) {
        stages[order.currentStage] = (stages[order.currentStage] || 0) + 1;
      }
    });
    return Object.entries(stages)
      .map(([stage, count]) => ({ stage: stage.substring(0, 12), ilosc: count }))
      .sort((a, b) => b.ilosc - a.ilosc)
      .slice(0, 6);
  };

  const monthlyData = getMonthlyData();
  const stageData = getStageData();

  // Orders due soon (next 3 days)
  const today = new Date();
  const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const ordersDueSoon = activeOrders
    .filter(o => {
      const deadline = new Date(o.planned_completion_date);
      return deadline >= today && deadline <= threeDaysFromNow;
    })
    .sort((a, b) => new Date(a.planned_completion_date).getTime() - new Date(b.planned_completion_date).getTime());

  interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    gradient: string;
    subtitle?: string;
    trend?: { value: number; label: string };
    status?: 'healthy' | 'warning' | 'critical';
    onClick?: () => void;
  }

  const KPICard = ({ title, value, icon: Icon, gradient, subtitle, trend, status, onClick }: KPICardProps) => {
    const statusBorder = status === 'healthy' ? 'border-l-4 border-l-green-500'
      : status === 'warning' ? 'border-l-4 border-l-yellow-500'
      : status === 'critical' ? 'border-l-4 border-l-red-500'
      : '';

    const TrendIcon = trend ? (trend.value > 0 ? ArrowUp : trend.value < 0 ? ArrowDown : Minus) : null;
    const trendColor = trend ? (trend.value > 0 ? 'text-green-500' : trend.value < 0 ? 'text-red-500' : 'text-gray-400') : '';

    return (
      <div
        className={`relative overflow-hidden rounded-2xl p-6 ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-all duration-200' : ''} ${statusBorder}`}
        style={{
          background: gradient,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
        }}
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-white/80">{title}</p>
            <p className="text-4xl font-bold text-white mt-1">{value}</p>
            {subtitle && <p className="text-xs text-white/70 mt-2">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${trendColor} bg-white/20 rounded-full px-2 py-0.5 w-fit`}>
                {TrendIcon && <TrendIcon size={14} />}
                <span className="font-medium text-white">{Math.abs(trend.value)}% {trend.label}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon size={28} className="text-white" />
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10"></div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5"></div>
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOWE': return 'bg-gray-400';
      case 'W_TRAKCIE': return 'bg-blue-500';
      case 'GOTOWE': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
        <span className="ml-2">Ładowanie...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards - Enhanced with gradients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KPICard
          title="Aktywne zlecenia"
          value={activeOrders.length}
          icon={Package}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          subtitle={`${ordersNew} nowych`}
          trend={{ value: 12, label: 'vs wczoraj' }}
          status="healthy"
          onClick={() => navigate('/manager/orders')}
        />
        <KPICard
          title="W trakcie"
          value={ordersInProgress}
          icon={Wrench}
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          subtitle="realizowanych"
          trend={{ value: 5, label: 'vs wczoraj' }}
          status="healthy"
          onClick={() => navigate('/manager/orders?filter=W_TRAKCIE')}
        />
        <KPICard
          title="Ukończone dziś"
          value={ordersCompleted}
          icon={CheckCircle}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          subtitle="zleceń"
          trend={{ value: 0, label: 'bez zmian' }}
          status="healthy"
        />
        <KPICard
          title="Pracownicy online"
          value={activeWorkers}
          icon={Users}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
          subtitle={`z ${workers.length} w systemie`}
          trend={{ value: 8, label: 'vs wczoraj' }}
          status="healthy"
          onClick={() => navigate('/manager/workers')}
        />
        <KPICard
          title="OEE"
          value="87%"
          icon={Activity}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
          subtitle="efektywność"
          trend={{ value: 3, label: 'vs tydzień' }}
          status="healthy"
          onClick={() => navigate('/manager/oee')}
        />
        <KPICard
          title="Przestoje"
          value={overdueOrders.length}
          icon={PauseCircle}
          gradient={overdueOrders.length > 0 ? "linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)" : "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"}
          subtitle="przeterminowane"
          trend={overdueOrders.length > 0 ? { value: -5, label: 'vs wczoraj' } : { value: 0, label: 'super!' }}
          status={overdueOrders.length > 0 ? 'critical' : 'healthy'}
          onClick={overdueOrders.length > 0 ? () => navigate('/manager/orders?filter=PRZETERMINOWANE') : undefined}
        />
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => navigate('/manager/orders/new')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <Plus size={20} />
          Nowe zlecenie
        </button>
        <button
          onClick={() => navigate('/manager/production-report')}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold shadow hover:shadow-md hover:border-blue-300 transition-all duration-200"
        >
          <BarChart3 size={20} />
          Raport produkcji
        </button>
        <button
          onClick={() => navigate('/manager/gantt')}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold shadow hover:shadow-md hover:border-purple-300 transition-all duration-200"
        >
          <GanttChartSquare size={20} />
          Wykres Gantta
        </button>
        <button
          onClick={() => navigate('/manager/calendar')}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold shadow hover:shadow-md hover:border-indigo-300 transition-all duration-200"
        >
          <CalendarDays size={20} />
          Kalendarz
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-3 mb-8">
        <button
          onClick={() => navigate('/manager/gantt')}
          className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <GanttChartSquare className="text-purple-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Gantt</p>
            <p className="text-xs text-muted-foreground">Planowanie</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/quality')}
          className="flex items-center gap-3 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
        >
          <ShieldCheck className="text-teal-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">QC</p>
            <p className="text-xs text-muted-foreground">Jakosc</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/oee')}
          className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
        >
          <Gauge className="text-violet-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">OEE</p>
            <p className="text-xs text-muted-foreground">Efektywnosc</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/machines')}
          className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Wrench className="text-blue-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Maszyny</p>
            <p className="text-xs text-muted-foreground">Park</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/maintenance')}
          className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
        >
          <Settings className="text-rose-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">TPM</p>
            <p className="text-xs text-muted-foreground">Konserwacja</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/capacity')}
          className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <Factory className="text-amber-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Zdolnosc</p>
            <p className="text-xs text-muted-foreground">Capacity</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/reports')}
          className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <FileText className="text-green-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Czas</p>
            <p className="text-xs text-muted-foreground">Praca</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/production-report')}
          className="flex items-center gap-3 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
        >
          <BarChart3 className="text-cyan-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Raport</p>
            <p className="text-xs text-muted-foreground">Produkcja</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/costs')}
          className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
        >
          <Calculator className="text-emerald-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Koszty</p>
            <p className="text-xs text-muted-foreground">Kalkulator</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/calendar')}
          className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
        >
          <CalendarDays className="text-indigo-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Kalendarz</p>
            <p className="text-xs text-muted-foreground">Planowanie</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/export')}
          className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
        >
          <Download className="text-violet-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Eksport</p>
            <p className="text-xs text-muted-foreground">Dane</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/kpi')}
          className="flex items-center gap-3 p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
        >
          <TrendingUp className="text-pink-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">KPI</p>
            <p className="text-xs text-muted-foreground">Wskazniki</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/audit')}
          className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900/30 transition-colors"
        >
          <History className="text-slate-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Audit</p>
            <p className="text-xs text-muted-foreground">Historia</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/manager/orders/new')}
          className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
        >
          <ClipboardList className="text-orange-600" size={24} />
          <div className="text-left">
            <p className="font-semibold text-sm">Nowe</p>
            <p className="text-xs text-muted-foreground">Zlecenie</p>
          </div>
        </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Line Chart - Monthly Trend */}
        <div className="card-industrial lg:col-span-2">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Zlecenia i przychody (6 miesięcy)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'przychod' ? `${value} tys. zł` : value,
                    name === 'przychod' ? 'Przychód' : 'Zlecenia'
                  ]}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="zlecenia"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                  name="Zlecenia"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="przychod"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e' }}
                  name="Przychód (tys. zł)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Status Distribution */}
        <div className="card-industrial">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <PieChart size={20} />
            Status zleceń
          </h2>
          <div className="h-64">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Brak danych
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bar Chart - Orders by Stage */}
      {stageData.length > 0 && (
        <div className="card-industrial mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Zlecenia wg etapu produkcji
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="stage" type="category" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="ilosc" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Ilość zleceń" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status - Progress bars */}
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Zlecenia wg statusu</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-400"></div>
                  Nowe
                </span>
                <span className="font-bold">{ordersNew}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 rounded-full transition-all"
                  style={{ width: `${(ordersNew / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  W trakcie
                </span>
                <span className="font-bold">{ordersInProgress}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(ordersInProgress / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  Gotowe
                </span>
                <span className="font-bold">{ordersCompleted}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(ordersCompleted / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Orders */}
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className={overdueOrders.length > 0 ? "text-red-500" : "text-green-600"} size={20} />
              Przeterminowane zlecenia
            </h2>
          </div>
          {overdueOrders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-green-500 mb-2" size={48} />
              <p className="text-muted-foreground">Brak przeterminowanych zleceń</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueOrders.slice(0, 5).map(order => {
                const days = Math.abs(getDaysUntilDeadline(order.planned_completion_date));
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    onClick={() => navigate(`/manager/orders/${order.id}`)}
                  >
                    <div>
                      <span className="font-mono font-semibold">{order.order_number}</span>
                      <p className="text-sm text-muted-foreground">{order.client_name}</p>
                    </div>
                    <span className="text-sm text-red-600 font-medium">
                      {days} dni temu
                    </span>
                  </div>
                );
              })}
              {overdueOrders.length > 5 && (
                <button
                  onClick={() => navigate('/manager/orders?filter=PRZETERMINOWANE')}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
                >
                  Zobacz wszystkie ({overdueOrders.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Orders Due Soon */}
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock size={20} />
              Zbliżające się terminy
            </h2>
          </div>
          {ordersDueSoon.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Brak zleceń z terminem w ciągu 3 dni</p>
          ) : (
            <div className="space-y-2">
              {ordersDueSoon.slice(0, 5).map(order => {
                const days = getDaysUntilDeadline(order.planned_completion_date);
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                    onClick={() => navigate(`/manager/orders/${order.id}`)}
                  >
                    <div>
                      <span className="font-mono font-semibold">{order.order_number}</span>
                      <p className="text-sm text-muted-foreground">{order.product_name}</p>
                    </div>
                    <span className={`text-sm font-medium ${days === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {days === 0 ? 'Dziś!' : `za ${days} dni`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package size={20} />
              Ostatnie zlecenia
            </h2>
            <button
              onClick={() => navigate('/manager/orders')}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Zobacz wszystkie <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {recentOrders.map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate(`/manager/orders/${order.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                  <div>
                    <span className="font-mono font-semibold">{order.order_number}</span>
                    <p className="text-sm text-muted-foreground">{order.client_name}</p>
                  </div>
                </div>
                <span className="text-sm font-medium">
                  {order.price_total?.toLocaleString('pl-PL')} zł
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcement Board */}
      <div className="mt-8">
        <AnnouncementBoard />
      </div>
    </div>
  );
};

export default Dashboard;
