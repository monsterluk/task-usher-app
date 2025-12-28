import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { WorkSession, Order } from '@/types';
import {
  Clock,
  CheckCircle,
  Play,
  Pause,
  Coffee,
  LogOut,
  Package,
  Timer as TimerIcon,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ===================== WORK SESSION TIMER =====================
const WorkTimer = ({ session, onUpdate }: { session: WorkSession; onUpdate: (s: WorkSession) => void }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total worked time (excluding breaks)
  const calculateWorkedTime = (sess: WorkSession): number => {
    if (!sess.startTime) return 0;

    const start = new Date(sess.startTime).getTime();
    const now = sess.endTime ? new Date(sess.endTime).getTime() : Date.now();
    let total = now - start;

    // Subtract break time
    sess.breaks.forEach(br => {
      const breakStart = new Date(br.start).getTime();
      const breakEnd = br.end ? new Date(br.end).getTime() : Date.now();
      total -= (breakEnd - breakStart);
    });

    return Math.max(0, Math.floor(total / 1000));
  };

  useEffect(() => {
    if (session.status === 'active') {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calculateWorkedTime(session));
      }, 1000);
    } else {
      setElapsedSeconds(calculateWorkedTime(session));
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isOnBreak = session.breaks.some(b => !b.end);

  return (
    <div className={`timer-display ${session.status === 'active' && !isOnBreak ? 'animate-pulse-slow text-success' : ''} ${isOnBreak ? 'text-warning' : ''}`}>
      {formatTime(elapsedSeconds)}
      {isOnBreak && <span className="text-sm block text-warning">PRZERWA</span>}
    </div>
  );
};

// ===================== QUANTITY INPUT MODAL =====================
const QuantityModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  maxQuantity,
  currentDone
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (qty: number) => void;
  title: string;
  maxQuantity: number;
  currentDone: number;
}) => {
  const [quantity, setQuantity] = useState(currentDone);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Ile sztuk zrobiłeś/aś? (max: {maxQuantity})
          </label>
          <input
            type="number"
            min="0"
            max={maxQuantity}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(0, parseInt(e.target.value) || 0)))}
            className="input-industrial w-full text-2xl text-center"
          />
          <div className="flex gap-2 mt-2">
            {[10, 50, 100].filter(n => n <= maxQuantity).map(n => (
              <button
                key={n}
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + n))}
                className="btn-secondary flex-1 py-1 text-sm"
              >
                +{n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Anuluj
          </button>
          <button onClick={() => onSubmit(quantity)} className="btn-primary flex-1">
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================== MAIN COMPONENT =====================
const MyStages = () => {
  const { currentUser, orders, workSessions, setWorkSessions, workers } = useApp();
  const [quantityModal, setQuantityModal] = useState<{
    isOpen: boolean;
    sessionId: string;
    action: 'pause' | 'end' | 'complete';
    orderId: number;
    maxQuantity: number;
    currentDone: number;
  } | null>(null);

  if (!currentUser) return null;

  // Get active work sessions for current worker
  const myWorkSessions = workSessions.filter(ws => ws.workerId === currentUser.id);
  const activeSession = myWorkSessions.find(ws => ws.status === 'active' || ws.status === 'paused');

  // Get assigned stages for this worker from orders
  const getMyAssignedStages = () => {
    const assigned: { order: Order; stageId: number; stageName: string }[] = [];

    orders.forEach(order => {
      if (order.archived || order.status === 'GOTOWE') return;

      order.stages?.forEach(stage => {
        if (stage.assignedWorkers.includes(currentUser.id) && stage.status !== 'completed') {
          assigned.push({
            order,
            stageId: stage.stageId,
            stageName: stage.stageName
          });
        }
      });
    });

    return assigned;
  };

  const myAssignedStages = getMyAssignedStages();

  // Start work on a stage
  const startWork = (orderId: number, stageId: number) => {
    if (activeSession) {
      toast({ title: "Uwaga", description: "Najpierw zakończ aktualną pracę", variant: "destructive" });
      return;
    }

    const newSession: WorkSession = {
      id: `ws_${Date.now()}`,
      workerId: currentUser.id,
      orderId,
      stageId,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      endTime: null,
      breaks: [],
      quantityDone: 0,
      status: 'active'
    };

    setWorkSessions(prev => [...prev, newSession]);
    toast({ title: "Start pracy", description: "Rozpoczęto sesję pracy" });
  };

  // Start break
  const startBreak = (sessionId: string) => {
    setWorkSessions(prev => prev.map(ws => {
      if (ws.id === sessionId) {
        return {
          ...ws,
          status: 'paused',
          breaks: [...ws.breaks, { start: new Date().toISOString(), end: null }]
        };
      }
      return ws;
    }));
    toast({ title: "Przerwa", description: "Rozpoczęto przerwę" });
  };

  // End break
  const endBreak = (sessionId: string) => {
    setWorkSessions(prev => prev.map(ws => {
      if (ws.id === sessionId) {
        const updatedBreaks = ws.breaks.map((br, idx) => {
          if (idx === ws.breaks.length - 1 && !br.end) {
            return { ...br, end: new Date().toISOString() };
          }
          return br;
        });
        return {
          ...ws,
          status: 'active',
          breaks: updatedBreaks
        };
      }
      return ws;
    }));
    toast({ title: "Koniec przerwy", description: "Wracam do pracy" });
  };

  // Open quantity modal for pause/end
  const openQuantityModal = (sessionId: string, action: 'pause' | 'end' | 'complete', orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    const session = workSessions.find(ws => ws.id === sessionId);

    setQuantityModal({
      isOpen: true,
      sessionId,
      action,
      orderId,
      maxQuantity: order?.quantity || 1000,
      currentDone: session?.quantityDone || 0
    });
  };

  // End day (save progress but can continue tomorrow)
  const endDay = (sessionId: string, quantity: number) => {
    setWorkSessions(prev => prev.map(ws => {
      if (ws.id === sessionId) {
        // End any ongoing break
        const updatedBreaks = ws.breaks.map(br => {
          if (!br.end) {
            return { ...br, end: new Date().toISOString() };
          }
          return br;
        });
        return {
          ...ws,
          endTime: new Date().toISOString(),
          breaks: updatedBreaks,
          quantityDone: quantity,
          status: 'completed'
        };
      }
      return ws;
    }));
    setQuantityModal(null);
    toast({ title: "Koniec dnia", description: `Zapisano postęp: ${quantity} szt.` });
  };

  // Complete stage
  const completeStage = (sessionId: string, quantity: number, orderId: number, stageId: number) => {
    // End the session
    endDay(sessionId, quantity);

    // Mark stage as completed in order
    // This would typically be done through AppContext, but for now we'll just show a message
    toast({
      title: "Etap zakończony",
      description: `Ukończono etap. Zrobiono: ${quantity} szt.`
    });
  };

  // Handle modal submit
  const handleQuantitySubmit = (quantity: number) => {
    if (!quantityModal) return;

    if (quantityModal.action === 'end' || quantityModal.action === 'pause') {
      endDay(quantityModal.sessionId, quantity);
    } else if (quantityModal.action === 'complete') {
      const session = workSessions.find(ws => ws.id === quantityModal.sessionId);
      if (session) {
        completeStage(quantityModal.sessionId, quantity, session.orderId, session.stageId);
      }
    }
  };

  // Calculate total worked time today
  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = myWorkSessions.filter(ws => ws.date === today);

    let totalSeconds = 0;
    let totalBreakSeconds = 0;
    let totalQuantity = 0;

    todaySessions.forEach(sess => {
      if (!sess.startTime) return;

      const start = new Date(sess.startTime).getTime();
      const end = sess.endTime ? new Date(sess.endTime).getTime() : Date.now();
      let workTime = end - start;

      sess.breaks.forEach(br => {
        const breakStart = new Date(br.start).getTime();
        const breakEnd = br.end ? new Date(br.end).getTime() : Date.now();
        const breakDuration = breakEnd - breakStart;
        totalBreakSeconds += Math.floor(breakDuration / 1000);
        workTime -= breakDuration;
      });

      totalSeconds += Math.floor(workTime / 1000);
      totalQuantity += sess.quantityDone;
    });

    return { totalSeconds: Math.max(0, totalSeconds), totalBreakSeconds, totalQuantity, sessionsCount: todaySessions.length };
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}min`;
  };

  const todayStats = getTodayStats();

  // Get order details for a session
  const getOrderForSession = (orderId: number) => orders.find(o => o.id === orderId);
  const getStageNameForSession = (orderId: number, stageId: number) => {
    const order = orders.find(o => o.id === orderId);
    return order?.stages?.find(s => s.stageId === stageId)?.stageName || 'Nieznany etap';
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-3">
        <Clock size={28} />
        Mój Dzień Pracy
      </h1>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card-industrial p-3">
          <p className="text-sm text-muted-foreground">Przepracowano</p>
          <p className="text-xl font-bold text-primary">{formatDuration(todayStats.totalSeconds)}</p>
        </div>
        <div className="card-industrial p-3">
          <p className="text-sm text-muted-foreground">Przerwy</p>
          <p className="text-xl font-bold text-warning">{formatDuration(todayStats.totalBreakSeconds)}</p>
        </div>
        <div className="card-industrial p-3">
          <p className="text-sm text-muted-foreground">Zrobiono</p>
          <p className="text-xl font-bold text-success">{todayStats.totalQuantity} szt.</p>
        </div>
        <div className="card-industrial p-3">
          <p className="text-sm text-muted-foreground">Sesji</p>
          <p className="text-xl font-bold">{todayStats.sessionsCount}</p>
        </div>
      </div>

      {/* Active Session */}
      {activeSession && (
        <div className="card-industrial border-2 border-primary mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${activeSession.status === 'active' && !activeSession.breaks.some(b => !b.end) ? 'bg-success animate-pulse' : 'bg-warning'}`}></div>
            <h2 className="text-lg font-bold">
              {activeSession.status === 'active' && !activeSession.breaks.some(b => !b.end) ? 'Pracuję teraz' : 'Na przerwie'}
            </h2>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg mb-4">
            <p className="font-semibold text-lg">
              Zlecenie: {getOrderForSession(activeSession.orderId)?.order_number}
            </p>
            <p className="text-muted-foreground">
              {getOrderForSession(activeSession.orderId)?.product_name}
            </p>
            <p className="text-sm mt-1">
              Etap: <span className="font-medium">{getStageNameForSession(activeSession.orderId, activeSession.stageId)}</span>
            </p>
          </div>

          <div className="flex justify-center mb-4">
            <WorkTimer session={activeSession} onUpdate={(s) => {}} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {activeSession.breaks.some(b => !b.end) ? (
              <button onClick={() => endBreak(activeSession.id)} className="btn-success col-span-2">
                <Play size={20} className="mr-2" /> Wracam do pracy
              </button>
            ) : (
              <>
                <button onClick={() => startBreak(activeSession.id)} className="btn-warning">
                  <Coffee size={20} className="mr-2" /> Przerwa
                </button>
                <button onClick={() => openQuantityModal(activeSession.id, 'end', activeSession.orderId)} className="btn-secondary">
                  <LogOut size={20} className="mr-2" /> Koniec dnia
                </button>
              </>
            )}
            <button
              onClick={() => openQuantityModal(activeSession.id, 'complete', activeSession.orderId)}
              className="btn-primary col-span-2"
            >
              <CheckCircle size={20} className="mr-2" /> Skończyłem ten etap
            </button>
          </div>
        </div>
      )}

      {/* Available Stages to Work On */}
      {!activeSession && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Package size={20} />
            Przydzielone Etapy
          </h2>

          {myAssignedStages.length === 0 ? (
            <div className="card-industrial text-center py-8">
              <AlertCircle size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nie masz przydzielonych etapów</p>
              <p className="text-sm text-muted-foreground mt-1">Poczekaj na przydzielenie zadań przez kierownika</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myAssignedStages.map(({ order, stageId, stageName }) => (
                <div key={`${order.id}-${stageId}`} className="card-industrial">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-semibold">Zlecenie #{order.order_number}</p>
                      <p className="text-muted-foreground text-sm">{order.client_name}</p>
                      <p className="text-sm">{order.product_name} ({order.quantity} szt.)</p>
                      <p className="text-sm mt-1">
                        Etap: <span className="font-medium">{stageName}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => startWork(order.id, stageId)}
                      className="btn-success whitespace-nowrap"
                    >
                      <Play size={18} className="mr-2" /> Zaczynam pracę
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Today's Completed Sessions */}
      {myWorkSessions.filter(ws => ws.status === 'completed' && ws.date === new Date().toISOString().split('T')[0]).length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <CheckCircle2 size={20} />
            Dzisiejsze sesje
          </h2>
          <div className="space-y-2">
            {myWorkSessions
              .filter(ws => ws.status === 'completed' && ws.date === new Date().toISOString().split('T')[0])
              .map(session => {
                const order = getOrderForSession(session.orderId);
                return (
                  <div key={session.id} className="card-industrial bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">#{order?.order_number} - {getStageNameForSession(session.orderId, session.stageId)}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.startTime && new Date(session.startTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {session.endTime && new Date(session.endTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">{session.quantityDone} szt.</p>
                        <p className="text-xs text-muted-foreground">
                          {session.breaks.length} przerw(y)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Quantity Modal */}
      {quantityModal && (
        <QuantityModal
          isOpen={quantityModal.isOpen}
          onClose={() => setQuantityModal(null)}
          onSubmit={handleQuantitySubmit}
          title={quantityModal.action === 'complete' ? 'Zakończ etap' : 'Koniec dnia pracy'}
          maxQuantity={quantityModal.maxQuantity}
          currentDone={quantityModal.currentDone}
        />
      )}
    </div>
  );
};

export default MyStages;
