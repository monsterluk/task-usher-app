import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  Clock,
  Package,
  Calendar,
  TrendingUp,
  ChevronRight,
  Filter,
  Loader2,
  BarChart3
} from 'lucide-react';

interface WorkSession {
  id: number;
  orderId: number;
  orderNumber: string;
  stageName: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  date: string;
}

const MobileHistory = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'month'>('week');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [filter]);

  const loadHistory = async () => {
    // Demo data - in production would fetch from API
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const demoSessions: WorkSession[] = [
      {
        id: 1,
        orderId: 1,
        orderNumber: 'ZL-2024-001',
        stageName: 'Ciecie CNC',
        startTime: '08:00',
        endTime: '11:30',
        duration: 210,
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 2,
        orderId: 1,
        orderNumber: 'ZL-2024-001',
        stageName: 'Gięcie',
        startTime: '12:00',
        endTime: '14:15',
        duration: 135,
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 3,
        orderId: 2,
        orderNumber: 'ZL-2024-002',
        stageName: 'Montaz',
        startTime: '14:30',
        endTime: '16:00',
        duration: 90,
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 4,
        orderId: 3,
        orderNumber: 'ZL-2024-003',
        stageName: 'Ciecie CNC',
        startTime: '08:30',
        endTime: '12:00',
        duration: 210,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
      },
      {
        id: 5,
        orderId: 3,
        orderNumber: 'ZL-2024-003',
        stageName: 'Polerowanie',
        startTime: '13:00',
        endTime: '15:30',
        duration: 150,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
      },
      {
        id: 6,
        orderId: 4,
        orderNumber: 'ZL-2024-004',
        stageName: 'Kontrola jakosci',
        startTime: '09:00',
        endTime: '10:30',
        duration: 90,
        date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0]
      }
    ];

    setSessions(demoSessions);
    setLoading(false);
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    return `${h}h ${m}min`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);

    if (date.toDateString() === today.toDateString()) {
      return 'Dzisiaj';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Wczoraj';
    }
    return date.toLocaleDateString('pl-PL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc, session) => {
    if (!acc[session.date]) {
      acc[session.date] = [];
    }
    acc[session.date].push(session);
    return acc;
  }, {} as Record<string, WorkSession[]>);

  // Calculate totals
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalDays = Object.keys(groupedSessions).length;
  const avgPerDay = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

  const filterLabels = {
    today: 'Dzis',
    week: 'Tydzien',
    month: 'Miesiac'
  };

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/worker')}
              className="p-2 -ml-2 rounded-full hover:bg-white/10"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <p className="font-bold text-lg">Historia pracy</p>
              <p className="text-sm opacity-75">{currentUser?.name}</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg text-sm"
            >
              <Filter size={16} />
              {filterLabels[filter]}
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 bg-card rounded-lg shadow-lg overflow-hidden z-20">
                {Object.entries(filterLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setFilter(key as 'today' | 'week' | 'month');
                      setShowFilterMenu(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-muted ${
                      filter === key ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-card p-3 rounded-xl text-center shadow">
          <Clock className="mx-auto text-blue-600 mb-1" size={24} />
          <p className="text-xl font-bold">{formatDuration(totalMinutes)}</p>
          <p className="text-xs text-muted-foreground">Lacznie</p>
        </div>
        <div className="bg-card p-3 rounded-xl text-center shadow">
          <Calendar className="mx-auto text-green-600 mb-1" size={24} />
          <p className="text-xl font-bold">{totalDays}</p>
          <p className="text-xs text-muted-foreground">Dni</p>
        </div>
        <div className="bg-card p-3 rounded-xl text-center shadow">
          <TrendingUp className="mx-auto text-purple-600 mb-1" size={24} />
          <p className="text-xl font-bold">{formatDuration(avgPerDay)}</p>
          <p className="text-xs text-muted-foreground">Srednia/dzien</p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin mr-2" size={24} />
            <span>Ladowanie historii...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center shadow">
            <BarChart3 size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Brak zarejestrowanych sesji</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSessions)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, daySessions]) => {
                const dayTotal = daySessions.reduce((sum, s) => sum + s.duration, 0);
                return (
                  <div key={date}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm">{formatDate(date)}</h3>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(dayTotal)}
                      </span>
                    </div>
                    <div className="bg-card rounded-xl shadow overflow-hidden">
                      {daySessions.map((session, index) => (
                        <div
                          key={session.id}
                          className={`p-3 flex items-center gap-3 ${
                            index !== daySessions.length - 1 ? 'border-b border-border' : ''
                          }`}
                          onClick={() => navigate(`/worker/order/${session.orderId}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">
                                {session.orderNumber}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                {session.stageName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {session.startTime} - {session.endTime}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {formatDuration(session.duration)}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 flex justify-around safe-area-inset-bottom">
        <button
          onClick={() => navigate('/worker')}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
        >
          <Package size={24} />
          <span className="text-xs">Zlecenia</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 text-primary">
          <Clock size={24} />
          <span className="text-xs font-medium">Historia</span>
        </button>
        <button
          onClick={() => navigate('/worker/profile')}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
        >
          <Calendar size={24} />
          <span className="text-xs">Profil</span>
        </button>
      </div>
    </div>
  );
};

export default MobileHistory;
