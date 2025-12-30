import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  Activity,
  Gauge,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Calendar,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// OEE = Availability x Performance x Quality
// Availability = Running Time / Planned Production Time
// Performance = Actual Output / Theoretical Output
// Quality = Good Units / Total Units Produced

interface MachineOEE {
  id: number;
  name: string;
  department: string;
  availability: number; // %
  performance: number; // %
  quality: number; // %
  oee: number; // %
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  runningHours: number;
  plannedHours: number;
  downtime: number;
  defectRate: number;
}

const OEEDashboard = () => {
  const navigate = useNavigate();
  const { orders, loading: appLoading } = useApp();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Demo data - in production this would come from API
  const machinesOEE: MachineOEE[] = useMemo(() => [
    {
      id: 1,
      name: 'CNC Router 1',
      department: 'Frezowanie',
      availability: 92,
      performance: 88,
      quality: 97,
      oee: 78.5,
      status: 'in_use',
      runningHours: 44,
      plannedHours: 48,
      downtime: 4,
      defectRate: 3
    },
    {
      id: 2,
      name: 'CNC Router 2',
      department: 'Frezowanie',
      availability: 85,
      performance: 82,
      quality: 95,
      oee: 66.2,
      status: 'available',
      runningHours: 40,
      plannedHours: 48,
      downtime: 8,
      defectRate: 5
    },
    {
      id: 3,
      name: 'Laser CO2',
      department: 'Ciecie',
      availability: 95,
      performance: 91,
      quality: 99,
      oee: 85.6,
      status: 'in_use',
      runningHours: 46,
      plannedHours: 48,
      downtime: 2,
      defectRate: 1
    },
    {
      id: 4,
      name: 'Giętarka',
      department: 'Giecie',
      availability: 78,
      performance: 85,
      quality: 94,
      oee: 62.3,
      status: 'maintenance',
      runningHours: 37,
      plannedHours: 48,
      downtime: 11,
      defectRate: 6
    },
    {
      id: 5,
      name: 'Polerka',
      department: 'Wykanczanie',
      availability: 88,
      performance: 90,
      quality: 98,
      oee: 77.6,
      status: 'in_use',
      runningHours: 42,
      plannedHours: 48,
      downtime: 6,
      defectRate: 2
    },
  ], []);

  // Filter by department
  const filteredMachines = useMemo(() => {
    if (selectedDepartment === 'all') return machinesOEE;
    return machinesOEE.filter(m => m.department === selectedDepartment);
  }, [machinesOEE, selectedDepartment]);

  // Calculate averages
  const averageOEE = useMemo(() => {
    const sum = filteredMachines.reduce((acc, m) => acc + m.oee, 0);
    return (sum / filteredMachines.length).toFixed(1);
  }, [filteredMachines]);

  const averageAvailability = useMemo(() => {
    const sum = filteredMachines.reduce((acc, m) => acc + m.availability, 0);
    return (sum / filteredMachines.length).toFixed(1);
  }, [filteredMachines]);

  const averagePerformance = useMemo(() => {
    const sum = filteredMachines.reduce((acc, m) => acc + m.performance, 0);
    return (sum / filteredMachines.length).toFixed(1);
  }, [filteredMachines]);

  const averageQuality = useMemo(() => {
    const sum = filteredMachines.reduce((acc, m) => acc + m.quality, 0);
    return (sum / filteredMachines.length).toFixed(1);
  }, [filteredMachines]);

  // Departments list
  const departments = useMemo(() => {
    const depts = [...new Set(machinesOEE.map(m => m.department))];
    return ['all', ...depts];
  }, [machinesOEE]);

  // Trend data for chart
  const trendData = useMemo(() => {
    const days = timeRange === 'day' ? 24 : timeRange === 'week' ? 7 : 30;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (timeRange === 'day') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
      // Simulated data
      const baseOEE = 72 + Math.random() * 15;
      data.push({
        name: timeRange === 'day'
          ? date.toLocaleTimeString('pl-PL', { hour: '2-digit' })
          : date.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric' }),
        oee: Math.round(baseOEE * 10) / 10,
        availability: Math.round((baseOEE + 10 + Math.random() * 8) * 10) / 10,
        performance: Math.round((baseOEE + 5 + Math.random() * 10) * 10) / 10,
        quality: Math.round((baseOEE + 15 + Math.random() * 8) * 10) / 10,
      });
    }
    return data;
  }, [timeRange]);

  // OEE gauge data for radial chart
  const gaugeData = [
    { name: 'OEE', value: parseFloat(averageOEE), fill: '#8b5cf6' },
  ];

  // Get OEE color based on value
  const getOEEColor = (value: number) => {
    if (value >= 85) return 'text-green-600';
    if (value >= 65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOEEBgColor = (value: number) => {
    if (value >= 85) return 'bg-green-500';
    if (value >= 65) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_use': return 'bg-green-500';
      case 'available': return 'bg-blue-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_use': return 'W uzyciu';
      case 'available': return 'Dostepna';
      case 'maintenance': return 'Konserwacja';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  if (appLoading) {
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
          <button
            onClick={() => navigate('/manager')}
            className="btn-secondary"
          >
            <ArrowLeft size={18} className="mr-2" />
            Dashboard
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard OEE</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="input-industrial text-sm"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'Wszystkie dzialy' : dept}
              </option>
            ))}
          </select>
          <div className="flex bg-muted rounded-lg p-1">
            {(['day', 'week', 'month'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  timeRange === range ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'
                }`}
              >
                {range === 'day' ? '24h' : range === 'week' ? '7 dni' : '30 dni'}
              </button>
            ))}
          </div>
          <button className="btn-secondary p-2">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Overall OEE */}
        <div className="card-industrial">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">OEE Calkowite</p>
              <p className={`text-4xl font-bold ${getOEEColor(parseFloat(averageOEE))}`}>
                {averageOEE}%
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp size={12} className="text-green-600" />
                +2.3% vs poprzedni okres
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Gauge size={24} className="text-purple-600" />
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="card-industrial">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dostepnosc</p>
              <p className="text-4xl font-bold text-blue-600">{averageAvailability}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Czas pracy / Planowany czas
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Clock size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="card-industrial">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Wydajnosc</p>
              <p className="text-4xl font-bold text-orange-600">{averagePerformance}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rzeczywista / Teoretyczna
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Activity size={24} className="text-orange-600" />
            </div>
          </div>
        </div>

        {/* Quality */}
        <div className="card-industrial">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Jakosc</p>
              <p className="text-4xl font-bold text-green-600">{averageQuality}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Dobre / Wyprodukowane
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* OEE Trend Chart */}
        <div className="card-industrial lg:col-span-2">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Trend OEE
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Legend />
                <Bar dataKey="oee" fill="#8b5cf6" name="OEE" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="availability" stroke="#3b82f6" strokeWidth={2} name="Dostepnosc" dot={false} />
                <Line type="monotone" dataKey="performance" stroke="#f97316" strokeWidth={2} name="Wydajnosc" dot={false} />
                <Line type="monotone" dataKey="quality" stroke="#22c55e" strokeWidth={2} name="Jakosc" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* OEE Gauge */}
        <div className="card-industrial">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Gauge size={20} />
            OEE Chwilowe
          </h2>
          <div className="h-72 flex flex-col items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <RadialBarChart
                  innerRadius="60%"
                  outerRadius="100%"
                  data={gaugeData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center mt-8">
                  <p className={`text-4xl font-bold ${getOEEColor(parseFloat(averageOEE))}`}>
                    {averageOEE}%
                  </p>
                  <p className="text-sm text-muted-foreground">OEE</p>
                </div>
              </div>
            </div>
            <div className="flex justify-around w-full mt-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Cel</p>
                <p className="font-semibold text-green-600">85%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Min</p>
                <p className="font-semibold text-yellow-600">65%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Swiatowy</p>
                <p className="font-semibold text-blue-600">85%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Machines OEE Table */}
      <div className="card-industrial">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Activity size={20} />
          OEE wg maszyn
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-semibold">Maszyna</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Dzial</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Status</th>
                <th className="text-center py-3 px-2 text-sm font-semibold">OEE</th>
                <th className="text-center py-3 px-2 text-sm font-semibold">Dostepnosc</th>
                <th className="text-center py-3 px-2 text-sm font-semibold">Wydajnosc</th>
                <th className="text-center py-3 px-2 text-sm font-semibold">Jakosc</th>
                <th className="text-center py-3 px-2 text-sm font-semibold">Przestoj (h)</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines
                .sort((a, b) => b.oee - a.oee)
                .map(machine => (
                  <tr
                    key={machine.id}
                    className="border-b border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/manager/machines`)}
                  >
                    <td className="py-3 px-2 font-semibold">{machine.name}</td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{machine.department}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(machine.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        {getStatusLabel(machine.status)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-16 h-2 rounded-full bg-muted overflow-hidden`}>
                          <div
                            className={`h-full ${getOEEBgColor(machine.oee)}`}
                            style={{ width: `${machine.oee}%` }}
                          />
                        </div>
                        <span className={`font-bold ${getOEEColor(machine.oee)}`}>{machine.oee}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center text-blue-600 font-medium">{machine.availability}%</td>
                    <td className="py-3 px-2 text-center text-orange-600 font-medium">{machine.performance}%</td>
                    <td className="py-3 px-2 text-center text-green-600 font-medium">{machine.quality}%</td>
                    <td className="py-3 px-2 text-center">
                      <span className={machine.downtime > 6 ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                        {machine.downtime}h
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* World Class OEE Reference */}
      <div className="mt-6 card-industrial bg-muted/30">
        <h3 className="font-semibold mb-3">Wskazniki referencyjne OEE (World Class)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Dostepnosc</p>
            <p className="font-bold text-blue-600">≥ 90%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Wydajnosc</p>
            <p className="font-bold text-orange-600">≥ 95%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Jakosc</p>
            <p className="font-bold text-green-600">≥ 99%</p>
          </div>
          <div>
            <p className="text-muted-foreground">OEE Calkowite</p>
            <p className="font-bold text-purple-600">≥ 85%</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          OEE = Dostepnosc × Wydajnosc × Jakosc. Wartosc 85% uwaana jest za poziom swiatowy dla produkcji dyskretnej.
        </p>
      </div>
    </div>
  );
};

export default OEEDashboard;
