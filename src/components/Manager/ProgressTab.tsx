import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { stagesApi, workSessionsApi, machinesApi, isDemoMode } from '@/utils/api';
import { Clock, CheckCircle, AlertTriangle, Loader2, Settings } from 'lucide-react';

interface ProgressTabProps {
  orderId: number;
}

interface StageProgress {
  id: number;
  name: string;
  status: string;
  machine_id?: number;
  machine_name?: string;
  order_index: number;
  tpz_minutes?: number;
  tj_minutes?: number;
  planned_duration_minutes?: number;
  actual_duration_minutes?: number;
  efficiency_percent?: number;
  started_at?: string;
  completed_at?: string;
  defects_count?: number;
  quantity_done?: number;
  quantity_total?: number;
  assigned_workers?: { id: number; name: string }[];
}

interface ProgressSummary {
  total_stages: number;
  completed_stages: number;
  total_products: number;
  completed_products: number;
  total_time_seconds: number;
  normative_time_seconds: number;
  defects_total: number;
}

const ProgressTab = ({ orderId }: ProgressTabProps) => {
  const { orders } = useApp();
  const order = orders.find(o => o.id === orderId);

  const [stages, setStages] = useState<StageProgress[]>([]);
  const [machines, setMachines] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProgressSummary>({
    total_stages: 0,
    completed_stages: 0,
    total_products: 0,
    completed_products: 0,
    total_time_seconds: 0,
    normative_time_seconds: 0,
    defects_total: 0,
  });

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        // Demo mode - use local data
        const orderStages = order?.stages || [];
        const demoStages: StageProgress[] = orderStages.map((s, idx) => ({
          id: s.stageId,
          name: s.stageName,
          status: s.status,
          order_index: idx,
          quantity_done: s.status === 'completed' ? (order?.quantity || 1) : 0,
          quantity_total: order?.quantity || 1,
          assigned_workers: s.assignedWorkers?.map(wId => ({ id: wId, name: `Pracownik ${wId}` })) || [],
        }));
        setStages(demoStages);

        const completed = demoStages.filter(s => s.status === 'completed').length;
        setSummary({
          total_stages: demoStages.length,
          completed_stages: completed,
          total_products: order?.quantity || 1,
          completed_products: completed > 0 ? (order?.quantity || 1) : 0,
          total_time_seconds: 0,
          normative_time_seconds: 0,
          defects_total: 0,
        });
      } else {
        // Production mode - load from API
        const [stagesRes, machinesRes] = await Promise.all([
          stagesApi.getByOrder(orderId),
          machinesApi.getAll(),
        ]);

        const stagesData = stagesRes.data?.stages || [];
        const machinesData = machinesRes.data?.machines || [];

        setMachines(machinesData);

        // Map stages with machine names
        const mappedStages: StageProgress[] = stagesData.map((s: any) => {
          const machine = machinesData.find((m: any) => m.id === s.machine_id);
          return {
            ...s,
            machine_name: machine?.name || null,
          };
        });

        setStages(mappedStages);

        // Calculate summary
        const completed = mappedStages.filter(s => s.status === 'completed' || s.status === 'GOTOWE').length;
        const totalTime = mappedStages.reduce((acc, s) => acc + ((s.actual_duration_minutes || 0) * 60), 0);
        const normTime = mappedStages.reduce((acc, s) => {
          const tpz = s.tpz_minutes || 0;
          const tj = (s.tj_minutes || 0) * (s.quantity_total || 1);
          return acc + ((tpz + tj) * 60);
        }, 0);
        const defects = mappedStages.reduce((acc, s) => acc + (s.defects_count || 0), 0);

        setSummary({
          total_stages: mappedStages.length,
          completed_stages: completed,
          total_products: order?.quantity || 1,
          completed_products: completed === mappedStages.length ? (order?.quantity || 1) : 0,
          total_time_seconds: totalTime,
          normative_time_seconds: normTime,
          defects_total: defects,
        });
      }
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number | undefined): string => {
    if (!minutes) return '00:00:00';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      'pending': { label: 'NOWY', class: 'bg-gray-100 text-gray-800' },
      'in_progress': { label: 'W TRAKCIE', class: 'bg-blue-100 text-blue-800' },
      'completed': { label: 'GOTOWE', class: 'bg-green-100 text-green-800' },
      'delayed': { label: 'OPÓŹNIONY', class: 'bg-red-100 text-red-800' },
      'NOWY': { label: 'NOWY', class: 'bg-gray-100 text-gray-800' },
      'W_TRAKCIE': { label: 'W TRAKCIE', class: 'bg-blue-100 text-blue-800' },
      'GOTOWE': { label: 'GOTOWE', class: 'bg-green-100 text-green-800' },
    };
    const s = statusMap[status] || statusMap['pending'];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
        {s.label === 'GOTOWE' && <CheckCircle size={12} className="mr-1" />}
        {s.label}
      </span>
    );
  };

  const getProgressBar = (done: number, total: number) => {
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground min-w-[50px]">
          {done}/{total}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin mr-2" />
        <span>Ładowanie postępu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Clock size={24} />
        Progres Zlecenia
      </h2>

      {/* Summary Cards - like Prodio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg border">
          <div className="text-sm text-muted-foreground mb-1">Zlecenia (got./wszyst.)</div>
          <div className="text-2xl font-bold text-right">
            {summary.completed_stages} / {summary.total_stages}
          </div>
          {getProgressBar(summary.completed_stages, summary.total_stages)}
        </div>

        <div className="p-4 bg-muted/30 rounded-lg border">
          <div className="text-sm text-muted-foreground mb-1">Produkty (got./wszyst.)</div>
          <div className="text-2xl font-bold text-right">
            {summary.completed_products.toFixed(2)} / {summary.total_products.toFixed(2)}
          </div>
          {getProgressBar(summary.completed_products, summary.total_products)}
        </div>

        <div className="p-4 bg-muted/30 rounded-lg border">
          <div className="text-sm text-muted-foreground mb-1">Produkty (wyd./wszyst.)</div>
          <div className="text-2xl font-bold text-right">
            0.00 / {summary.total_products.toFixed(2)}
          </div>
          <div className="h-2 bg-gray-200 rounded-full mt-2" />
        </div>

        <div className="p-4 bg-muted/30 rounded-lg border">
          <div className="text-sm text-muted-foreground mb-1">Czas (pracy/norm.)</div>
          <div className="text-2xl font-bold text-right">
            {formatTime(summary.total_time_seconds)} / {formatTime(summary.normative_time_seconds)}
          </div>
          {summary.normative_time_seconds > 0 && (
            <div className="text-xs text-muted-foreground text-right mt-1">
              Wydajność: {Math.round((summary.normative_time_seconds / Math.max(summary.total_time_seconds, 1)) * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Production Orders Table - like Prodio */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Zlecenia produkcyjne</h3>
          {!isDemoMode() && (
            <button className="text-sm text-primary hover:underline flex items-center gap-1">
              <Settings size={14} />
              EDYTUJ
            </button>
          )}
        </div>

        {stages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
            <p>Brak etapów produkcyjnych dla tego zlecenia.</p>
            <p className="text-sm">Przypisz etapy w sekcji "Etapy Produkcyjne" powyżej.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Maszyna/Operacja</th>
                  <th className="text-left p-3 font-medium">Nr zlecenia</th>
                  <th className="text-left p-3 font-medium">Planowany stop</th>
                  <th className="text-left p-3 font-medium">Produkty (got./wszyst.)</th>
                  <th className="text-left p-3 font-medium">Brakowość</th>
                  <th className="text-left p-3 font-medium">Czas pracy</th>
                  <th className="text-left p-3 font-medium">Normatywny czas</th>
                  <th className="text-left p-3 font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage, idx) => {
                  const qtyDone = stage.quantity_done || 0;
                  const qtyTotal = stage.quantity_total || order?.quantity || 1;
                  const normMinutes = (stage.tpz_minutes || 0) + ((stage.tj_minutes || 0) * qtyTotal);

                  return (
                    <tr key={stage.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        {getStatusBadge(stage.status)}
                      </td>
                      <td className="p-3 font-medium">
                        {stage.machine_name || stage.name}
                      </td>
                      <td className="p-3">
                        <a href="#" className="text-primary hover:underline">
                          {idx + 1}/{order?.order_number}
                        </a>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {order?.planned_completion_date
                          ? new Date(order.planned_completion_date).toLocaleString('pl-PL', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td className="p-3">
                        <div className="min-w-[120px]">
                          {getProgressBar(qtyDone, qtyTotal)}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {stage.defects_count && stage.defects_count > 0 ? (
                          <span className="text-red-600 font-medium">{stage.defects_count}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 font-mono">
                        {formatMinutes(stage.actual_duration_minutes)}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {formatMinutes(normMinutes)}
                      </td>
                      <td className="p-3">
                        <button className="text-muted-foreground hover:text-foreground">
                          •••
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary row */}
              <tfoot>
                <tr className="bg-orange-100 font-medium">
                  <td className="p-3" colSpan={2}>Podsumowanie strony:</td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3">{summary.total_products.toFixed(2)}</td>
                  <td className="p-3 text-center">{summary.defects_total || '-'}</td>
                  <td className="p-3 font-mono">{formatTime(summary.total_time_seconds)}</td>
                  <td className="p-3 font-mono">{formatTime(summary.normative_time_seconds)}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTab;
