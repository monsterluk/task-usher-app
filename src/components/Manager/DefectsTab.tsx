import { useState, useEffect } from 'react';
import { qualityApi, isDemoMode } from '@/utils/api';
import { AlertTriangle, CheckCircle, Clock, XCircle, Loader2, ChevronDown, ChevronUp, Plus, AlertOctagon, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface DefectsTabProps {
  orderId: number;
  stages?: { id: number; stage_name: string }[];
}

interface Defect {
  id: number;
  order_id: number;
  quality_check_id?: number;
  stage_id?: number;
  stage_name?: string;
  reported_by?: number;
  reported_by_name?: string;
  resolved_by?: number;
  resolved_by_name?: string;
  defect_type: string;
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  description: string;
  quantity_affected: number;
  cost_impact?: number;
  root_cause?: string;
  corrective_action?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  photos?: string[];
  created_at: string;
  resolved_at?: string;
}

interface QualityCheck {
  id: number;
  order_id: number;
  stage_id?: number;
  stage_name?: string;
  checkpoint_id?: number;
  checkpoint_name?: string;
  inspector_id?: number;
  inspector_name?: string;
  check_type: 'incoming' | 'in_process' | 'final';
  status: 'pending' | 'passed' | 'failed' | 'conditional';
  measured_value?: number;
  is_within_tolerance?: boolean;
  notes?: string;
  category?: string;
  is_critical?: boolean;
  created_at: string;
  checked_at?: string;
}

interface DefectStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  major: number;
}

interface CheckStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  conditional: number;
}

