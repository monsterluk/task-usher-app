import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import MyStages from '@/components/Worker/MyStages';
import MyLeaveRequests from '@/components/Worker/MyLeaveRequests';
import MobileDashboard from '@/components/Mobile/MobileDashboard';
import MobileOrderDetail from '@/components/Mobile/MobileOrderDetail';
import MobileHistory from '@/components/Mobile/MobileHistory';
import MobileProfile from '@/components/Mobile/MobileProfile';
import { timeTrackingApi, isDemoMode } from '@/utils/api';
import { toast } from 'sonner';
import {
  Clock,
  Play,
  Pause,
  Square,
  Package,
  ClipboardList,
  History,
  Palmtree,
  User,
  ChevronRight,
  Loader2,
  LogIn,
  LogOut,
  Coffee,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';

// ===================== ENHANCED TIMER COMPONENT =====================
const BigTimer = ({
  isRunning,
  isPaused,
  elapsedSeconds,
  orderNumber,
  stageName,
  workerName,
  onPause,
  onStop,
  onResume
}: {
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  orderNumber?: string;
  stageName?: string;
  workerName?: string;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;
}) => {
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate progress (assuming 4h max for visualization)
  const maxSeconds = 4 * 3600;
  const progress = Math.min((elapsedSeconds / maxSeconds) * 100, 100);

  return (
    <div
      className={`
        relative p-8 rounded-3xl shadow-2xl transition-all duration-500
        ${isRunning && !isPaused
          ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white border-4 border-green-400 animate-timer-pulse'
          : isPaused
            ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white border-4 border-yellow-400'
            : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white border-4 border-slate-600'
        }
      `}
      style={{
        boxShadow: isRunning && !isPaused
          ? '0 0 40px rgba(34, 197, 94, 0.4), 0 0 80px rgba(34, 197, 94, 0.2)'
          : isPaused
            ? '0 0 40px rgba(234, 179, 8, 0.4)'
            : '0 0 20px rgba(0,0,0,0.3)'
      }}
    >
      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Clock size={36} className={isRunning && !isPaused ? 'animate-spin-slow' : ''} />
          <span className="text-6xl md:text-7xl font-mono font-bold tracking-wider">
            {formatTime(elapsedSeconds)}
          </span>
        </div>
        {isPaused && (
          <div className="flex items-center justify-center gap-2 text-yellow-200">
            <Coffee size={20} />
            <span className="text-lg font-semibold animate-pulse">PRZERWA</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-4 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-sm opacity-75">
          <span>{Math.round(progress)}%</span>
          <span>{formatTime(maxSeconds)}</span>
        </div>
      </div>

      {/* Order Info */}
      {orderNumber && (
        <div className="text-center mb-6 p-4 bg-white/10 rounded-xl backdrop-blur">
          <div className="flex items-center justify-center gap-2 text-lg">
            <Package size={20} />
            <span className="font-bold">Zlecenie #{orderNumber}</span>
            {stageName && <span className="opacity-75">- {stageName}</span>}
          </div>
          {workerName && (
            <div className="flex items-center justify-center gap-2 mt-2 opacity-75">
              <User size={16} />
              <span>{workerName}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isRunning && (
        <div className="flex gap-4 justify-center">
          {isPaused ? (
            <button
              onClick={onResume}
              className="flex items-center gap-2 px-8 py-4 bg-white text-green-600 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all hover:scale-105 shadow-lg"
            >
              <Play size={24} />
              WZNÓW
            </button>
          ) : (
            <>
              <button
                onClick={onPause}
                className="flex items-center gap-2 px-6 py-4 bg-white/20 hover:bg-white/30 rounded-2xl font-bold text-lg transition-all hover:scale-105"
              >
                <Pause size={24} />
                PAUZA
              </button>
              <button
                onClick={onStop}
                className="flex items-center gap-2 px-6 py-4 bg-red-500/80 hover:bg-red-500 rounded-2xl font-bold text-lg transition-all hover:scale-105"
              >
                <Square size={24} />
                STOP
              </button>
            </>
          )}
        </div>
      )}

      {/* Not running state */}
      {!isRunning && (
        <div className="text-center opacity-75">
          <p>Wybierz zlecenie aby rozpocząć pracę</p>
        </div>
      )}
    </div>
  );
};

// ===================== DAY PROGRESS COMPONENT =====================
const DayProgress = ({ workedMinutes, targetMinutes = 480 }: { workedMinutes: number; targetMinutes?: number }) => {
  const progress = Math.min((workedMinutes / targetMinutes) * 100, 100);
  const hours = Math.floor(workedMinutes / 60);
  const mins = workedMinutes % 60;
  const targetHours = targetMinutes / 60;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Zap className="text-yellow-500" size={20} />
          Dzisiejszy postęp
        </h3>
        <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            progress >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
            progress >= 75 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
            progress >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
            'bg-gradient-to-r from-orange-500 to-red-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Zrobione: <strong className="text-foreground">{hours}h {mins.toString().padStart(2, '0')}m</strong></span>
        <span>Cel: <strong className="text-foreground">{targetHours}h</strong></span>
      </div>
    </div>
  );
};

// ===================== QUICK ACTIONS COMPONENT =====================
const QuickActions = ({
  onStartOrder,
  onViewOrders,
  onViewHistory,
  onRequestLeave
}: {
  onStartOrder: () => void;
  onViewOrders: () => void;
  onViewHistory: () => void;
  onRequestLeave: () => void;
}) => {
  const actions = [
    { icon: Play, label: 'Start zlecenia', color: 'bg-green-500 hover:bg-green-600', onClick: onStartOrder },
    { icon: ClipboardList, label: 'Moje zlecenia', color: 'bg-blue-500 hover:bg-blue-600', onClick: onViewOrders },
    { icon: History, label: 'Historia', color: 'bg-purple-500 hover:bg-purple-600', onClick: onViewHistory },
    { icon: Palmtree, label: 'Urlop', color: 'bg-orange-500 hover:bg-orange-600', onClick: onRequestLeave },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map(({ icon: Icon, label, color, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className={`${color} text-white p-4 rounded-2xl shadow-lg transition-all hover:scale-105 hover:shadow-xl flex flex-col items-center gap-2`}
        >
          <Icon size={32} />
          <span className="font-semibold">{label}</span>
        </button>
      ))}
    </div>
  );
};

// ===================== ORDER CARD COMPONENT =====================
const OrderCard = ({
  order,
  onStart,
  isActive,
  disabled
}: {
  order: any;
  onStart: () => void;
  isActive: boolean;
  disabled: boolean;
}) => {
  const getDaysUntil = (date: string) => {
    const deadline = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const days = getDaysUntil(order.planned_completion_date);
  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days <= 2;

  return (
    <div
      className={`
        bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden transition-all
        ${isActive ? 'ring-4 ring-green-500 shadow-green-200' : ''}
        ${isOverdue ? 'border-l-4 border-red-500' : isUrgent ? 'border-l-4 border-orange-500' : 'border-l-4 border-blue-500'}
      `}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">
              #{order.order_number}
            </span>
            <p className="text-sm text-muted-foreground">{order.client_name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            isOverdue ? 'bg-red-100 text-red-700' :
            isUrgent ? 'bg-orange-100 text-orange-700' :
            'bg-green-100 text-green-700'
          }`}>
            {isOverdue ? `${Math.abs(days)}d temu` :
             days === 0 ? 'Dziś!' :
             `${days} dni`}
          </span>
        </div>

        <h4 className="font-semibold mb-2">{order.product_name}</h4>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Package size={14} />
            {order.quantity} szt.
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            order.status === 'NOWE' ? 'bg-amber-100 text-amber-800' :
            order.status === 'W_TRAKCIE' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          }`}>
            {order.status === 'NOWE' ? 'Oczekujące' :
             order.status === 'W_TRAKCIE' ? 'W trakcie' : 'Gotowe'}
          </span>
        </div>

        {order.currentStage && (
          <div className="p-3 bg-muted rounded-lg mb-3">
            <p className="text-xs text-muted-foreground">Aktualny etap</p>
            <p className="font-semibold">{order.currentStage}</p>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <button
          onClick={onStart}
          disabled={disabled}
          className={`w-full py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            isActive
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white hover:scale-[1.02]'
          }`}
        >
          {isActive ? (
            <>
              <Square size={20} />
              Zakończ pracę
            </>
          ) : disabled ? (
            <>
              <Clock size={20} />
              Inna sesja aktywna
            </>
          ) : (
            <>
              <Play size={20} />
              Rozpocznij pracę
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ===================== ENHANCED WORKER PANEL =====================
const WorkerPanel = () => {
  const navigate = useNavigate();
  const { currentUser, orders } = useApp();
  const [activeSession, setActiveSession] = useState<{
    orderId: number;
    orderNumber: string;
    stageName: string;
    startTime: Date;
    elapsed: number;
    isPaused: boolean;
    pauseTime?: Date;
    totalPausedSeconds: number;
  } | null>(null);

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

  // Load clock status
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
      const entries = Array.isArray(response) ? response : (response.data || []);
      if (entries.length > 0) {
        const open = entries.find((e: any) => !e.exit_time);
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
        const entry = response.data || response;
        if (entry && entry.id) {
          setClockStatus({ isClockedIn: true, entryTime: entry.entry_time });
          toast.success('Rozpoczęto pracę');
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
        setClockStatus({ isClockedIn: false, entryTime: null });
        toast.success('Zakończono pracę');
      }
    } catch (e: any) {
      toast.error(e.message || 'Błąd rejestracji');
    } finally {
      setClockLoading(false);
    }
  };

  // Timer for active session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && !activeSession.isPaused) {
      interval = setInterval(() => {
        setActiveSession(prev => prev ? {
          ...prev,
          elapsed: Math.floor((Date.now() - prev.startTime.getTime()) / 1000) - prev.totalPausedSeconds
        } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession?.startTime, activeSession?.isPaused, activeSession?.totalPausedSeconds]);

  // Get worker's assigned orders
  const myOrders = orders.filter(o => {
    if (!o.stages) return false;
    return o.stages.some(s =>
      s.assignedWorkers?.includes(currentUser?.id || 0) &&
      s.status !== 'completed'
    );
  });

  // Calculate worked minutes today
  const getWorkedMinutes = () => {
    if (!clockStatus.entryTime) return 0;
    const diff = currentTime.getTime() - new Date(clockStatus.entryTime).getTime();
    return Math.floor(diff / 60000);
  };

  const handleStartWork = (order: any) => {
    setActiveSession({
      orderId: order.id,
      orderNumber: order.order_number,
      stageName: order.currentStage || 'Produkcja',
      startTime: new Date(),
      elapsed: 0,
      isPaused: false,
      totalPausedSeconds: 0
    });
  };

  const handlePause = () => {
    if (activeSession) {
      setActiveSession({
        ...activeSession,
        isPaused: true,
        pauseTime: new Date()
      });
      toast.info('Przerwa rozpoczęta');
    }
  };

  const handleResume = () => {
    if (activeSession && activeSession.pauseTime) {
      const pauseDuration = Math.floor((Date.now() - activeSession.pauseTime.getTime()) / 1000);
      setActiveSession({
        ...activeSession,
        isPaused: false,
        pauseTime: undefined,
        totalPausedSeconds: activeSession.totalPausedSeconds + pauseDuration
      });
      toast.success('Praca wznowiona');
    }
  };

  const handleStop = () => {
    if (activeSession) {
      const mins = Math.floor(activeSession.elapsed / 60);
      toast.success(`Zapisano ${mins} minut pracy na zleceniu #${activeSession.orderNumber}`);
      setActiveSession(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header with Clock In/Out */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="text-primary" size={32} />
            Witaj, {currentUser?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            {currentTime.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <button
          onClick={clockStatus.isClockedIn ? handleClockOut : handleClockIn}
          disabled={clockLoading}
          className={`px-6 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all hover:scale-105 shadow-lg ${
            clockStatus.isClockedIn
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {clockLoading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : clockStatus.isClockedIn ? (
            <>
              <LogOut size={24} />
              Zakończ dzień
            </>
          ) : (
            <>
              <LogIn size={24} />
              Rozpocznij dzień
            </>
          )}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Timer */}
        <div className="lg:col-span-2 space-y-6">
          <BigTimer
            isRunning={!!activeSession}
            isPaused={activeSession?.isPaused || false}
            elapsedSeconds={activeSession?.elapsed || 0}
            orderNumber={activeSession?.orderNumber}
            stageName={activeSession?.stageName}
            workerName={currentUser?.name}
            onPause={handlePause}
            onStop={handleStop}
            onResume={handleResume}
          />

          {/* Day Progress */}
          <DayProgress workedMinutes={getWorkedMinutes()} />

          {/* Quick Actions */}
          <QuickActions
            onStartOrder={() => document.getElementById('orders-section')?.scrollIntoView({ behavior: 'smooth' })}
            onViewOrders={() => navigate('/worker/stages')}
            onViewHistory={() => navigate('/worker/history')}
            onRequestLeave={() => navigate('/worker/leave')}
          />
        </div>

        {/* Right Column - Orders */}
        <div id="orders-section" className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package size={24} className="text-primary" />
            Moje zlecenia ({myOrders.length})
          </h2>

          {myOrders.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-lg">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">Brak przydzielonych zleceń</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {myOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isActive={activeSession?.orderId === order.id}
                  disabled={!!activeSession && activeSession.orderId !== order.id}
                  onStart={() => {
                    if (activeSession?.orderId === order.id) {
                      handleStop();
                    } else {
                      handleStartWork(order);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===================== MAIN COMPONENT =====================
const WorkerDashboard = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Allow PRACOWNIK and ADMIN to access this dashboard
  const hasAccess = currentUser && (currentUser.role === 'PRACOWNIK' || currentUser.role === 'ADMIN');

  useEffect(() => {
    if (!hasAccess) {
      navigate('/login');
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) {
    return null;
  }

  // Mobile PWA interface
  if (isMobile) {
    return (
      <Routes>
        <Route path="/" element={<MobileDashboard />} />
        <Route path="order/:id" element={<MobileOrderDetail />} />
        <Route path="history" element={<MobileHistory />} />
        <Route path="profile" element={<MobileProfile />} />
        <Route path="stages" element={<MobileDashboard />} />
        <Route path="*" element={<Navigate to="/worker" replace />} />
      </Routes>
    );
  }

  // Desktop interface - New enhanced panel
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<WorkerPanel />} />
          <Route path="stages" element={<MyStages />} />
          <Route path="history" element={<MobileHistory />} />
          <Route path="leave" element={<MyLeaveRequests />} />
          <Route path="*" element={<Navigate to="/worker" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default WorkerDashboard;
