import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Factory,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Clock,
  Gauge,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { capacityApi, isDemoMode } from '@/utils/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface Department {
  department: string;
  machines: any[];
  workers: any[];
  total_capacity_per_hour: number;
  active_machines: number;
  total_machines: number;
  active_workers: number;
  pending_quantity: number;
  utilization_percent: number;
  status: 'overloaded' | 'high' | 'normal' | 'low';
}

interface ForecastDay {
  date: string;
  day_name: string;
  orders_due: any[];
  total_quantity: number;
  estimated_hours: number;
  is_weekend: boolean;
}

interface Bottleneck {
  stage: string;
  orders_count: number;
  total_quantity: number;
  estimated_hours: number;
  severity: 'critical' | 'high' | 'normal';
}

interface Worker {
  id: number;
  name: string;
  department: string;
  active_tasks: number;
  hours_worked_today: number;
  hours_remaining: number;
  availability: 'available' | 'busy' | 'unavailable';
}

const CapacityDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'forecast' | 'bottlenecks' | 'workers'>('overview');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workersSummary, setWorkersSummary] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  const [forecastWeek, setForecastWeek] = useState(0);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (isDemoMode()) {
      loadDemoData();
      return;
    }

    try {
      setLoading(true);
      if (activeTab === 'overview') {
        const response = await capacityApi.getOverview();
        setDepartments(response.data.departments);
        setSummary(response.data.summary);
      } else if (activeTab === 'forecast') {
        const response = await capacityApi.getForecast(21);
        setForecast(response.data.forecast);
      } else if (activeTab === 'bottlenecks') {
        const response = await capacityApi.getBottlenecks();
        setBottlenecks(response.data.bottlenecks);
      } else if (activeTab === 'workers') {
        const response = await capacityApi.getWorkerAvailability();
        setWorkers(response.data.workers);
        setWorkersSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error loading capacity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    setDepartments([
      {
        department: 'Frezowanie CNC',
        machines: [],
        workers: [],
        total_capacity_per_hour: 120,
        active_machines: 3,
        total_machines: 4,
        active_workers: 5,
        pending_quantity: 850,
        utilization_percent: 85,
        status: 'high'
      },
      {
        department: 'Ciecie laserowe',
        machines: [],
        workers: [],
        total_capacity_per_hour: 200,
        active_machines: 2,
        total_machines: 2,
        active_workers: 3,
        pending_quantity: 1200,
        utilization_percent: 95,
        status: 'overloaded'
      },
      {
        department: 'Giecie',
        machines: [],
        workers: [],
        total_capacity_per_hour: 80,
        active_machines: 2,
        total_machines: 3,
        active_workers: 4,
        pending_quantity: 320,
        utilization_percent: 50,
        status: 'normal'
      },
      {
        department: 'Montaz',
        machines: [],
        workers: [],
        total_capacity_per_hour: 40,
        active_machines: 0,
        total_machines: 0,
        active_workers: 6,
        pending_quantity: 180,
        utilization_percent: 35,
        status: 'low'
      }
    ]);

    setSummary({
      total_departments: 4,
      total_machines: 9,
      total_workers: 18,
      overloaded_departments: 1
    });

    // Demo forecast
    const demoForecast: ForecastDay[] = [];
    const today = new Date();
    for (let i = 0; i < 21; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      demoForecast.push({
        date: date.toISOString().split('T')[0],
        day_name: date.toLocaleDateString('pl-PL', { weekday: 'short' }),
        orders_due: isWeekend ? [] : Array(Math.floor(Math.random() * 5) + 1).fill({
          order_number: `ZL-${2024}/${1000 + i}`,
          product_name: 'Produkt testowy',
          quantity: Math.floor(Math.random() * 100) + 10
        }),
        total_quantity: isWeekend ? 0 : Math.floor(Math.random() * 500) + 100,
        estimated_hours: isWeekend ? 0 : Math.floor(Math.random() * 40) + 8,
        is_weekend: isWeekend
      });
    }
    setForecast(demoForecast);

    setBottlenecks([
      { stage: 'Ciecie laserowe', orders_count: 12, total_quantity: 1200, estimated_hours: 48, severity: 'critical' },
      { stage: 'Frezowanie CNC', orders_count: 8, total_quantity: 850, estimated_hours: 32, severity: 'high' },
      { stage: 'Kontrola jakosci', orders_count: 5, total_quantity: 320, estimated_hours: 12, severity: 'normal' },
    ]);

    setWorkers([
      { id: 1, name: 'Jan Kowalski', department: 'Frezowanie CNC', active_tasks: 2, hours_worked_today: 5.5, hours_remaining: 2.5, availability: 'busy' },
      { id: 2, name: 'Anna Nowak', department: 'Ciecie laserowe', active_tasks: 3, hours_worked_today: 6, hours_remaining: 2, availability: 'busy' },
      { id: 3, name: 'Piotr Wisniewski', department: 'Giecie', active_tasks: 1, hours_worked_today: 3, hours_remaining: 5, availability: 'available' },
      { id: 4, name: 'Maria Dabrowska', department: 'Montaz', active_tasks: 0, hours_worked_today: 0, hours_remaining: 8, availability: 'available' },
      { id: 5, name: 'Tomasz Zielinski', department: 'Frezowanie CNC', active_tasks: 4, hours_worked_today: 8, hours_remaining: 0, availability: 'unavailable' },
    ]);

    setWorkersSummary({
      total_workers: 5,
      available: 2,
      busy: 2,
      unavailable: 1,
      total_hours_remaining: 17.5
    });

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overloaded': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'normal': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'overloaded': return 'Przeciazony';
      case 'high': return 'Wysoki';
      case 'normal': return 'Normalny';
      case 'low': return 'Niski';
      default: return status;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      default: return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'busy': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'unavailable': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityLabel = (availability: string) => {
    switch (availability) {
      case 'available': return 'Dostepny';
      case 'busy': return 'Zajety';
      case 'unavailable': return 'Niedostepny';
      default: return availability;
    }
  };

  const getBarColor = (utilization: number) => {
    if (utilization > 90) return '#ef4444';
    if (utilization > 70) return '#f97316';
    if (utilization > 40) return '#3b82f6';
    return '#22c55e';
  };

  const currentWeekForecast = forecast.slice(forecastWeek * 7, (forecastWeek + 1) * 7);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
        <span className="ml-2">Ladowanie...</span>
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
          <h1 className="text-2xl md:text-3xl font-bold">Planowanie zdolnosci</h1>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="card-industrial">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dzialy</p>
                <p className="text-2xl font-bold">{summary.total_departments}</p>
              </div>
              <Factory className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="card-industrial">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maszyny</p>
                <p className="text-2xl font-bold">{summary.total_machines}</p>
              </div>
              <Gauge className="text-purple-600" size={24} />
            </div>
          </div>
          <div className="card-industrial">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pracownicy</p>
                <p className="text-2xl font-bold">{summary.total_workers}</p>
              </div>
              <Users className="text-green-600" size={24} />
            </div>
          </div>
          <div className="card-industrial">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Przeciazone</p>
                <p className={`text-2xl font-bold ${summary.overloaded_departments > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {summary.overloaded_departments}
                </p>
              </div>
              <AlertTriangle className={summary.overloaded_departments > 0 ? 'text-red-600' : 'text-green-600'} size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'overview', label: 'Przeglad', icon: Factory },
          { key: 'forecast', label: 'Prognoza', icon: Calendar },
          { key: 'bottlenecks', label: 'Waskie gardla', icon: AlertTriangle },
          { key: 'workers', label: 'Pracownicy', icon: Users }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Department capacity chart */}
          <div className="card-industrial">
            <h2 className="text-lg font-bold mb-4">Wykorzystanie zdolnosci wg dzialu</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departments} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" fontSize={12} />
                  <YAxis dataKey="department" type="category" width={120} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Wykorzystanie']}
                  />
                  <Bar dataKey="utilization_percent" radius={[0, 4, 4, 0]}>
                    {departments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.utilization_percent)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map(dept => (
              <div key={dept.department} className="card-industrial">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{dept.department}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(dept.status)}`}>
                    {getStatusLabel(dept.status)}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Maszyny aktywne</span>
                    <span className="font-medium">{dept.active_machines} / {dept.total_machines}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pracownicy</span>
                    <span className="font-medium">{dept.active_workers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Zdolnosc/h</span>
                    <span className="font-medium">{dept.total_capacity_per_hour} szt</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">W kolejce</span>
                    <span className="font-medium">{dept.pending_quantity} szt</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Wykorzystanie</span>
                      <span className="font-medium">{dept.utilization_percent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, dept.utilization_percent)}%`,
                          backgroundColor: getBarColor(dept.utilization_percent)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="space-y-4">
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setForecastWeek(Math.max(0, forecastWeek - 1))}
              disabled={forecastWeek === 0}
              className="btn-secondary disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium">
              Tydzien {forecastWeek + 1} ({currentWeekForecast[0]?.date} - {currentWeekForecast[currentWeekForecast.length - 1]?.date})
            </span>
            <button
              onClick={() => setForecastWeek(Math.min(2, forecastWeek + 1))}
              disabled={forecastWeek >= 2}
              className="btn-secondary disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Forecast chart */}
          <div className="card-industrial">
            <h2 className="text-lg font-bold mb-4">Prognoza obciazenia</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentWeekForecast}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day_name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="total_quantity" fill="#3b82f6" name="Ilosc" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="estimated_hours" fill="#22c55e" name="Godziny" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {currentWeekForecast.map(day => (
              <div
                key={day.date}
                className={`card-industrial ${day.is_weekend ? 'opacity-50' : ''}`}
              >
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{day.day_name}</p>
                  <p className="font-semibold text-sm">{day.date.split('-').slice(1).join('/')}</p>
                </div>
                <div className="mt-2 space-y-1 text-center">
                  <p className="text-lg font-bold text-blue-600">{day.orders_due.length}</p>
                  <p className="text-xs text-muted-foreground">zlecen</p>
                  <p className="text-sm font-medium">{day.total_quantity} szt</p>
                  <p className="text-xs text-muted-foreground">{day.estimated_hours}h pracy</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bottlenecks' && (
        <div className="space-y-4">
          {bottlenecks.length === 0 ? (
            <div className="card-industrial text-center py-12">
              <TrendingUp size={48} className="mx-auto mb-4 text-green-600 opacity-50" />
              <p className="text-muted-foreground">Brak wykrytych waskich gardel</p>
            </div>
          ) : (
            bottlenecks.map((bottleneck, index) => (
              <div
                key={index}
                className={`card-industrial border-l-4 ${getSeverityColor(bottleneck.severity)}`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        bottleneck.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        bottleneck.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {bottleneck.severity === 'critical' ? 'Krytyczny' :
                         bottleneck.severity === 'high' ? 'Wysoki' : 'Normalny'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{bottleneck.stage}</h3>
                  </div>
                  <div className="flex flex-wrap gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold">{bottleneck.orders_count}</p>
                      <p className="text-xs text-muted-foreground">zlecen</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{bottleneck.total_quantity}</p>
                      <p className="text-xs text-muted-foreground">sztuk</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{bottleneck.estimated_hours}h</p>
                      <p className="text-xs text-muted-foreground">szac. czas</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'workers' && (
        <div className="space-y-4">
          {/* Workers summary */}
          {workersSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="card-industrial text-center">
                <p className="text-3xl font-bold text-green-600">{workersSummary.available}</p>
                <p className="text-sm text-muted-foreground">Dostepnych</p>
              </div>
              <div className="card-industrial text-center">
                <p className="text-3xl font-bold text-yellow-600">{workersSummary.busy}</p>
                <p className="text-sm text-muted-foreground">Zajetych</p>
              </div>
              <div className="card-industrial text-center">
                <p className="text-3xl font-bold text-red-600">{workersSummary.unavailable}</p>
                <p className="text-sm text-muted-foreground">Niedostepnych</p>
              </div>
              <div className="card-industrial text-center">
                <p className="text-3xl font-bold text-blue-600">{workersSummary.total_hours_remaining}h</p>
                <p className="text-sm text-muted-foreground">Pozostalo</p>
              </div>
            </div>
          )}

          {/* Workers list */}
          <div className="card-industrial overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Pracownik</th>
                  <th className="text-left p-3 font-medium">Dzial</th>
                  <th className="text-center p-3 font-medium">Zadania</th>
                  <th className="text-center p-3 font-medium">Przepracowane</th>
                  <th className="text-center p-3 font-medium">Pozostalo</th>
                  <th className="text-center p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {workers.map(worker => (
                  <tr key={worker.id} className="border-t border-border hover:bg-muted/50">
                    <td className="p-3 font-medium">{worker.name}</td>
                    <td className="p-3 text-muted-foreground">{worker.department}</td>
                    <td className="p-3 text-center">{worker.active_tasks}</td>
                    <td className="p-3 text-center">{worker.hours_worked_today.toFixed(1)}h</td>
                    <td className="p-3 text-center font-medium">{worker.hours_remaining.toFixed(1)}h</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getAvailabilityColor(worker.availability)}`}>
                        {getAvailabilityLabel(worker.availability)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapacityDashboard;
