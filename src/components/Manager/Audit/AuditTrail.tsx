import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  History,
  Filter,
  Search,
  RefreshCw,
  FileText,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Archive,
  RotateCcw
} from 'lucide-react';
import { auditApi, isDemoMode } from '@/utils/api';
import { useApp } from '@/context/AppContext';

interface AuditLog {
  id: number;
  table_name: string;
  record_id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESTORE';
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_fields: string[] | null;
  user_id: number | null;
  user_email: string | null;
  user_role: string | null;
  ip_address: string | null;
  created_at: string;
}

const AuditTrail = () => {
  const navigate = useNavigate();
  const { workers } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    table_name: '',
    action: '',
    user_id: '',
    from_date: '',
    to_date: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    if (isDemoMode()) {
      // Demo data
      setLogs([
        {
          id: 1,
          table_name: 'orders',
          record_id: 156,
          action: 'UPDATE',
          old_values: { status: 'W_PRODUKCJI' },
          new_values: { status: 'GOTOWE' },
          changed_fields: ['status'],
          user_id: 1,
          user_email: 'kierownik@plexisystem.pl',
          user_role: 'KIEROWNIK',
          ip_address: '192.168.1.100',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          table_name: 'orders',
          record_id: 157,
          action: 'CREATE',
          old_values: null,
          new_values: { order_number: 'ZLC-2024-0157', client_name: 'ABC Sp. z o.o.' },
          changed_fields: null,
          user_id: 2,
          user_email: 'handlowiec@plexisystem.pl',
          user_role: 'HANDLOWIEC',
          ip_address: '192.168.1.101',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 3,
          table_name: 'workers',
          record_id: 5,
          action: 'UPDATE',
          old_values: { hourly_rate: 45.00 },
          new_values: { hourly_rate: 50.00 },
          changed_fields: ['hourly_rate'],
          user_id: 1,
          user_email: 'admin@plexisystem.pl',
          user_role: 'ADMIN',
          ip_address: '192.168.1.1',
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 4,
          table_name: 'orders',
          record_id: 150,
          action: 'ARCHIVE',
          old_values: { archived: false },
          new_values: { archived: true },
          changed_fields: ['archived'],
          user_id: 1,
          user_email: 'kierownik@plexisystem.pl',
          user_role: 'KIEROWNIK',
          ip_address: '192.168.1.100',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      const response = await auditApi.getLogs({
        table_name: filters.table_name || undefined,
        action: filters.action || undefined,
        user_id: filters.user_id ? parseInt(filters.user_id) : undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
        limit: 100,
      });

      setLogs(response.data?.logs || []);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      setError(err.response?.data?.error || 'Blad podczas ladowania logow');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <Plus size={16} className="text-green-600" />;
      case 'UPDATE': return <Pencil size={16} className="text-blue-600" />;
      case 'DELETE': return <Trash2 size={16} className="text-red-600" />;
      case 'ARCHIVE': return <Archive size={16} className="text-orange-600" />;
      case 'RESTORE': return <RotateCcw size={16} className="text-purple-600" />;
      default: return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE': return 'Utworzenie';
      case 'UPDATE': return 'Aktualizacja';
      case 'DELETE': return 'Usuniecie';
      case 'ARCHIVE': return 'Archiwizacja';
      case 'RESTORE': return 'Przywrocenie';
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'UPDATE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'DELETE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'ARCHIVE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'RESTORE': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      orders: 'Zlecenia',
      workers: 'Pracownicy',
      stages: 'Etapy',
      machines: 'Maszyny',
      quality_checks: 'Kontrole jakosci',
      defects: 'Wady',
      maintenance_schedules: 'Konserwacje',
      documents: 'Dokumenty',
    };
    return labels[table] || table;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Tak' : 'Nie';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const handleFilter = () => {
    loadLogs();
  };

  const clearFilters = () => {
    setFilters({
      table_name: '',
      action: '',
      user_id: '',
      from_date: '',
      to_date: '',
    });
  };

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
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <History size={28} />
            Audit Trail
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-primary text-primary-foreground' : ''}`}
          >
            <Filter size={18} className="mr-2" />
            Filtry
          </button>
          <button onClick={loadLogs} className="btn-secondary p-2">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card-industrial mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tabela</label>
              <select
                value={filters.table_name}
                onChange={(e) => setFilters({ ...filters, table_name: e.target.value })}
                className="input-industrial w-full"
              >
                <option value="">Wszystkie</option>
                <option value="orders">Zlecenia</option>
                <option value="workers">Pracownicy</option>
                <option value="stages">Etapy</option>
                <option value="machines">Maszyny</option>
                <option value="quality_checks">Kontrole jakosci</option>
                <option value="defects">Wady</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Akcja</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="input-industrial w-full"
              >
                <option value="">Wszystkie</option>
                <option value="CREATE">Utworzenie</option>
                <option value="UPDATE">Aktualizacja</option>
                <option value="DELETE">Usuniecie</option>
                <option value="ARCHIVE">Archiwizacja</option>
                <option value="RESTORE">Przywrocenie</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Od daty</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                className="input-industrial w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Do daty</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                className="input-industrial w-full"
              />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleFilter} className="btn-primary flex-1">
                <Search size={16} className="mr-2" />
                Szukaj
              </button>
              <button onClick={clearFilters} className="btn-secondary">
                Wyczysc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card-industrial bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin" size={32} />
          <span className="ml-2">Ladowanie logow...</span>
        </div>
      ) : (
        /* Logs Table */
        <div className="card-industrial">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-semibold">Data</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold">Akcja</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold">Tabela</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold">ID rekordu</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold">Uzytkownik</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold">IP</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold">Szczegoly</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      Brak logow do wyswietlenia
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <>
                      <tr
                        key={log.id}
                        className="border-b border-border hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <td className="py-3 px-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-muted-foreground" />
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)}
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-sm font-medium">
                          {getTableLabel(log.table_name)}
                        </td>
                        <td className="py-3 px-2 text-sm font-mono">
                          #{log.record_id}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-muted-foreground" />
                            <div>
                              <div>{log.user_email || 'System'}</div>
                              <div className="text-xs text-muted-foreground">{log.user_role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground font-mono">
                          {log.ip_address || '-'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {expandedLog === log.id ? (
                            <ChevronUp size={18} className="inline text-muted-foreground" />
                          ) : (
                            <ChevronDown size={18} className="inline text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr key={`${log.id}-details`} className="bg-muted/20">
                          <td colSpan={7} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {log.changed_fields && log.changed_fields.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 text-sm">Zmienione pola:</h4>
                                  <div className="text-sm space-y-1">
                                    {log.changed_fields.map((field) => (
                                      <div key={field} className="flex items-center gap-2">
                                        <span className="font-mono bg-muted px-2 py-0.5 rounded">{field}</span>
                                        {log.old_values && log.new_values && (
                                          <span className="text-muted-foreground">
                                            {formatValue(log.old_values[field])}
                                            {' → '}
                                            <span className="text-foreground font-medium">
                                              {formatValue(log.new_values[field])}
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {log.action === 'CREATE' && log.new_values && (
                                <div>
                                  <h4 className="font-semibold mb-2 text-sm">Utworzone dane:</h4>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.action === 'DELETE' && log.old_values && (
                                <div>
                                  <h4 className="font-semibold mb-2 text-sm">Usuniete dane:</h4>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
            Wyswietlono {logs.length} logow
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 card-industrial bg-muted/30">
        <h3 className="font-semibold mb-2">Informacje o Audit Trail</h3>
        <p className="text-sm text-muted-foreground">
          Audit Trail rejestruje wszystkie zmiany w systemie zgodnie z wymogami ISO 9001.
          Kazda operacja (tworzenie, edycja, usuwanie, archiwizacja) jest logowana z informacja
          o uzytkowniku, dacie i adresie IP. Logi sa przechowywane przez minimum 5 lat.
        </p>
      </div>
    </div>
  );
};

export default AuditTrail;
