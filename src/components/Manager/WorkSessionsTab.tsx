import { useState, useEffect } from 'react';
import { assignmentsApi, workSessionsApi, stagesApi, isDemoMode } from '@/utils/api';
import { Clock, Play, Square, User, Calendar, Loader2, ChevronDown, ChevronUp, Trash2, Edit2, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface WorkSessionsTabProps {
  orderId: number;
}

interface WorkSession {
  id: number;
  assignment_id: number;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  cost?: number;
  break_minutes?: number;
  notes?: string;
}

interface StageWithSessions {
  stage_id: number;
  stage_name: string;
  stage_number: number;
  assignments: {
    id: number;
    worker_id: number;
    worker_name: string;
    status: string;
    sessions: WorkSession[];
    totals: {
      total_minutes: number;
      total_hours: string;
      total_cost: string;
    };
    active_session?: WorkSession;
  }[];
}

const WorkSessionsTab = ({ orderId }: WorkSessionsTabProps) => {
  const { toast } = useToast();
  const [stagesWithSessions, setStagesWithSessions] = useState<StageWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [editingSession, setEditingSession] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ start_time: '', end_time: '' });

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        // Demo mode - mock data
        setStagesWithSessions([
          {
            stage_id: 1,
            stage_name: 'FREZOWANIE',
            stage_number: 1,
            assignments: [
              {
                id: 1,
                worker_id: 1,
                worker_name: 'Jan Kowalski',
                status: 'W_TRAKCIE',
                sessions: [
                  {
                    id: 1,
                    assignment_id: 1,
                    start_time: new Date(Date.now() - 3600000).toISOString(),
                    end_time: new Date(Date.now() - 1800000).toISOString(),
                    duration_minutes: 30,
                    cost: 25.00,
                  },
                  {
                    id: 2,
                    assignment_id: 1,
                    start_time: new Date(Date.now() - 1200000).toISOString(),
                    duration_minutes: undefined,
                  },
                ],
                totals: { total_minutes: 30, total_hours: '0.50', total_cost: '25.00' },
                active_session: {
                  id: 2,
                  assignment_id: 1,
                  start_time: new Date(Date.now() - 1200000).toISOString(),
                },
              },
            ],
          },
        ]);
      } else {
        // Production mode - load from API
        const stagesRes = await stagesApi.getOrderStages(orderId);
        const stages = stagesRes.data?.stages || [];

        const stagesData: StageWithSessions[] = [];

        for (const stage of stages) {
          const assignmentsWithSessions = [];

          for (const assignment of stage.assignments || []) {
            try {
              const sessionsRes = await assignmentsApi.getSessions(assignment.id);
              assignmentsWithSessions.push({
                id: assignment.id,
                worker_id: assignment.worker_id,
                worker_name: assignment.worker_name || `Pracownik #${assignment.worker_id}`,
                status: assignment.status,
                sessions: sessionsRes.data?.sessions || [],
                totals: sessionsRes.data?.totals || { total_minutes: 0, total_hours: '0.00', total_cost: '0.00' },
                active_session: sessionsRes.data?.active_session,
              });
            } catch (err) {
              console.error(`Failed to load sessions for assignment ${assignment.id}:`, err);
            }
          }

          if (assignmentsWithSessions.length > 0) {
            stagesData.push({
              stage_id: stage.id,
              stage_name: stage.stage_name,
              stage_number: stage.stage_number,
              assignments: assignmentsWithSessions,
            });
          }
        }

        setStagesWithSessions(stagesData);
      }
    } catch (error) {
      console.error('Failed to load work sessions:', error);
      toast({ title: 'Błąd', description: 'Nie udało się załadować sesji pracy', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}min`;
  };

  const formatDurationLive = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    const s = Math.floor((diffMs % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę sesję pracy?')) return;

    try {
      await workSessionsApi.delete(sessionId);
      toast({ title: 'Usunięto', description: 'Sesja pracy została usunięta' });
      loadData();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć sesji', variant: 'destructive' });
    }
  };

  const handleEditSession = (session: WorkSession) => {
    setEditingSession(session.id);
    setEditForm({
      start_time: session.start_time.slice(0, 16),
      end_time: session.end_time ? session.end_time.slice(0, 16) : '',
    });
  };

  const handleSaveEdit = async (sessionId: number) => {
    try {
      await workSessionsApi.update(sessionId, {
        start_time: editForm.start_time,
        end_time: editForm.end_time || undefined,
      });
      toast({ title: 'Zapisano', description: 'Sesja pracy została zaktualizowana' });
      setEditingSession(null);
      loadData();
    } catch (error) {
      console.error('Failed to update session:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować sesji', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string, hasActiveSession: boolean) => {
    if (hasActiveSession) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
          <Play size={10} fill="currentColor" />
          AKTYWNA
        </span>
      );
    }
    const statusMap: Record<string, { label: string; class: string }> = {
      'NOWY': { label: 'NOWY', class: 'bg-gray-100 text-gray-800' },
      'W_TRAKCIE': { label: 'W TRAKCIE', class: 'bg-blue-100 text-blue-800' },
      'GOTOWY': { label: 'GOTOWY', class: 'bg-green-100 text-green-800' },
    };
    const s = statusMap[status] || statusMap['NOWY'];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin mr-2" />
        <span>Ładowanie sesji pracy...</span>
      </div>
    );
  }

  const totalAllMinutes = stagesWithSessions.reduce(
    (sum, stage) => sum + stage.assignments.reduce((aSum, a) => aSum + a.totals.total_minutes, 0),
    0
  );
  const totalAllCost = stagesWithSessions.reduce(
    (sum, stage) => sum + stage.assignments.reduce((aSum, a) => aSum + parseFloat(a.totals.total_cost || '0'), 0),
    0
  );

  return (
    <div className="space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Clock size={24} />
          Sesje Pracy ({stagesWithSessions.reduce((sum, s) => sum + s.assignments.reduce((a, as) => a + as.sessions.length, 0), 0)})
        </h2>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Całkowity czas pracy</div>
              <div className="text-2xl font-bold text-blue-800">{formatDuration(totalAllMinutes)}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 mb-1">Całkowity koszt pracy</div>
              <div className="text-2xl font-bold text-green-800">{totalAllCost.toFixed(2)} zł</div>
            </div>
          </div>

          {stagesWithSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p>Brak zarejestrowanych sesji pracy dla tego zlecenia.</p>
              <p className="text-sm">Sesje pracy są rejestrowane automatycznie gdy pracownik rozpoczyna pracę nad etapem.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {stagesWithSessions.map((stage) => (
                <div key={stage.stage_id} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 font-semibold">
                    Etap {stage.stage_number}: {stage.stage_name}
                  </div>

                  {stage.assignments.map((assignment) => (
                    <div key={assignment.id} className="border-t">
                      <div className="px-4 py-3 bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-muted-foreground" />
                          <span className="font-medium">{assignment.worker_name}</span>
                          {getStatusBadge(assignment.status, !!assignment.active_session)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Razem: <span className="font-medium">{formatDuration(assignment.totals.total_minutes)}</span>
                          {' | '}
                          <span className="font-medium">{assignment.totals.total_cost} zł</span>
                        </div>
                      </div>

                      {assignment.sessions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground italic">
                          Brak sesji pracy
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left p-2 font-medium">Start</th>
                              <th className="text-left p-2 font-medium">Stop</th>
                              <th className="text-left p-2 font-medium">Czas trwania</th>
                              <th className="text-left p-2 font-medium">Koszt</th>
                              <th className="text-right p-2 font-medium">Akcje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignment.sessions.map((session) => (
                              <tr key={session.id} className={`border-b hover:bg-muted/20 ${!session.end_time ? 'bg-green-50' : ''}`}>
                                {editingSession === session.id ? (
                                  <>
                                    <td className="p-2">
                                      <input
                                        type="datetime-local"
                                        value={editForm.start_time}
                                        onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                                        className="input-industrial text-xs p-1"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="datetime-local"
                                        value={editForm.end_time}
                                        onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                                        className="input-industrial text-xs p-1"
                                      />
                                    </td>
                                    <td className="p-2">-</td>
                                    <td className="p-2">-</td>
                                    <td className="p-2 text-right space-x-1">
                                      <button
                                        onClick={() => handleSaveEdit(session.id)}
                                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                                      >
                                        <Check size={14} />
                                      </button>
                                      <button
                                        onClick={() => setEditingSession(null)}
                                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                                      >
                                        <X size={14} />
                                      </button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="p-2">
                                      <div className="flex items-center gap-1">
                                        <Calendar size={12} className="text-muted-foreground" />
                                        {formatDateTime(session.start_time)}
                                      </div>
                                    </td>
                                    <td className="p-2">
                                      {session.end_time ? (
                                        formatDateTime(session.end_time)
                                      ) : (
                                        <span className="text-green-600 font-medium flex items-center gap-1">
                                          <Play size={12} fill="currentColor" />
                                          W trakcie...
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 font-mono">
                                      {session.end_time ? (
                                        formatDuration(session.duration_minutes)
                                      ) : (
                                        <LiveTimer startTime={session.start_time} />
                                      )}
                                    </td>
                                    <td className="p-2">
                                      {session.cost ? `${session.cost.toFixed(2)} zł` : '-'}
                                    </td>
                                    <td className="p-2 text-right space-x-1">
                                      {!isDemoMode() && (
                                        <>
                                          <button
                                            onClick={() => handleEditSession(session)}
                                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                            title="Edytuj"
                                          >
                                            <Edit2 size={14} />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSession(session.id)}
                                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                                            title="Usuń"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </>
                                      )}
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Live timer component that updates every second
const LiveTimer = ({ startTime }: { startTime: string }) => {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="text-green-600 font-medium">{elapsed}</span>;
};

export default WorkSessionsTab;
