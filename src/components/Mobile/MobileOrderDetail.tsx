import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  Package,
  Calendar,
  User,
  Clock,
  Play,
  Pause,
  CheckCircle,
  FileText,
  MessageSquare,
  Timer,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface ActiveSession {
  stageId: number;
  stageName: string;
  startTime: Date;
  elapsed: number;
}

const MobileOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, orders } = useApp();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const order = orders.find(o => o.id === Number(id));

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

  const handleStartStage = (stage: any) => {
    setActiveSession({
      stageId: stage.id,
      stageName: stage.name,
      startTime: new Date(),
      elapsed: 0
    });
  };

  const handleStopStage = () => {
    if (activeSession) {
      alert(`Zapisano ${formatTime(activeSession.elapsed)} pracy na etapie ${activeSession.stageName}`);
      setActiveSession(null);
    }
  };

  const handleCompleteStage = (stageId: number) => {
    if (!confirm('Czy na pewno chcesz oznaczyc ten etap jako zakonczony?')) return;
    // API call would go here
    alert('Etap oznaczony jako zakonczony');
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    // API call would go here
    alert('Notatka dodana');
    setNote('');
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
          <p className="text-lg font-medium">Nie znaleziono zlecenia</p>
          <button
            onClick={() => navigate('/worker')}
            className="mt-4 btn-primary"
          >
            Wroc do listy
          </button>
        </div>
      </div>
    );
  }

  const myStages = order.stages?.filter(s =>
    s.assignedWorkers?.includes(currentUser?.id || 0)
  ) || [];

  const daysUntil = getDaysUntilDeadline(order.planned_completion_date);

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/worker')}
            className="p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <p className="font-mono font-bold text-lg">{order.order_number}</p>
            <p className="text-sm opacity-75">{order.client_name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDeadlineColor(daysUntil)}`}>
            {daysUntil < 0 ? `${Math.abs(daysUntil)}d temu` :
             daysUntil === 0 ? 'Dzis!' :
             `${daysUntil}d`}
          </span>
        </div>
      </div>

      {/* Active Session */}
      {activeSession && (
        <div className="mx-4 mt-4 p-4 bg-green-600 text-white rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer className="animate-pulse" size={20} />
              <span className="text-sm font-medium">Aktywna praca</span>
            </div>
            <span className="text-xs opacity-75">{activeSession.stageName}</span>
          </div>
          <div className="text-center mb-4">
            <p className="text-4xl font-mono font-bold">{formatTime(activeSession.elapsed)}</p>
          </div>
          <button
            onClick={handleStopStage}
            className="w-full py-3 bg-white text-green-600 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Pause size={20} />
            Zakoncz prace
          </button>
        </div>
      )}

      {/* Order Info */}
      <div className="p-4 space-y-4">
        {/* Product Info */}
        <div className="bg-card rounded-xl p-4 shadow">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Package size={18} />
            Informacje o produkcie
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produkt:</span>
              <span className="font-medium">{order.product_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ilosc:</span>
              <span className="font-medium">{order.quantity} {order.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Termin:</span>
              <span className="font-medium">
                {new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                order.status === 'W_TRAKCIE' ? 'bg-blue-100 text-blue-800' :
                order.status === 'NOWE' ? 'bg-gray-100 text-gray-800' :
                'bg-green-100 text-green-800'
              }`}>
                {order.status === 'W_TRAKCIE' ? 'W trakcie' :
                 order.status === 'NOWE' ? 'Nowe' : 'Gotowe'}
              </span>
            </div>
          </div>
        </div>

        {/* My Stages */}
        <div className="bg-card rounded-xl p-4 shadow">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Clock size={18} />
            Moje etapy ({myStages.length})
          </h3>
          {myStages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Brak przydzielonych etapow
            </p>
          ) : (
            <div className="space-y-3">
              {myStages.map(stage => {
                const isActive = activeSession?.stageId === stage.id;
                const isCompleted = stage.status === 'completed';

                return (
                  <div
                    key={stage.id}
                    className={`p-3 rounded-lg border ${
                      isActive ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                      isCompleted ? 'border-gray-200 bg-gray-50 dark:bg-gray-800' :
                      'border-gray-200 bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{stage.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        stage.status === 'completed' ? 'bg-green-100 text-green-800' :
                        stage.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {stage.status === 'completed' ? 'Zakonczony' :
                         stage.status === 'in_progress' ? 'W trakcie' : 'Oczekuje'}
                      </span>
                    </div>

                    {!isCompleted && (
                      <div className="flex gap-2 mt-3">
                        {!activeSession ? (
                          <button
                            onClick={() => handleStartStage(stage)}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <Play size={16} />
                            Start
                          </button>
                        ) : isActive ? (
                          <button
                            onClick={handleStopStage}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <Pause size={16} />
                            Stop
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium"
                          >
                            Inna sesja aktywna
                          </button>
                        )}
                        <button
                          onClick={() => handleCompleteStage(stage.id)}
                          disabled={!!activeSession && isActive}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="bg-card rounded-xl p-4 shadow">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <MessageSquare size={18} />
            Notatki
          </h3>
          <div className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dodaj notatke do zlecenia..."
              className="w-full p-3 border rounded-lg resize-none h-20 text-sm"
            />
            <button
              onClick={handleAddNote}
              disabled={!note.trim()}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              Dodaj notatke
            </button>
          </div>
        </div>

        {/* Order Notes (existing) */}
        {order.notes && (
          <div className="bg-card rounded-xl p-4 shadow">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <FileText size={18} />
              Uwagi do zlecenia
            </h3>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileOrderDetail;
