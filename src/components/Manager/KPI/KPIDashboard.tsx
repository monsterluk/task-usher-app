import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { useApp } from '@/context/AppContext';

interface KPICard {
  title: string;
  value: string | number;
  unit?: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  target?: number;
  trend?: 'up' | 'down' | 'neutral';
}

const KPIDashboard = () => {
  const { orders, workers, timesheets } = useApp();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [compareMode, setCompareMode] = useState(false);

  // Calculate date ranges
  const getDateRange = (periodType: typeof period) => {
    const now = new Date();
    const start = new Date();
    const prevStart = new Date();
    const prevEnd = new Date();

    switch (periodType) {
      case 'week':
        start.setDate(now.getDate() - 7);
        prevStart.setDate(now.getDate() - 14);
        prevEnd.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        prevStart.setMonth(now.getMonth() - 2);
        prevEnd.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        prevStart.setMonth(now.getMonth() - 6);
        prevEnd.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        prevStart.setFullYear(now.getFullYear() - 2);
        prevEnd.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { start, end: now, prevStart, prevEnd };
  };

  const dateRange = getDateRange(period);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const currentOrders = orders.filter(o => {
      const created = new Date(o.created_at);
      return created >= dateRange.start && created <= dateRange.end;
    });

    const prevOrders = orders.filter(o => {
      const created = new Date(o.created_at);
      return created >= dateRange.prevStart && created <= dateRange.prevEnd;
    });

    const completedOrders = currentOrders.filter(o => o.status === 'GOTOWE');
    const prevCompleted = prevOrders.filter(o => o.status === 'GOTOWE');

    // On-time delivery rate
    const onTimeOrders = completedOrders.filter(o => {
      if (!o.planned_completion_date) return true;
      const planned = new Date(o.planned_completion_date);
      const completed = o.stages?.find(s => s.name === 'Gotowe')?.completed_at;
      if (!completed) return true;
      return new Date(completed) <= planned;
    });

    const onTimeRate = completedOrders.length > 0
      ? (onTimeOrders.length / completedOrders.length) * 100
      : 100;

    const prevOnTimeOrders = prevCompleted.filter(o => {
      if (!o.planned_completion_date) return true;
      const planned = new Date(o.planned_completion_date);
      const completed = o.stages?.find(s => s.name === 'Gotowe')?.completed_at;
      if (!completed) return true;
      return new Date(completed) <= planned;
    });

    const prevOnTimeRate = prevCompleted.length > 0
      ? (prevOnTimeOrders.length / prevCompleted.length) * 100
      : 100;

    // Average lead time
    const leadTimes = completedOrders.map(o => {
      const created = new Date(o.created_at);
      const lastStage = o.stages?.find(s => s.name === 'Gotowe');
      const completed = lastStage?.completed_at ? new Date(lastStage.completed_at) : new Date();
      return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    }).filter(lt => lt > 0);

    const avgLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0;

    const prevLeadTimes = prevCompleted.map(o => {
      const created = new Date(o.created_at);
      const lastStage = o.stages?.find(s => s.name === 'Gotowe');
      const completed = lastStage?.completed_at ? new Date(lastStage.completed_at) : new Date();
      return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    }).filter(lt => lt > 0);

    const prevAvgLeadTime = prevLeadTimes.length > 0
      ? prevLeadTimes.reduce((a, b) => a + b, 0) / prevLeadTimes.length
      : 0;

    // Total revenue
    const totalRevenue = currentOrders.reduce((sum, o) => sum + (o.price_total || 0), 0);
    const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.price_total || 0), 0);

    // Worker productivity
    const activeWorkers = workers.filter(w => w.active).length;

    // Orders per worker
    const ordersPerWorker = activeWorkers > 0
      ? completedOrders.length / activeWorkers
      : 0;

    const prevOrdersPerWorker = activeWorkers > 0
      ? prevCompleted.length / activeWorkers
      : 0;

    // In progress count
    const inProgressCount = currentOrders.filter(o => o.status === 'W_TRAKCIE').length;

    // Overdue orders
    const overdueOrders = orders.filter(o => {
      if (o.status === 'GOTOWE' || !o.planned_completion_date) return false;
      return new Date(o.planned_completion_date) < new Date();
    });

    return {
      totalOrders: currentOrders.length,
      prevTotalOrders: prevOrders.length,
      completedOrders: completedOrders.length,
      prevCompletedOrders: prevCompleted.length,
      onTimeRate,
      prevOnTimeRate,
      avgLeadTime,
      prevAvgLeadTime,
      totalRevenue,
      prevRevenue,
      ordersPerWorker,
      prevOrdersPerWorker,
      inProgressCount,
      overdueCount: overdueOrders.length,
      activeWorkers
    };
  }, [orders, workers, dateRange]);

  // Calculate percentage change
  const calcChange = (current: number, prev: number): number => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  const kpiCards: KPICard[] = [
    {
      title: 'Zlecenia zrealizowane',
      value: kpis.completedOrders,
      change: calcChange(kpis.completedOrders, kpis.prevCompletedOrders),
      changeLabel: 'vs poprzedni okres',
      icon: <CheckCircle size={24} />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      target: 50,
      trend: kpis.completedOrders >= kpis.prevCompletedOrders ? 'up' : 'down'
    },
    {
      title: 'Terminowosc dostaw',
      value: kpis.onTimeRate.toFixed(1),
      unit: '%',
      change: kpis.onTimeRate - kpis.prevOnTimeRate,
      changeLabel: 'vs poprzedni okres',
      icon: <Target size={24} />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      target: 95,
      trend: kpis.onTimeRate >= 95 ? 'up' : 'down'
    },
    {
      title: 'Sredni czas realizacji',
      value: kpis.avgLeadTime.toFixed(1),
      unit: 'dni',
      change: -calcChange(kpis.avgLeadTime, kpis.prevAvgLeadTime),
      changeLabel: 'vs poprzedni okres',
      icon: <Clock size={24} />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      target: 5,
      trend: kpis.avgLeadTime <= kpis.prevAvgLeadTime ? 'up' : 'down'
    },
    {
      title: 'Przychod',
      value: (kpis.totalRevenue / 1000).toFixed(1),
      unit: 'tys. PLN',
      change: calcChange(kpis.totalRevenue, kpis.prevRevenue),
      changeLabel: 'vs poprzedni okres',
      icon: <TrendingUp size={24} />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: kpis.totalRevenue >= kpis.prevRevenue ? 'up' : 'down'
    },
    {
      title: 'Zlecenia w toku',
      value: kpis.inProgressCount,
      change: 0,
      changeLabel: 'aktywne',
      icon: <Activity size={24} />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: 'neutral'
    },
    {
      title: 'Zagrozone terminem',
      value: kpis.overdueCount,
      change: 0,
      changeLabel: 'wymaga uwagi',
      icon: <AlertTriangle size={24} />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: kpis.overdueCount > 0 ? 'down' : 'up'
    }
  ];

  // Chart data
  const trendData = useMemo(() => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayOrders = orders.filter(o =>
        o.created_at.startsWith(dateStr)
      );

      const completedDay = orders.filter(o => {
        const lastStage = o.stages?.find(s => s.name === 'Gotowe');
        return lastStage?.completed_at?.startsWith(dateStr);
      });

      data.push({
        date: date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
        nowe: dayOrders.length,
        zrealizowane: completedDay.length,
        przychod: dayOrders.reduce((sum, o) => sum + (o.price_total || 0), 0) / 1000
      });
    }

    // Aggregate for longer periods
    if (period === 'quarter' || period === 'year') {
      const weeklyData = [];
      const weekSize = period === 'quarter' ? 7 : 30;
      for (let i = 0; i < data.length; i += weekSize) {
        const chunk = data.slice(i, i + weekSize);
        weeklyData.push({
          date: chunk[0]?.date || '',
          nowe: chunk.reduce((s, d) => s + d.nowe, 0),
          zrealizowane: chunk.reduce((s, d) => s + d.zrealizowane, 0),
          przychod: chunk.reduce((s, d) => s + d.przychod, 0)
        });
      }
      return weeklyData;
    }

    return data;
  }, [orders, period]);

  // Status distribution
  const statusData = useMemo(() => {
    const statuses = {
      'NOWE': 0,
      'W_TRAKCIE': 0,
      'GOTOWE': 0,
      'WSTRZYMANE': 0
    };

    orders.forEach(o => {
      if (statuses.hasOwnProperty(o.status)) {
        statuses[o.status as keyof typeof statuses]++;
      }
    });

    return [
      { name: 'Nowe', value: statuses['NOWE'], color: '#6B7280' },
      { name: 'W trakcie', value: statuses['W_TRAKCIE'], color: '#3B82F6' },
      { name: 'Gotowe', value: statuses['GOTOWE'], color: '#10B981' },
      { name: 'Wstrzymane', value: statuses['WSTRZYMANE'], color: '#F59E0B' }
    ];
  }, [orders]);

  // Worker efficiency data
  const workerEfficiency = useMemo(() => {
    return workers.filter(w => w.active).map(worker => {
      const workerOrders = orders.filter(o =>
        o.stages?.some(s => s.assigned_worker_id === worker.id && s.status === 'ZAKONCZONE')
      );

      const workerTimesheets = timesheets.filter(t => t.worker_id === worker.id);
      const totalHours = workerTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);

      return {
        name: worker.name.split(' ')[0],
        zlecenia: workerOrders.length,
        godziny: Math.round(totalHours),
        wydajnosc: workerOrders.length > 0 && totalHours > 0
          ? Math.round((workerOrders.length / totalHours) * 100) / 100
          : 0
      };
    }).sort((a, b) => b.zlecenia - a.zlecenia).slice(0, 8);
  }, [workers, orders, timesheets]);

  // OEE-like gauge data
  const oeeData = useMemo(() => {
    const availability = 95; // Mock - would calculate from machine downtime
    const performance = kpis.onTimeRate;
    const quality = 98; // Mock - would calculate from defects

    const oee = (availability * performance * quality) / 10000;

    return [
      { name: 'OEE', value: oee, fill: oee >= 85 ? '#10B981' : oee >= 60 ? '#F59E0B' : '#EF4444' },
      { name: 'Dostepnosc', value: availability, fill: '#3B82F6' },
      { name: 'Wydajnosc', value: performance, fill: '#8B5CF6' },
      { name: 'Jakosc', value: quality, fill: '#10B981' }
    ];
  }, [kpis.onTimeRate]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard KPI</h1>
          <p className="text-muted-foreground">Kluczowe wskazniki wydajnosci produkcji</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-card rounded-lg p-1 border">
            {(['week', 'month', 'quarter', 'year'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p === 'week' ? 'Tydzien' : p === 'month' ? 'Miesiac' : p === 'quarter' ? 'Kwartal' : 'Rok'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm ${
              compareMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <BarChart3 size={16} />
            Porownaj
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className="bg-card rounded-xl border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <div className={kpi.color}>{kpi.icon}</div>
              </div>
              {kpi.trend !== 'neutral' && (
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {Math.abs(kpi.change).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {kpi.value}{kpi.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{kpi.unit}</span>}
              </div>
              <div className="text-sm text-muted-foreground">{kpi.title}</div>
              {kpi.target && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Cel: {kpi.target}{kpi.unit}</span>
                    <span>{Math.min(100, (Number(kpi.value) / kpi.target) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        Number(kpi.value) >= kpi.target ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (Number(kpi.value) / kpi.target) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp size={18} />
              Trend zlecen i przychodu
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorNowe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorZrealizowane" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="nowe"
                name="Nowe zlecenia"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorNowe)"
              />
              <Area
                type="monotone"
                dataKey="zrealizowane"
                name="Zrealizowane"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorZrealizowane)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <PieChartIcon size={18} />
            Rozklad statusow
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {statusData.map((status, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-muted-foreground">{status.name}:</span>
                <span className="font-medium">{status.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Efficiency */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Users size={18} />
            Wydajnosc pracownikow
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workerEfficiency} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="zlecenia" name="Zlecenia" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="godziny" name="Godziny" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* OEE Gauge */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Zap size={18} />
            Wskazniki OEE
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="20%"
              outerRadius="90%"
              data={oeeData}
              startAngle={180}
              endAngle={0}
            >
              <RadialBar
                minAngle={15}
                background
                clockWise
                dataKey="value"
                cornerRadius={10}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}%`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend
                iconSize={10}
                layout="horizontal"
                verticalAlign="bottom"
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-4 mt-4">
            {oeeData.map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl font-bold" style={{ color: item.fill }}>
                  {item.value.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-card rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Szybkie wnioski</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
              <CheckCircle size={18} />
              Mocne strony
            </div>
            <ul className="text-sm text-green-600 space-y-1">
              {kpis.onTimeRate >= 90 && <li>• Wysoka terminowosc ({kpis.onTimeRate.toFixed(0)}%)</li>}
              {kpis.completedOrders > kpis.prevCompletedOrders && <li>• Wzrost realizacji zlecen</li>}
              {kpis.totalRevenue > kpis.prevRevenue && <li>• Wzrost przychodow</li>}
              {kpis.overdueCount === 0 && <li>• Brak zaleglosci</li>}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
              <AlertTriangle size={18} />
              Do poprawy
            </div>
            <ul className="text-sm text-yellow-600 space-y-1">
              {kpis.onTimeRate < 90 && <li>• Terminowosc ponizej 90%</li>}
              {kpis.avgLeadTime > 7 && <li>• Dlugi czas realizacji ({kpis.avgLeadTime.toFixed(1)} dni)</li>}
              {kpis.overdueCount > 0 && <li>• {kpis.overdueCount} zlecen zalegych</li>}
              {kpis.completedOrders < kpis.prevCompletedOrders && <li>• Spadek realizacji zlecen</li>}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
              <Target size={18} />
              Cele
            </div>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• Terminowosc: 95% (obecna: {kpis.onTimeRate.toFixed(0)}%)</li>
              <li>• Czas realizacji: 5 dni (obecny: {kpis.avgLeadTime.toFixed(1)})</li>
              <li>• OEE: 85% (obecny: {oeeData[0].value.toFixed(0)}%)</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-2 text-purple-700 font-medium mb-2">
              <Activity size={18} />
              Akcje
            </div>
            <ul className="text-sm text-purple-600 space-y-1">
              {kpis.overdueCount > 0 && <li>• Przejrzyj zaleglosci</li>}
              {kpis.inProgressCount > 10 && <li>• Zbalansuj obciazenie</li>}
              <li>• Analizuj wąskie gardla</li>
              <li>• Przegladaj raporty</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIDashboard;