const DefectsTab = ({ orderId, stages = [] }: DefectsTabProps) => {
  const { toast } = useToast();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
  const [defectStats, setDefectStats] = useState<DefectStats>({ total: 0, open: 0, inProgress: 0, resolved: 0, critical: 0, major: 0 });
  const [checkStats, setCheckStats] = useState<CheckStats>({ total: 0, passed: 0, failed: 0, pending: 0, conditional: 0 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'defects' | 'checks'>('defects');
  const [showAddDefect, setShowAddDefect] = useState(false);
  const [newDefect, setNewDefect] = useState({
    defect_type: '',
    severity: 'minor' as const,
    description: '',
    quantity_affected: 1,
    stage_id: undefined as number | undefined,
  });

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        // Demo mode - mock data
        setDefects([
          {
            id: 1,
            order_id: orderId,
            defect_type: 'Rysa na powierzchni',
            severity: 'minor',
            description: 'Drobne zarysowanie na zewnetrznej stronie panelu',
            quantity_affected: 1,
            status: 'open',
            reported_by_name: 'Jan Kowalski',
            created_at: new Date().toISOString(),
          },
        ]);
        setQualityChecks([
          {
            id: 1,
            order_id: orderId,
            check_type: 'in_process',
            status: 'passed',
            checkpoint_name: 'Kontrola wymiarów',
            inspector_name: 'Anna Nowak',
            created_at: new Date().toISOString(),
          },
        ]);
        setDefectStats({ total: 1, open: 1, inProgress: 0, resolved: 0, critical: 0, major: 0 });
        setCheckStats({ total: 1, passed: 1, failed: 0, pending: 0, conditional: 0 });
      } else {
        // Production mode - load from API
        const [defectsRes, checksRes] = await Promise.all([
          qualityApi.getOrderDefects(orderId),
          qualityApi.getOrderChecks(orderId),
        ]);

        setDefects(defectsRes.data?.defects || []);
        setQualityChecks(checksRes.data?.checks || []);
        setDefectStats(defectsRes.data?.stats || { total: 0, open: 0, inProgress: 0, resolved: 0, critical: 0, major: 0 });
        setCheckStats(checksRes.data?.stats || { total: 0, passed: 0, failed: 0, pending: 0, conditional: 0 });
      }
    } catch (error) {
      console.error('Failed to load quality data:', error);
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

  const getSeverityBadge = (severity: string) => {
    const badges: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
      'critical': { label: 'Krytyczny', class: 'bg-red-100 text-red-800 border-red-300', icon: <AlertOctagon size={12} /> },
      'major': { label: 'Poważny', class: 'bg-orange-100 text-orange-800 border-orange-300', icon: <AlertTriangle size={12} /> },
      'minor': { label: 'Drobny', class: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Info size={12} /> },
      'cosmetic': { label: 'Kosmetyczny', class: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Info size={12} /> },
    };
    const badge = badges[severity] || badges['minor'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${badge.class}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
      'open': { label: 'Otwarty', class: 'bg-red-100 text-red-800', icon: <XCircle size={12} /> },
      'in_progress': { label: 'W trakcie', class: 'bg-yellow-100 text-yellow-800', icon: <Clock size={12} /> },
      'resolved': { label: 'Rozwiązany', class: 'bg-green-100 text-green-800', icon: <CheckCircle size={12} /> },
      'accepted': { label: 'Zaakceptowany', class: 'bg-blue-100 text-blue-800', icon: <CheckCircle size={12} /> },
    };
    const badge = badges[status] || badges['open'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.class}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getCheckStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
      'pending': { label: 'Oczekuje', class: 'bg-gray-100 text-gray-800', icon: <Clock size={12} /> },
      'passed': { label: 'Zaliczony', class: 'bg-green-100 text-green-800', icon: <CheckCircle size={12} /> },
      'failed': { label: 'Niezaliczony', class: 'bg-red-100 text-red-800', icon: <XCircle size={12} /> },
      'conditional': { label: 'Warunkowo', class: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle size={12} /> },
    };
    const badge = badges[status] || badges['pending'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.class}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const handleResolveDefect = async (defectId: number) => {
    try {
      await qualityApi.updateDefect(defectId, { status: 'resolved' });
      toast({
        title: 'Defekt rozwiązany',
        description: 'Status defektu został zmieniony na rozwiązany.',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować defektu.',
        variant: 'destructive',
      });
    }
  };

  const handleAddDefect = async () => {
    if (!newDefect.defect_type || !newDefect.description) {
      toast({
        title: 'Błąd',
        description: 'Wypełnij typ wady i opis.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await qualityApi.createDefect(orderId, {
        defect_type: newDefect.defect_type,
        severity: newDefect.severity,
        description: newDefect.description,
        quantity_affected: newDefect.quantity_affected,
        stage_id: newDefect.stage_id,
      });

      toast({
        title: 'Defekt zgłoszony',
        description: response.data?.message || 'Defekt został dodany pomyślnie.',
      });

      setNewDefect({
        defect_type: '',
        severity: 'minor',
        description: '',
        quantity_affected: 1,
        stage_id: undefined,
      });
      setShowAddDefect(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać defektu.',
        variant: 'destructive',
      });
    }
  };

  // Calculate total cost impact
  const totalCostImpact = defects.reduce((sum, d) => sum + (d.cost_impact || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin mr-2" />
        <span>Ładowanie danych jakości...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle size={24} />
          Jakość i Defekty ({defects.length + qualityChecks.length})
        </h2>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-red-600 mb-1 flex items-center gap-1">
                <AlertOctagon size={14} />
                Otwarte defekty
              </div>
              <div className="text-2xl font-bold text-red-800">{defectStats.open}</div>
              {defectStats.critical > 0 && (
                <div className="text-xs text-red-600 mt-1">{defectStats.critical} krytycznych</div>
              )}
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 mb-1 flex items-center gap-1">
                <CheckCircle size={14} />
                Kontrole zaliczone
              </div>
              <div className="text-2xl font-bold text-green-800">
                {checkStats.total > 0 ? `${Math.round((checkStats.passed / checkStats.total) * 100)}%` : '0%'}
              </div>
              <div className="text-xs text-green-600 mt-1">{checkStats.passed}/{checkStats.total} kontroli</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-600 mb-1 flex items-center gap-1">
                <Clock size={14} />
                W trakcie naprawy
              </div>
              <div className="text-2xl font-bold text-yellow-800">{defectStats.inProgress}</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-600 mb-1 flex items-center gap-1">
                Koszt defektów
              </div>
              <div className="text-2xl font-bold text-purple-800">{Number(totalCostImpact || 0).toFixed(2)} zł</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b mb-4">
            <button
              onClick={() => setActiveTab('defects')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'defects'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Defekty ({defects.length})
            </button>
            <button
              onClick={() => setActiveTab('checks')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'checks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Kontrole jakości ({qualityChecks.length})
            </button>
          </div>

          {/* Defects tab */}
          {activeTab === 'defects' && (
            <>
              {/* Add defect button */}
              <div className="mb-4">
                <button
                  onClick={() => setShowAddDefect(!showAddDefect)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  <Plus size={16} />
                  Zgłoś defekt
                </button>
              </div>

              {/* Add defect form */}
              {showAddDefect && (
                <div className="p-4 bg-muted/30 rounded-lg mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Typ wady *</label>
                      <input
                        type="text"
                        value={newDefect.defect_type}
                        onChange={(e) => setNewDefect({ ...newDefect, defect_type: e.target.value })}
                        placeholder="np. Rysa, Pęknięcie, Niezgodność wymiarowa"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ważność</label>
                      <select
                        value={newDefect.severity}
                        onChange={(e) => setNewDefect({ ...newDefect, severity: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="cosmetic">Kosmetyczny</option>
                        <option value="minor">Drobny</option>
                        <option value="major">Poważny</option>
                        <option value="critical">Krytyczny (blokuje produkcję)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Opis *</label>
                    <textarea
                      value={newDefect.description}
                      onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
                      placeholder="Szczegółowy opis wady..."
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ilość wadliwych szt.</label>
                      <input
                        type="number"
                        min={1}
                        value={newDefect.quantity_affected}
                        onChange={(e) => setNewDefect({ ...newDefect, quantity_affected: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    {stages.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Etap</label>
                        <select
                          value={newDefect.stage_id || ''}
                          onChange={(e) => setNewDefect({ ...newDefect, stage_id: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">-- Wybierz etap --</option>
                          {stages.map((stage) => (
                            <option key={stage.id} value={stage.id}>{stage.stage_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleAddDefect}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Zgłoś defekt
                    </button>
                    <button
                      onClick={() => setShowAddDefect(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              )}

              {defects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle size={32} className="mx-auto mb-2 opacity-50 text-green-500" />
                  <p>Brak zgłoszonych defektów.</p>
                  <p className="text-sm">To dobra wiadomość! Produkcja przebiega bez problemów.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Ważność</th>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-left p-2 font-medium">Typ wady</th>
                        <th className="text-left p-2 font-medium">Opis</th>
                        <th className="text-right p-2 font-medium">Ilość</th>
                        <th className="text-left p-2 font-medium">Etap</th>
                        <th className="text-left p-2 font-medium">Data</th>
                        <th className="text-left p-2 font-medium">Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defects.map((defect) => (
                        <tr key={defect.id} className="border-b hover:bg-muted/20">
                          <td className="p-2">{getSeverityBadge(defect.severity)}</td>
                          <td className="p-2">{getStatusBadge(defect.status)}</td>
                          <td className="p-2 font-medium">{defect.defect_type}</td>
                          <td className="p-2 max-w-xs">
                            <div className="truncate" title={defect.description}>
                              {defect.description}
                            </div>
                            {defect.root_cause && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Przyczyna: {defect.root_cause}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono">{defect.quantity_affected}</td>
                          <td className="p-2 text-sm">{defect.stage_name || '-'}</td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {formatDateTime(defect.created_at)}
                            {defect.reported_by_name && (
                              <div className="text-xs">przez {defect.reported_by_name}</div>
                            )}
                          </td>
                          <td className="p-2">
                            {defect.status === 'open' && (
                              <button
                                onClick={() => handleResolveDefect(defect.id)}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Rozwiąż
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Quality checks tab */}
          {activeTab === 'checks' && (
            <>
              {qualityChecks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Brak przeprowadzonych kontroli jakości.</p>
                  <p className="text-sm">Kontrole pojawią się tutaj po ich przeprowadzeniu.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-left p-2 font-medium">Punkt kontrolny</th>
                        <th className="text-left p-2 font-medium">Typ</th>
                        <th className="text-left p-2 font-medium">Etap</th>
                        <th className="text-left p-2 font-medium">Kontroler</th>
                        <th className="text-left p-2 font-medium">Notatki</th>
                        <th className="text-left p-2 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qualityChecks.map((check) => (
                        <tr key={check.id} className="border-b hover:bg-muted/20">
                          <td className="p-2">{getCheckStatusBadge(check.status)}</td>
                          <td className="p-2 font-medium">
                            {check.checkpoint_name || 'Kontrola ogólna'}
                            {check.is_critical && (
                              <span className="ml-1 text-xs text-red-600">(krytyczna)</span>
                            )}
                          </td>
                          <td className="p-2 text-sm">
                            {{
                              'incoming': 'Wejściowa',
                              'in_process': 'W procesie',
                              'final': 'Końcowa',
                            }[check.check_type] || check.check_type}
                          </td>
                          <td className="p-2 text-sm">{check.stage_name || '-'}</td>
                          <td className="p-2 text-sm">{check.inspector_name || '-'}</td>
                          <td className="p-2 max-w-xs">
                            <div className="truncate text-sm" title={check.notes}>
                              {check.notes || '-'}
                            </div>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {formatDateTime(check.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default DefectsTab;
