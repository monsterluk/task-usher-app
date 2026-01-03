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
  currentDone,
  currentDefective = 0
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (qty: number, defective: number) => void;
  title: string;
  maxQuantity: number;
  currentDone: number;
  currentDefective?: number;
}) => {
  const [quantity, setQuantity] = useState(currentDone);
  const [defective, setDefective] = useState(currentDefective);

  if (!isOpen) return null;

  const qualityPercent = quantity > 0 ? ((quantity - defective) / quantity * 100).toFixed(1) : '100.0';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-card rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-4">{title}</h3>

        {/* Produced quantity */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Ile sztuk wyprodukowano? (max: {maxQuantity})
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

        {/* Defective quantity */}
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <label className="block text-sm font-medium mb-2 text-red-700 dark:text-red-300">
            Ile sztuk było WADLIWYCH?
          </label>
          <input
            type="number"
            min="0"
            max={quantity}
            value={defective}
            onChange={(e) => setDefective(Math.min(quantity, Math.max(0, parseInt(e.target.value) || 0)))}
            className="input-industrial w-full text-xl text-center border-red-300"
          />
          <div className="flex gap-2 mt-2">
            {[0, 1, 5].map(n => (
              <button
                key={n}
                onClick={() => setDefective(n)}
                className={`flex-1 py-1 text-sm rounded ${defective === n ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Quality indicator */}
        <div className="mb-4 p-3 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground">Jakość produkcji</p>
          <p className={`text-2xl font-bold ${parseFloat(qualityPercent) >= 95 ? 'text-green-600' : parseFloat(qualityPercent) >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
            {qualityPercent}%
          </p>
          <p className="text-xs text-muted-foreground">
            {quantity - defective} dobrych z {quantity} wyprodukowanych
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Anuluj
          </button>
          <button onClick={() => onSubmit(quantity, defective)} className="btn-primary flex-1">
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================== MAIN COMPONENT =====================
const MyStages = () => {
  console.log('[MyStages v3] Component mounted');
  const { currentUser, orders, workSessions, setWorkSessions, workers, machines, apiConnected, demoMode } = useApp();
  console.log('[MyStages v3] Context:', { currentUser: currentUser?.id, apiConnected, demoMode });
  const [quantityModal, setQuantityModal] = useState<{
    isOpen: boolean;
    sessionId: string;
    action: 'pause' | 'end' | 'complete';
    orderId: number;
    maxQuantity: number;
    currentDone: number;
    currentDefective: number;
  } | null>(null);

  // State for API assignments
  const [apiAssignments, setApiAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Fetch assignments from API when connected
  useEffect(() => {
    const fetchAssignments = async () => {
      console.log('[MyStages v2] Fetching assignments for user:', currentUser?.id, 'demoMode:', demoMode);
      if (!currentUser || demoMode) return;

      setLoadingAssignments(true);
      try {
        const token = localStorage.getItem('plexisystem_token');
        const response = await fetch(`/api/workers/${currentUser.id}/assignments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Filter only active assignments (not completed)
          const activeAssignments = (data.data?.assignments || []).filter(
            (a: any) => a.status !== 'COMPLETED' && a.status !== 'GOTOWY'
          );
          setApiAssignments(activeAssignments);
        }
      } catch (err) {
        console.log('Error fetching assignments:', err);
      } finally {
        setLoadingAssignments(false);
      }
    };

    fetchAssignments();
  }, [currentUser, demoMode]);

  if (!currentUser) return null;

  // Get active work sessions for current worker
  const myWorkSessions = workSessions.filter(ws => ws.workerId === currentUser.id);
  const activeSession = myWorkSessions.find(ws => ws.status === 'active' || ws.status === 'paused');

  // Get assigned stages - from API if connected, else fallback to local
  const getMyAssignedStages = () => {
    // Use API data if available
    if (apiAssignments.length > 0) {
      return apiAssignments.map(a => ({
        order: {
          id: a.order_id,
          order_number: a.order_number,
          client_name: a.client_name,
          product_name: a.product_name,
          quantity: 1000, // Default, will be fetched when starting work
        } as Order,
        stageId: a.stage_id,
        stageName: a.stage_name
      }));
    }

    // Fallback: filter from local orders (demo mode)
    const assigned: { order: Order; stageId: number; stageName: string }[] = [];

    orders.forEach(order => {
      if (order.archived || order.status === 'GOTOWE') return;

      order.stages?.forEach(stage => {
        if (stage.assignedWorkers?.includes(currentUser.id) && stage.status !== 'completed') {
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

  // Get machine for stage based on department/position
  const getMachineForStage = (stageName: string): number | undefined => {
    // Map stage names to machine departments
    const stageToMachine: Record<string, string> = {
      'Frezowanie': 'FREZOWANIE',
      'Frezowanie CNC': 'FREZOWANIE',
      'Cięcie': 'LASER',
      'Cięcie laserowe': 'LASER',
      'Laser': 'LASER',
      'Gięcie': 'WYGINANIE',
      'Polerowanie': 'POLEROWANIE',
    };

    const department = stageToMachine[stageName];
    if (department && machines) {
      const machine = machines.find(m => m.department === department && m.status !== 'offline');
      return machine?.id;
    }
    return undefined;
  };

  // Start work on a stage
  const startWork = (orderId: number, stageId: number, stageName?: string) => {
    if (activeSession) {
      toast({ title: "Uwaga", description: "Najpierw zakończ aktualną pracę", variant: "destructive" });
      return;
    }

    const machineId = stageName ? getMachineForStage(stageName) : undefined;

    const newSession: WorkSession = {
      id: `ws_${Date.now()}`,
      workerId: currentUser.id,
      orderId,
      stageId,
      machineId,  // Powiązanie z maszyną dla OEE
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      endTime: null,
      breaks: [],
      quantityDone: 0,
      quantityDefective: 0,  // Domyślnie 0 wadliwych
      status: 'active'
    };

    setWorkSessions(prev => [...prev, newSession]);
    toast({
      title: "Start pracy",
      description: machineId ? `Rozpoczęto pracę na maszynie #${machineId}` : "Rozpoczęto sesję pracy"
    });
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
      currentDone: session?.quantityDone || 0,
      currentDefective: session?.quantityDefective || 0
    });
  };

  // End day (save progress but can continue tomorrow)
  const endDay = (sessionId: string, quantity: number, defective: number) => {
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
          quantityDefective: defective,
          status: 'completed'
        };
      }
      return ws;
    }));
    setQuantityModal(null);
    const quality = quantity > 0 ? ((quantity - defective) / quantity * 100).toFixed(1) : '100';
    toast({
      title: "Koniec dnia",
      description: `Zapisano: ${quantity} szt. (${defective} wadliwych, jakość ${quality}%)`
    });
  };

  // Complete stage
  const completeStage = (sessionId: string, quantity: number, defective: number, orderId: number, stageId: number) => {
    // End the session
    endDay(sessionId, quantity, defective);

    // Mark stage as completed in order
    const quality = quantity > 0 ? ((quantity - defective) / quantity * 100).toFixed(1) : '100';
    toast({
      title: "Etap zakończony",
      description: `Ukończono etap. Zrobiono: ${quantity} szt., wadliwych: ${defective}, jakość: ${quality}%`
    });
  };

  // Handle modal submit
  const handleQuantitySubmit = (quantity: number, defective: number) => {
    if (!quantityModal) return;

    if (quantityModal.action === 'end' || quantityModal.action === 'pause') {
      endDay(quantityModal.sessionId, quantity, defective);
    } else if (quantityModal.action === 'complete') {
      const session = workSessions.find(ws => ws.id === quantityModal.sessionId);
      if (session) {
        completeStage(quantityModal.sessionId, quantity, defective, session.orderId, session.stageId);
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
    let totalDefective = 0;

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
      totalDefective += sess.quantityDefective || 0;
    });

    const qualityPercent = totalQuantity > 0 ? ((totalQuantity - totalDefective) / totalQuantity * 100) : 100;

    return {
      totalSeconds: Math.max(0, totalSeconds),
      totalBreakSeconds,
      totalQuantity,
      totalDefective,
      qualityPercent,
      sessionsCount: todaySessions.length
    };
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="card-industrial p-3">
          <p className="text-sm text-muted-foreground">Przepracowano</p>
          <p className="text-xl font-bold text-primary">{formatDuration(todayStats.totalSeconds)}</p>
        </div>
        <div className="card-industrial p-3">
          <p className="text-sm text-muted-foreground">Przerwy</p>
          <p className="text-xl font-bold text-warning">{formatDuration(todayStats.totalBreakSeconds)}</p>
        </div>
        <div className="card-industrial p-3">
          <p className="text-sm text-muted-foreground">Wyprodukowano</p>
          <p className="text-xl font-bold text-success">{todayStats.totalQuantity} szt.</p>
          {todayStats.totalDefective > 0 && (
            <p className="text-xs text-red-500">({todayStats.totalDefective} wadliwych)</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-industrial p-3">
          <p className="text-sm text-muted-foreground">Jakość produkcji</p>
          <p className={`text-xl font-bold ${todayStats.qualityPercent >= 95 ? 'text-green-600' : todayStats.qualityPercent >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
            {Number(todayStats.qualityPercent || 0).toFixed(1)}%
          </p>
        </div>
        <div className="card-industrial p-3">
          <p className="text-sm text-muted-foreground">Sesji pracy</p>
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

          {loadingAssignments ? (
            <div className="card-industrial text-center py-8">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-muted-foreground">Ładowanie przydzielonych etapów...</p>
            </div>
          ) : myAssignedStages.length === 0 ? (
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
                      onClick={() => startWork(order.id, stageId, stageName)}
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
          currentDefective={quantityModal.currentDefective}
        />
      )}
    </div>
  );
};

export default MyStages;
