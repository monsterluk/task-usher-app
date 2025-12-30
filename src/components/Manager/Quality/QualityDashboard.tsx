import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Filter,
  Plus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertOctagon,
  Loader2
} from 'lucide-react';
import { qualityApi } from '@/utils/api';
import { isDemoMode } from '@/utils/api';

interface QualityStats {
  checks: {
    total_checks: number;
    passed: number;
    failed: number;
    pending: number;
    conditional: number;
    pass_rate: string;
  };
  defects: {
    total_defects: number;
    open: number;
    in_progress: number;
    resolved: number;
    critical: number;
    major: number;
    minor: number;
    cosmetic: number;
    total_cost_impact: number;
  };
  defects_by_type: Array<{ defect_type: string; count: number }>;
}

interface Defect {
  id: number;
  order_id: number;
  order_number: string;
  defect_type: string;
  severity: 'cosmetic' | 'minor' | 'major' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  description: string;
  reported_by_name: string;
  created_at: string;
}

const QualityDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [recentDefects, setRecentDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'critical'>('open');
  const [showNewCheckModal, setShowNewCheckModal] = useState(false);
  const [newCheck, setNewCheck] = useState({
    order_number: '',
    check_type: 'in_process' as 'incoming' | 'in_process' | 'final',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (isDemoMode()) {
      // Demo data
      setStats({
        checks: {
          total_checks: 156,
          passed: 142,
          failed: 8,
          pending: 4,
          conditional: 2,
          pass_rate: '94.7',
        },
        defects: {
          total_defects: 23,
          open: 5,
          in_progress: 3,
          resolved: 15,
          critical: 1,
          major: 4,
          minor: 12,
          cosmetic: 6,
          total_cost_impact: 2450,
        },
        defects_by_type: [
          { defect_type: 'Wymiary', count: 8 },
          { defect_type: 'Powierzchnia', count: 6 },
          { defect_type: 'Kolor', count: 4 },
          { defect_type: 'Montaz', count: 3 },
          { defect_type: 'Inne', count: 2 },
        ],
      });
      setRecentDefects([
        {
          id: 1,
          order_id: 101,
          order_number: 'ZLC-2024-0156',
          defect_type: 'Wymiary',
          severity: 'major',
          status: 'open',
          description: 'Przekroczenie tolerancji wymiarowej o 2mm',
          reported_by_name: 'Jan Kowalski',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          order_id: 102,
          order_number: 'ZLC-2024-0155',
          defect_type: 'Powierzchnia',
          severity: 'minor',
          status: 'in_progress',
          description: 'Drobne zarysowania na powierzchni',
          reported_by_name: 'Anna Nowak',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          order_id: 103,
          order_number: 'ZLC-2024-0154',
          defect_type: 'Kolor',
          severity: 'cosmetic',
          status: 'open',
          description: 'Lekka roznica odcienia',
          reported_by_name: 'Piotr Wisniewski',
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      const [statsRes, defectsRes] = await Promise.all([
        qualityApi.getStats(),
        qualityApi.getDefects({ status: filter === 'all' ? undefined : filter }),
      ]);
      setStats(statsRes.data);
      setRecentDefects(defectsRes.data.defects.slice(0, 10));
    } catch (error) {
      console.error('Error loading QC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'major': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'minor': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'cosmetic': return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-600';
      case 'in_progress': return 'text-yellow-600';
      case 'resolved': return 'text-green-600';
      case 'accepted': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle size={16} />;
      case 'in_progress': return <Clock size={16} />;
      case 'resolved': return <CheckCircle2 size={16} />;
      case 'accepted': return <CheckCircle2 size={16} />;
      default: return null;
    }
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
          <h1 className="text-2xl md:text-3xl font-bold">Kontrola Jakosci</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <Filter size={18} className="mr-2" />
            Filtry
          </button>
          <button className="btn-primary" onClick={() => setShowNewCheckModal(true)}>
            <Plus size={18} className="mr-2" />
            Nowa kontrola
          </button>
        </div>
      </div>

      {/* New Check Modal */}
      {showNewCheckModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Nowa kontrola jakosci</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Numer zlecenia</label>
                <input
                  type="text"
                  value={newCheck.order_number}
                  onChange={(e) => setNewCheck({ ...newCheck, order_number: e.target.value })}
                  className="input-industrial w-full"
                  placeholder="np. ZLC-2024-0156"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Typ kontroli</label>
                <select
                  value={newCheck.check_type}
                  onChange={(e) => setNewCheck({ ...newCheck, check_type: e.target.value as any })}
                  className="input-industrial w-full"
                >
                  <option value="incoming">Wejsciowa (materialy)</option>
                  <option value="in_process">W trakcie produkcji</option>
                  <option value="final">Koncowa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Uwagi</label>
                <textarea
                  value={newCheck.notes}
                  onChange={(e) => setNewCheck({ ...newCheck, notes: e.target.value })}
                  className="input-industrial w-full"
                  rows={3}
                  placeholder="Opcjonalne uwagi do kontroli..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  // TODO: Save to API
                  console.log('New check:', newCheck);
                  setShowNewCheckModal(false);
                  setNewCheck({ order_number: '', check_type: 'in_process', notes: '' });
                }}
                className="btn-primary flex-1"
              >
                Rozpocznij kontrole
              </button>
              <button
                onClick={() => setShowNewCheckModal(false)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card-industrial">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wskaznik jakosci</p>
                <p className="text-3xl font-bold text-green-600">{stats.checks.pass_rate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.checks.passed} / {Number(stats.checks.passed) + Number(stats.checks.failed)} kontroli
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="card-industrial">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Otwarte wady</p>
                <p className="text-3xl font-bold text-red-600">{stats.defects.open}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.defects.in_progress} w trakcie naprawy
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
            </div>
          </div>

          <div className="card-industrial">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Krytyczne</p>
                <p className={`text-3xl font-bold ${stats.defects.critical > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.defects.critical}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.defects.major} powaznych
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stats.defects.critical > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                <AlertOctagon size={24} className={stats.defects.critical > 0 ? 'text-red-600' : 'text-green-600'} />
              </div>
            </div>
          </div>

          <div className="card-industrial">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Koszty wad</p>
                <p className="text-3xl font-bold text-orange-600">
                  {Number(stats.defects.total_cost_impact).toLocaleString('pl-PL')} zl
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Calkowity wplyw finansowy
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <TrendingDown size={24} className="text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Defects by Type Chart */}
        {stats && (
          <div className="card-industrial">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 size={20} />
              Wady wg typu
            </h2>
            <div className="space-y-3">
              {stats.defects_by_type.map((item, index) => {
                const maxCount = Math.max(...stats.defects_by_type.map(d => d.count));
                const percentage = (item.count / maxCount) * 100;
                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.defect_type}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quality Checks Summary */}
        {stats && (
          <div className="card-industrial">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} />
              Kontrole jakosci
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-600" size={20} />
                  <span>Pozytywne</span>
                </div>
                <span className="font-bold text-green-600">{stats.checks.passed}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="text-red-600" size={20} />
                  <span>Negatywne</span>
                </div>
                <span className="font-bold text-red-600">{stats.checks.failed}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="text-yellow-600" size={20} />
                  <span>Oczekujace</span>
                </div>
                <span className="font-bold text-yellow-600">{stats.checks.pending}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-blue-600" size={20} />
                  <span>Warunkowe</span>
                </div>
                <span className="font-bold text-blue-600">{stats.checks.conditional}</span>
              </div>
            </div>
          </div>
        )}

        {/* Defects by Severity */}
        {stats && (
          <div className="card-industrial">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle size={20} />
              Wady wg waznosci
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span>Krytyczne</span>
                <span className="font-bold text-red-600">{stats.defects.critical}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <span>Powazne</span>
                <span className="font-bold text-orange-600">{stats.defects.major}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span>Drobne</span>
                <span className="font-bold text-yellow-600">{stats.defects.minor}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
                <span>Kosmetyczne</span>
                <span className="font-bold text-gray-600">{stats.defects.cosmetic}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Defects */}
      <div className="mt-6 card-industrial">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle size={20} />
            Ostatnie wady
          </h2>
          <div className="flex gap-2">
            {(['open', 'all', 'critical'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {f === 'all' ? 'Wszystkie' : f === 'open' ? 'Otwarte' : 'Krytyczne'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-semibold">Zlecenie</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Typ wady</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Waznosc</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Status</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Opis</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Zglaszajacy</th>
              </tr>
            </thead>
            <tbody>
              {recentDefects.map(defect => (
                <tr
                  key={defect.id}
                  className="border-b border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/manager/orders/${defect.order_id}`)}
                >
                  <td className="py-3 px-2">
                    <span className="font-mono font-semibold">{defect.order_number}</span>
                  </td>
                  <td className="py-3 px-2">{defect.defect_type}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(defect.severity)}`}>
                      {defect.severity === 'critical' ? 'Krytyczna' :
                       defect.severity === 'major' ? 'Powazna' :
                       defect.severity === 'minor' ? 'Drobna' : 'Kosmetyczna'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`flex items-center gap-1 ${getStatusColor(defect.status)}`}>
                      {getStatusIcon(defect.status)}
                      {defect.status === 'open' ? 'Otwarta' :
                       defect.status === 'in_progress' ? 'W trakcie' :
                       defect.status === 'resolved' ? 'Rozwiazana' : 'Zaakceptowana'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-muted-foreground truncate max-w-xs block">
                      {defect.description}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm">{defect.reported_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentDefects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Brak wad do wyswietlenia
          </div>
        )}
      </div>
    </div>
  );
};

export default QualityDashboard;
