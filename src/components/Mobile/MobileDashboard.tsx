import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { timeTrackingApi, isDemoMode } from '@/utils/api';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  Clock,
  Package,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  User,
  LogOut,
  RefreshCw,
  Loader2,
  Timer,
  Wrench,
  Calendar,
  LogIn
} from 'lucide-react';

interface ActiveSession {
  orderId: number;
  orderNumber: string;
  stageName: string;
  startTime: Date;
  elapsed: number;
}

const MobileDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, orders, logout } = useApp();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Clock in/out state
  const [clockStatus, setClockStatus] = useState<{
    isClockedIn: boolean;
    entryTime: string | null;
  }>({ isClockedIn: false, entryTime: null });
  const [clockLoading, setClockLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load clock status on mount
  useEffect(() => {
    loadClockStatus();
  }, [currentUser]);

  const loadClockStatus = async () => {
    if (!currentUser) return;
    try {
      if (isDemoMode()) {
        const saved = localStorage.getItem('demoClockStatus');
        if (saved) setClockStatus(JSON.parse(saved));
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const response = await timeTrackingApi.getEntries({
        worker_id: currentUser.id,
        start_date: today,
        end_date: today,
      });
      if (response.success && response.data) {
        const open = response.data.find((e: any) => !e.exit_time);
        if (open) {
          setClockStatus({ isClockedIn: true, entryTime: open.entry_time });
        }
      }
    } catch (e) {
      console.error('Failed to load clock status:', e);
    }
  };

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      if (isDemoMode()) {
        const status = { isClockedIn: true, entryTime: new Date().toISOString() };
        setClockStatus(status);
        localStorage.setItem('demoClockStatus', JSON.stringify(status));
        toast.success('Rozpoczęto pracę');
      } else {
        const response = await timeTrackingApi.clockIn();
        if (response.success && response.data) {
          setClockStatus({ isClockedIn: true, entryTime: response.data.entry_time });
          toast.success('Rozpoczęto pracę');
        } else {
          throw new Error(response.error);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Błąd rejestracji');
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    try {
      if (isDemoMode()) {
        setClockStatus({ isClockedIn: false, entryTime: null });
        localStorage.removeItem('demoClockStatus');
        toast.success('Zakończono pracę');
      } else {
        const response = await timeTrackingApi.clockOut();
        if (response.success) {
          setClockStatus({ isClockedIn: false, entryTime: null });
          toast.success('Zakończono pracę');
        } else {
          throw new Error(response.error);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Błąd rejestracji');
    } finally {
      setClockLoading(false);
    }
  };

  const getWorkDuration = () => {
    if (!clockStatus.entryTime) return '0h 00m';
    const diff = currentTime.getTime() - new Date(clockStatus.entryTime).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  // Get worker's assigned orders
  const myOrders = orders.filter(o => {
    if (!o.stages) return false;
    return o.stages.some(s =>
      s.assignedWorkers?.includes(currentUser?.id || 0) &&
      s.status !== 'completed'
    );
  });

  const activeOrders = myOrders.filter(o => o.status === 'W_TRAKCIE');
  const pendingOrders = myOrders.filter(o => o.status === 'NOWE');

  // Timer for active session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => {
        setActiveSession(prev => prev ? {
          ...prev,
          elapsed: Math.floor((Date.now() - prev.startTime.getTime()) / 1000)
        } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession?.startTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'short'
    });
  };

  const handleStartWork = (order: any, stageName: string) => {
    setActiveSession({
      orderId: order.id,
      orderNumber: order.order_number,
      stageName,
      startTime: new Date(),
      elapsed: 0
    });
  };

  const handleStopWork = () => {
    if (activeSession) {
      // Here would be API call to save work session
      alert(`Zapisano ${formatTime(activeSession.elapsed)} pracy na zleceniu ${activeSession.orderNumber}`);
      setActiveSession(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh - in production would reload data from API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleLogout = () => {
    if (activeSession) {
      if (!confirm('Masz aktywną sesję pracy. Czy na pewno chcesz się wylogować?')) {
        return;
      }
    }
    logout();
    navigate('/');
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDeadlineColor = (days: number) => {
    if (days < 0) return 'text-red-600 bg-red-100';
    if (days <= 1) return 'text-orange-600 bg-orange-100';
    if (days <= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <p className="font-semibold">{currentUser?.name}</p>
              <p className="text-xs opacity-75">{currentUser?.department || 'Produkcja'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-full hover:bg-white/10"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-white/10"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Clock In/Out Widget */}
      <div className={`mx-4 mt-4 p-4 rounded-2xl shadow-lg ${clockStatus.isClockedIn ? 'bg-green-600 text-white' : 'bg-card'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${clockStatus.isClockedIn ? 'bg-white/20' : 'bg-muted'}`}>
              <Clock size={24} className={clockStatus.isClockedIn ? 'text-white' : 'text-muted-foreground'} />
            </div>
            <div>
              <p className="text-2xl font-mono font-bold">
                {currentTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {clockStatus.isClockedIn && (
                <p className="text-sm opacity-90">Czas pracy: {getWorkDuration()}</p>
              )}
            </div>
          </div>
          <button
            onClick={clockStatus.isClockedIn ? handleClockOut : handleClockIn}
            disabled={clockLoading}
            className={`px-4 py-3 rounded-xl font-semibold flex items-center gap-2 ${
              clockStatus.isClockedIn
                ? 'bg-white text-green-600'
                : 'bg-green-600 text-white'
            }`}
          >
            {clockLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : clockStatus.isClockedIn ? (
              <>
                <LogOut size={20} />
                Zakończ
              </>
            ) : (
              <>
                <LogIn size={20} />
                Rozpocznij
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Session Card */}
      {activeSession && (
        <div className="mx-4 mt-4 p-4 bg-green-600 text-white rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer className="animate-pulse" size={20} />
              <span className="text-sm font-medium">Aktywna praca</span>
            </div>
            <span className="text-xs opacity-75">{activeSession.orderNumber}</span>
          </div>
          <div className="text-center mb-4">
            <p className="text-4xl font-mono font-bold">{formatTime(activeSession.elapsed)}</p>
            <p className="text-sm opacity-75 mt-1">{activeSession.stageName}</p>
          </div>
          <button
            onClick={handleStopWork}
            className="w-full py-3 bg-white text-green-600 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Pause size={20} />
            Zakończ pracę
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-card p-3 rounded-xl text-center shadow">
          <Package className="mx-auto text-blue-600 mb-1" size={24} />
          <p className="text-2xl font-bold">{myOrders.length}</p>
          <p className="text-xs text-muted-foreground">Przydzielone</p>
        </div>
        <div className="bg-card p-3 rounded-xl text-center shadow">
          <Wrench className="mx-auto text-yellow-600 mb-1" size={24} />
          <p className="text-2xl font-bold">{activeOrders.length}</p>
          <p className="text-xs text-muted-foreground">W trakcie</p>
        </div>
        <div className="bg-card p-3 rounded-xl text-center shadow">
          <Clock className="mx-auto text-green-600 mb-1" size={24} />
          <p className="text-2xl font-bold">{pendingOrders.length}</p>
          <p className="text-xs text-muted-foreground">Oczekujące</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Package size={20} />
          Moje zlecenia
        </h2>

        {myOrders.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center shadow">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
            <p className="text-muted-foreground">Brak przydzielonych zleceń</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myOrders.map(order => {
              const myStage = order.stages?.find(s =>
                s.assignedWorkers?.includes(currentUser?.id || 0) &&
                s.status !== 'completed'
              );
              const daysUntil = getDaysUntilDeadline(order.planned_completion_date);
              const isActiveOrder = activeSession?.orderId === order.id;

              return (
                <div
                  key={order.id}
                  className={`bg-card rounded-xl shadow overflow-hidden ${isActiveOrder ? 'ring-2 ring-green-500' : ''}`}
                >
                  {/* Order Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-mono font-bold text-lg">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{order.client_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDeadlineColor(daysUntil)}`}>
                        {daysUntil < 0 ? `${Math.abs(daysUntil)}d temu` :
                         daysUntil === 0 ? 'Dziś!' :
                         `${daysUntil}d`}
                      </span>
                    </div>

                    <p className="font-medium mb-2">{order.product_name}</p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package size={14} />
                        {order.quantity} {order.unit}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(order.planned_completion_date)}
                      </span>
                    </div>

                    {/* Current Stage */}
                    {myStage && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Twój etap</p>
                            <p className="font-semibold">{order.currentStage || myStage.name}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            myStage.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            myStage.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {myStage.status === 'in_progress' ? 'W trakcie' :
                             myStage.status === 'pending' ? 'Oczekuje' : 'Gotowy'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-border p-3 flex gap-2">
                    {!activeSession ? (
                      <button
                        onClick={() => handleStartWork(order, order.currentStage || 'Produkcja')}
                        className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                      >
                        <Play size={18} />
                        Rozpocznij pracę
                      </button>
                    ) : isActiveOrder ? (
                      <button
                        onClick={handleStopWork}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                      >
                        <Pause size={18} />
                        Zakończ pracę
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl font-semibold flex items-center justify-center gap-2"
                      >
                        <Clock size={18} />
                        Inna sesja aktywna
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/worker/order/${order.id}`)}
                      className="px-4 py-3 bg-muted rounded-xl"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 flex justify-around safe-area-inset-bottom">
        <button className="flex flex-col items-center gap-1 p-2 text-primary">
          <Package size={24} />
          <span className="text-xs font-medium">Zlecenia</span>
        </button>
        <button
          onClick={() => navigate('/worker/history')}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
        >
          <Clock size={24} />
          <span className="text-xs">Historia</span>
        </button>
        <button
          onClick={() => navigate('/worker/profile')}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
        >
          <User size={24} />
          <span className="text-xs">Profil</span>
        </button>
      </div>
    </div>
  );
};

export default MobileDashboard;
