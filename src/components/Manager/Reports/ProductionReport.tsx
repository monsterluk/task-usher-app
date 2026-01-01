import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  FileText,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Package,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  BarChart3,
  Target
} from 'lucide-react';
import { productionReportsApi, isDemoMode } from '@/utils/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface ReportData {
  period: { from: string; to: string; days: number };
  overview: {
    total_orders: number;
    completed_orders: number;
    in_progress_orders: number;
    total_quantity: number;
    completed_quantity: number;
    total_revenue: number;
    completed_revenue: number;
    avg_order_size: number;
    completion_rate: number;
  };
  time_tracking: {
    total_sessions: number;
    active_workers: number;
    total_hours_worked: number;
    avg_session_hours: number;
  };
  efficiency: {
    on_time_delivery_rate: number;
    quality_pass_rate: number;
    completion_rate: number;
  };
  by_department: { department: string; orders_count: number; total_quantity: number; total_value: number }[];
  daily_trend: { date: string; orders_created: number; quantity: number; revenue: number }[];
  worker_productivity: { id: number; name: string; department: string; hours_worked: number; orders_worked: number }[];
  quality: { total_inspections: number; passed: number; failed: number; pass_rate: number };
}

interface ComparisonData {
  current_period: { total_orders: number; completed: number; quantity: number; revenue: number };
  previous_period: { total_orders: number; completed: number; quantity: number; revenue: number };
  changes: { orders_change: number; completed_change: number; quantity_change: number; revenue_change: number };
}

const ProductionReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    if (isDemoMode()) {
      loadDemoData();
      return;
    }

    try {
      setLoading(true);
      const [reportResponse, comparisonResponse] = await Promise.all([
        productionReportsApi.getReport({ from_date: dateRange.from, to_date: dateRange.to }),
        productionReportsApi.getComparison({ from_date: dateRange.from, to_date: dateRange.to })
      ]);
      setReport(reportResponse.data);
      setComparison(comparisonResponse.data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    // Generate demo daily data
    const dailyData = [];
    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      dailyData.push({
        date: date.toISOString().split('T')[0],
        orders_created: isWeekend ? 0 : Math.floor(Math.random() * 8) + 3,
        quantity: isWeekend ? 0 : Math.floor(Math.random() * 500) + 100,
        revenue: isWeekend ? 0 : Math.floor(Math.random() * 15000) + 5000
      });
    }

    setReport({
      period: { from: dateRange.from, to: dateRange.to, days },
      overview: {
        total_orders: 127,
        completed_orders: 98,
        in_progress_orders: 29,
        total_quantity: 12450,
        completed_quantity: 9820,
        total_revenue: 458700,
        completed_revenue: 385200,
        avg_order_size: 98,
        completion_rate: 77
      },
      time_tracking: {
        total_sessions: 342,
        active_workers: 18,
        total_hours_worked: 1256.5,
        avg_session_hours: 3.7
      },
      efficiency: {
        on_time_delivery_rate: 89,
        quality_pass_rate: 96.5,
        completion_rate: 77
      },
      by_department: [
        { department: 'Frezowanie CNC', orders_count: 45, total_quantity: 4500, total_value: 178000 },
        { department: 'Ciecie laserowe', orders_count: 38, total_quantity: 3800, total_value: 142000 },
        { department: 'Giecie', orders_count: 28, total_quantity: 2800, total_value: 89000 },
        { department: 'Montaz', orders_count: 16, total_quantity: 1350, total_value: 49700 }
      ],
      daily_trend: dailyData,
      worker_productivity: [
        { id: 1, name: 'Jan Kowalski', department: 'Frezowanie CNC', hours_worked: 156.5, orders_worked: 23 },
        { id: 2, name: 'Anna Nowak', department: 'Ciecie laserowe', hours_worked: 148.2, orders_worked: 21 },
        { id: 3, name: 'Piotr Wisniewski', department: 'Giecie', hours_worked: 142.0, orders_worked: 19 },
        { id: 4, name: 'Maria Dabrowska', department: 'Montaz', hours_worked: 138.5, orders_worked: 18 },
        { id: 5, name: 'Tomasz Zielinski', department: 'Frezowanie CNC', hours_worked: 132.0, orders_worked: 17 }
      ],
      quality: {
        total_inspections: 215,
        passed: 207,
        failed: 8,
        pass_rate: 96.5
      }
    });

    setComparison({
      current_period: { total_orders: 127, completed: 98, quantity: 12450, revenue: 458700 },
      previous_period: { total_orders: 112, completed: 89, quantity: 10820, revenue: 412500 },
      changes: { orders_change: 13, completed_change: 10, quantity_change: 15, revenue_change: 11 }
    });

    setLoading(false);
  };

  const exportToCSV = async (type: 'orders' | 'work_sessions' | 'quality') => {
    try {
      if (isDemoMode()) {
        alert('Eksport niedostepny w trybie demo');
        return;
      }
      const response = await productionReportsApi.getExportData(type, { from_date: dateRange.from, to_date: dateRange.to });
      const records = response.data.records;

      if (records.length === 0) {
        alert('Brak danych do eksportu');
        return;
      }

      const headers = Object.keys(records[0]).join(',');
      const rows = records.map((r: any) => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${type}_${dateRange.from}_${dateRange.to}.csv`;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Eksport nie powiodl sie');
    }
  };

  const ChangeIndicator = ({ value, suffix = '%' }: { value: number; suffix?: string }) => {
    const isPositive = value > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <span className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <Icon size={14} />
        {isPositive ? '+' : ''}{value}{suffix}
      </span>
    );
  };

  const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
        <span className="ml-2">Generowanie raportu...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Brak danych do wyswietlenia</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/manager')} className="btn-secondary">
            <ArrowLeft size={18} className="mr-2" />
            Dashboard
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">Raport produkcji</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-muted-foreground" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="input-industrial text-sm"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="input-industrial text-sm"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics with Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-2">
            <Package className="text-blue-600" size={24} />
            {comparison && <ChangeIndicator value={comparison.changes.orders_change} />}
          </div>
          <p className="text-3xl font-bold">{report.overview.total_orders}</p>
          <p className="text-sm text-muted-foreground">Zamowien ogolem</p>
        </div>
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="text-green-600" size={24} />
            {comparison && <ChangeIndicator value={comparison.changes.completed_change} />}
          </div>
          <p className="text-3xl font-bold">{report.overview.completed_orders}</p>
          <p className="text-sm text-muted-foreground">Zrealizowanych</p>
        </div>
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="text-purple-600" size={24} />
            {comparison && <ChangeIndicator value={comparison.changes.quantity_change} />}
          </div>
          <p className="text-3xl font-bold">{report.overview.total_quantity.toLocaleString('pl-PL')}</p>
          <p className="text-sm text-muted-foreground">Sztuk wyprodukowanych</p>
        </div>
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="text-amber-600" size={24} />
            {comparison && <ChangeIndicator value={comparison.changes.revenue_change} />}
          </div>
          <p className="text-3xl font-bold">{report.overview.total_revenue.toLocaleString('pl-PL')} zl</p>
          <p className="text-sm text-muted-foreground">Przychod</p>
        </div>
      </div>

      {/* Efficiency Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-industrial text-center">
          <Target className="mx-auto text-blue-600 mb-2" size={32} />
          <p className="text-4xl font-bold text-blue-600">{report.efficiency.completion_rate}%</p>
          <p className="text-sm text-muted-foreground">Wskaznik realizacji</p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${report.efficiency.completion_rate}%` }} />
          </div>
        </div>
        <div className="card-industrial text-center">
          <Clock className="mx-auto text-green-600 mb-2" size={32} />
          <p className="text-4xl font-bold text-green-600">{report.efficiency.on_time_delivery_rate}%</p>
          <p className="text-sm text-muted-foreground">Terminowosc dostaw</p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: `${report.efficiency.on_time_delivery_rate}%` }} />
          </div>
        </div>
        <div className="card-industrial text-center">
          <CheckCircle className="mx-auto text-purple-600 mb-2" size={32} />
          <p className="text-4xl font-bold text-purple-600">{report.efficiency.quality_pass_rate}%</p>
          <p className="text-sm text-muted-foreground">Jakosc produkcji</p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full" style={{ width: `${report.efficiency.quality_pass_rate}%` }} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Trend */}
        <div className="card-industrial">
          <h2 className="text-lg font-bold mb-4">Trend dzienny</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.daily_trend.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  fontSize={10}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('pl-PL')}
                />
                <Legend />
                <Line type="monotone" dataKey="orders_created" stroke="#3b82f6" strokeWidth={2} name="Zamowienia" yAxisId="left" dot={false} />
                <Line type="monotone" dataKey="quantity" stroke="#22c55e" strokeWidth={2} name="Ilosc" yAxisId="right" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Department */}
        <div className="card-industrial">
          <h2 className="text-lg font-bold mb-4">Produkcja wg dzialu</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report.by_department}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total_value"
                  nameKey="department"
                  label={({ department, percent }) => `${department.substring(0, 8)}... ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {report.by_department.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString('pl-PL')} zl`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Time Tracking & Workers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Time Tracking Summary */}
        <div className="card-industrial">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock size={20} />
            Czas pracy
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{report.time_tracking.total_hours_worked.toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Laczny czas pracy</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold text-green-600">{report.time_tracking.active_workers}</p>
              <p className="text-sm text-muted-foreground">Aktywnych pracownikow</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{report.time_tracking.total_sessions}</p>
              <p className="text-sm text-muted-foreground">Sesji pracy</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold text-amber-600">{report.time_tracking.avg_session_hours.toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Srednia sesja</p>
            </div>
          </div>
        </div>

        {/* Top Workers */}
        <div className="card-industrial">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={20} />
            Najlepsi pracownicy
          </h2>
          <div className="space-y-3">
            {report.worker_productivity.slice(0, 5).map((worker, index) => (
              <div key={worker.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{worker.name}</p>
                    <p className="text-xs text-muted-foreground">{worker.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{worker.hours_worked.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">{worker.orders_worked} zlecen</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Summary */}
      <div className="card-industrial mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <CheckCircle size={20} />
          Kontrola jakosci
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-3xl font-bold">{report.quality.total_inspections}</p>
            <p className="text-sm text-muted-foreground">Inspekcji</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{report.quality.passed}</p>
            <p className="text-sm text-muted-foreground">Zaliczonych</p>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{report.quality.failed}</p>
            <p className="text-sm text-muted-foreground">Niezaliczonych</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{report.quality.pass_rate}%</p>
            <p className="text-sm text-muted-foreground">Wskaznik jakosci</p>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="card-industrial">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Download size={20} />
          Eksport danych
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => exportToCSV('orders')} className="btn-secondary">
            <FileText size={18} className="mr-2" />
            Eksportuj zamowienia (CSV)
          </button>
          <button onClick={() => exportToCSV('work_sessions')} className="btn-secondary">
            <Clock size={18} className="mr-2" />
            Eksportuj czas pracy (CSV)
          </button>
          <button onClick={() => exportToCSV('quality')} className="btn-secondary">
            <CheckCircle size={18} className="mr-2" />
            Eksportuj kontrole jakosci (CSV)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionReport;
