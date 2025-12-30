import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wrench,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Plus,
  Filter,
  Settings,
  Loader2,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { maintenanceApi, isDemoMode } from '@/utils/api';

interface MaintenanceSchedule {
  id: number;
  machine_id: number;
  machine_name: string;
  department: string;
  maintenance_type: 'preventive' | 'corrective' | 'predictive' | 'inspection';
  title: string;
  description?: string;
  frequency_days?: number;
  next_due_at: string;
  last_performed_at?: string;
  estimated_duration_hours?: number;
  assigned_to_name?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
}

interface MaintenanceStats {
  scheduled: number;
  in_progress: number;
  overdue: number;
  due_now: number;
}

const MaintenanceDashboard = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'in_progress'>('upcoming');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    machine_name: '',
    maintenance_type: 'preventive' as 'preventive' | 'corrective' | 'predictive' | 'inspection',
    title: '',
    description: '',
    frequency_days: 30,
    priority: 'normal' as 'low' | 'normal' | 'high' | 'critical'
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    if (isDemoMode()) {
      // Demo data
      setSchedules([
        {
          id: 1,
          machine_id: 1,
          machine_name: 'CNC Router 1',
          department: 'Frezowanie',
          maintenance_type: 'preventive',
          title: 'Przeglad miesięczny',
          description: 'Wymiana oleju, sprawdzenie łożysk',
          frequency_days: 30,
          next_due_at: new Date(Date.now() + 86400000 * 2).toISOString(),
          last_performed_at: new Date(Date.now() - 86400000 * 28).toISOString(),
          estimated_duration_hours: 2,
          assigned_to_name: 'Jan Kowalski',
          priority: 'normal',
          status: 'scheduled',
        },
        {
          id: 2,
          machine_id: 3,
          machine_name: 'Laser CO2',
          department: 'Ciecie',
          maintenance_type: 'preventive',
          title: 'Czyszczenie optyki',
          description: 'Czyszczenie soczewek i luster',
          frequency_days: 7,
          next_due_at: new Date(Date.now() - 86400000).toISOString(),
          estimated_duration_hours: 1,
          priority: 'high',
          status: 'overdue',
        },
        {
          id: 3,
          machine_id: 4,
          machine_name: 'Giętarka',
          department: 'Giecie',
          maintenance_type: 'corrective',
          title: 'Naprawa silnika',
          description: 'Wymiana łożysk silnika głównego',
          estimated_duration_hours: 4,
          assigned_to_name: 'Piotr Wisniewski',
          priority: 'critical',
          status: 'in_progress',
          next_due_at: new Date().toISOString(),
        },
        {
          id: 4,
          machine_id: 2,
          machine_name: 'CNC Router 2',
          department: 'Frezowanie',
          maintenance_type: 'inspection',
          title: 'Inspekcja kwartalna',
          frequency_days: 90,
          next_due_at: new Date(Date.now() + 86400000 * 15).toISOString(),
          estimated_duration_hours: 3,
          priority: 'low',
          status: 'scheduled',
        },
      ]);
      setStats({
        scheduled: 8,
        in_progress: 1,
        overdue: 2,
        due_now: 3,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const filters: any = {};
      if (filter === 'upcoming') filters.upcoming_days = 14;
      if (filter === 'overdue') filters.status = 'overdue';
      if (filter === 'in_progress') filters.status = 'in_progress';

      const response = await maintenanceApi.getSchedules(filters);
      setSchedules(response.data.schedules);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Zaplanowana';
      case 'in_progress': return 'W trakcie';
      case 'completed': return 'Wykonana';
      case 'overdue': return 'Przeterminowana';
      case 'cancelled': return 'Anulowana';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'normal': return 'border-l-blue-500';
      case 'low': return 'border-l-gray-400';
      default: return 'border-l-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'preventive': return 'Prewencyjna';
      case 'corrective': return 'Korekcyjna';
      case 'predictive': return 'Predykcyjna';
      case 'inspection': return 'Inspekcja';
      default: return type;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

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
          <button
            onClick={() => navigate('/manager')}
            className="btn-secondary"
          >
            <ArrowLeft size={18} className="mr-2" />
            Dashboard
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">Konserwacja TPM</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} className="mr-2" />
            Dodaj harmonogram
          </button>
        </div>
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nowy harmonogram konserwacji</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Maszyna</label>
                <input
                  type="text"
                  value={newSchedule.machine_name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, machine_name: e.target.value })}
                  className="input-industrial w-full"
                  placeholder="np. CNC Router 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tytul</label>
                <input
                  type="text"
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  className="input-industrial w-full"
                  placeholder="np. Przeglad miesięczny"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Typ konserwacji</label>
                  <select
                    value={newSchedule.maintenance_type}
                    onChange={(e) => setNewSchedule({ ...newSchedule, maintenance_type: e.target.value as any })}
                    className="input-industrial w-full"
                  >
                    <option value="preventive">Prewencyjna</option>
                    <option value="corrective">Korygujaca</option>
                    <option value="predictive">Predykcyjna</option>
                    <option value="inspection">Inspekcja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priorytet</label>
                  <select
                    value={newSchedule.priority}
                    onChange={(e) => setNewSchedule({ ...newSchedule, priority: e.target.value as any })}
                    className="input-industrial w-full"
                  >
                    <option value="low">Niski</option>
                    <option value="normal">Normalny</option>
                    <option value="high">Wysoki</option>
                    <option value="critical">Krytyczny</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Czestotliwosc (dni)</label>
                <input
                  type="number"
                  value={newSchedule.frequency_days}
                  onChange={(e) => setNewSchedule({ ...newSchedule, frequency_days: parseInt(e.target.value) || 30 })}
                  className="input-industrial w-full"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Opis</label>
                <textarea
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  className="input-industrial w-full"
                  rows={3}
                  placeholder="Opis czynnosci do wykonania..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  // TODO: Save to API
                  console.log('New schedule:', newSchedule);
                  setShowAddModal(false);
                  setNewSchedule({ machine_name: '', maintenance_type: 'preventive', title: '', description: '', frequency_days: 30, priority: 'normal' });
                }}
                className="btn-primary flex-1"
              >
                Dodaj harmonogram
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="card-industrial">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Zaplanowane</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="card-industrial">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">W trakcie</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
              </div>
              <Settings className="text-yellow-600 animate-spin-slow" size={24} />
            </div>
          </div>
          <div className="card-industrial">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Przeterminowane</p>
                <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.overdue}
                </p>
              </div>
              <AlertTriangle className={stats.overdue > 0 ? 'text-red-600' : 'text-green-600'} size={24} />
            </div>
          </div>
          <div className="card-industrial">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Do wykonania</p>
                <p className="text-2xl font-bold text-orange-600">{stats.due_now}</p>
              </div>
              <Clock className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['upcoming', 'all', 'overdue', 'in_progress'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {f === 'all' ? 'Wszystkie' :
             f === 'upcoming' ? 'Nadchodzace (14 dni)' :
             f === 'overdue' ? 'Przeterminowane' : 'W trakcie'}
          </button>
        ))}
      </div>

      {/* Schedules List */}
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <div className="card-industrial text-center py-12">
            <Wrench size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Brak harmonogramów konserwacji</p>
          </div>
        ) : (
          schedules.map(schedule => {
            const daysUntil = getDaysUntilDue(schedule.next_due_at);
            return (
              <div
                key={schedule.id}
                className={`card-industrial border-l-4 ${getPriorityColor(schedule.priority)} hover:shadow-lg transition-shadow cursor-pointer`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(schedule.status)}`}>
                        {getStatusLabel(schedule.status)}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {getTypeLabel(schedule.maintenance_type)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{schedule.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      <Wrench size={14} className="inline mr-1" />
                      {schedule.machine_name} • {schedule.department}
                    </p>
                    {schedule.description && (
                      <p className="text-sm text-muted-foreground mt-1">{schedule.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Due date */}
                    <div className="text-center min-w-[80px]">
                      <p className="text-xs text-muted-foreground">Termin</p>
                      <p className={`font-semibold ${
                        daysUntil < 0 ? 'text-red-600' :
                        daysUntil <= 3 ? 'text-orange-600' :
                        'text-foreground'
                      }`}>
                        {daysUntil < 0 ? `${Math.abs(daysUntil)} dni temu` :
                         daysUntil === 0 ? 'Dzisiaj' :
                         `za ${daysUntil} dni`}
                      </p>
                    </div>

                    {/* Duration */}
                    {schedule.estimated_duration_hours && (
                      <div className="text-center min-w-[60px]">
                        <p className="text-xs text-muted-foreground">Czas</p>
                        <p className="font-semibold">{schedule.estimated_duration_hours}h</p>
                      </div>
                    )}

                    {/* Assigned */}
                    {schedule.assigned_to_name && (
                      <div className="text-center min-w-[80px]">
                        <p className="text-xs text-muted-foreground">Przypisany</p>
                        <p className="text-sm">{schedule.assigned_to_name}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {schedule.status === 'scheduled' && (
                        <button className="btn-primary py-2 px-3">
                          <Play size={16} className="mr-1" />
                          Rozpocznij
                        </button>
                      )}
                      {schedule.status === 'in_progress' && (
                        <button className="btn-primary bg-green-600 hover:bg-green-700 py-2 px-3">
                          <CheckCircle2 size={16} className="mr-1" />
                          Zakoncz
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Frequency info */}
                {schedule.frequency_days && (
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    <span>Powtarza sie co {schedule.frequency_days} dni</span>
                    {schedule.last_performed_at && (
                      <span className="ml-4">
                        Ostatnio: {new Date(schedule.last_performed_at).toLocaleDateString('pl-PL')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 card-industrial bg-muted/30">
        <h3 className="font-semibold mb-3">Legenda priorytetów</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-red-500 rounded"></div>
            <span>Krytyczny</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-orange-500 rounded"></div>
            <span>Wysoki</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded"></div>
            <span>Normalny</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-gray-400 rounded"></div>
            <span>Niski</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
