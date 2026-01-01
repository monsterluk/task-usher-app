import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { backupsApi, isDemoMode } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Database,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Calendar,
  FileArchive,
  RotateCcw,
  Plus
} from 'lucide-react';

interface Backup {
  filename: string;
  size: number;
  created_at: string;
  type: string;
  description?: string;
}

interface BackupStatus {
  status: 'healthy' | 'warning' | 'no_backups';
  last_backup: {
    filename: string;
    created_at: string;
    size_mb: string;
    hours_ago: number;
  } | null;
  backup_count: number;
  total_backup_size_mb: string;
  database_size_mb: string;
  max_backups: number;
  backup_directory: string;
  recent_failures: any[];
  // Optional fields for demo mode compatibility
  next_scheduled?: string | null;
  auto_backup_enabled?: boolean;
  retention_days?: number;
  total_backups?: number;
  total_size?: number;
}

const BackupsPanel = () => {
  const navigate = useNavigate();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const demoMode = isDemoMode();

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const loadData = useCallback(async () => {
    if (demoMode) {
      setStatus({
        status: 'healthy',
        last_backup: {
          filename: 'plexisystem_backup_2024-12-30_03-00-00.sql.gz',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          size_mb: '10.00',
          hours_ago: 1,
        },
        next_scheduled: new Date(Date.now() + 86400000).toISOString(),
        backup_count: 5,
        total_backup_size_mb: '50.00',
        database_size_mb: '25.00',
        max_backups: 10,
        backup_directory: '/backups',
        recent_failures: [],
        auto_backup_enabled: true,
        retention_days: 30,
        total_backups: 5,
        total_size: 52428800,
      });
      setBackups([
        {
          filename: 'plexisystem_backup_2024-12-30_03-00-00.sql.gz',
          size: 10485760,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          type: 'scheduled',
          description: 'Automatyczny backup codzienny',
        },
        {
          filename: 'plexisystem_backup_2024-12-29_03-00-00.sql.gz',
          size: 10240000,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          type: 'scheduled',
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [statusRes, backupsRes] = await Promise.all([
        backupsApi.getStatus(),
        backupsApi.list(),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
      if (backupsRes.success && backupsRes.data?.backups) {
        setBackups(backupsRes.data.backups);
      }
    } catch (error: any) {
      console.error('Failed to load backup data:', error);
      toast({
        title: 'Blad',
        description: 'Nie udalo sie pobrac danych backupow',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBackup = async () => {
    if (demoMode) {
      toast({ title: 'Tryb demo', description: 'Tworzenie backupu niedostepne w trybie demo' });
      return;
    }

    setCreating(true);
    try {
      const response = await backupsApi.create(description || undefined);
      if (response.success) {
        toast({
          title: 'Backup utworzony',
          description: `Plik: ${response.data?.backup?.filename || 'backup.sql.gz'}`,
        });
        setShowCreateForm(false);
        setDescription('');
        await loadData();
      }
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie utworzyc backupu',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (demoMode) {
      toast({ title: 'Tryb demo', description: 'Usuwanie niedostepne w trybie demo' });
      return;
    }

    if (!confirm(`Czy na pewno chcesz usunac backup: ${filename}?`)) return;

    try {
      const response = await backupsApi.delete(filename);
      if (response.success) {
        toast({ title: 'Usunieto', description: 'Backup zostal usuniety' });
        await loadData();
      }
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie usunac backupu',
        variant: 'destructive',
      });
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (demoMode) {
      toast({ title: 'Tryb demo', description: 'Przywracanie niedostepne w trybie demo' });
      return;
    }

    if (!confirm(`UWAGA! Przywrocenie backupu nadpisze obecne dane.\n\nCzy na pewno chcesz przywrocic: ${filename}?`)) return;

    setRestoring(filename);
    try {
      const response = await backupsApi.restore(filename);
      if (response.success) {
        toast({
          title: 'Przywrocono',
          description: 'Baza danych zostala przywrocona z backupu',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie przywrocic backupu',
        variant: 'destructive',
      });
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-muted-foreground">Ladowanie danych backupow...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Powrot do panelu</span>
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Database size={28} />
            Kopie zapasowe
          </h1>
          <p className="text-sm text-muted-foreground">
            Zarzadzaj backupami bazy danych
          </p>
          {demoMode && (
            <p className="text-xs text-orange-600 mt-1">Tryb demo - operacje niedostepne</p>
          )}
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
          disabled={creating}
        >
          <Plus size={18} className="mr-2" />
          Utworz backup
        </button>
      </div>

      {/* Status cards */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card-industrial">
            <div className="flex items-center gap-3">
              <Clock size={24} className="text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ostatni backup</p>
                <p className="font-semibold">
                  {status.last_backup?.created_at
                    ? new Date(status.last_backup.created_at).toLocaleString('pl-PL')
                    : 'Brak'}
                </p>
              </div>
            </div>
          </div>

          <div className="card-industrial">
            <div className="flex items-center gap-3">
              <Calendar size={24} className="text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Nastepny zaplanowany</p>
                <p className="font-semibold">
                  {status.next_scheduled
                    ? new Date(status.next_scheduled).toLocaleString('pl-PL')
                    : 'Nie zaplanowano'}
                </p>
              </div>
            </div>
          </div>

          <div className="card-industrial">
            <div className="flex items-center gap-3">
              <FileArchive size={24} className="text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Liczba backupow</p>
                <p className="font-semibold">{status.backup_count ?? status.total_backups ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="card-industrial">
            <div className="flex items-center gap-3">
              <HardDrive size={24} className="text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Zajete miejsce</p>
                <p className="font-semibold">
                  {status.total_backup_size_mb
                    ? `${status.total_backup_size_mb} MB`
                    : status.total_size
                      ? formatSize(status.total_size)
                      : '0 MB'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto backup status */}
      {status && (
        <div className="card-industrial mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.status === 'healthy' || status.auto_backup_enabled ? (
                <CheckCircle size={24} className="text-green-600" />
              ) : status.status === 'warning' ? (
                <AlertCircle size={24} className="text-yellow-600" />
              ) : (
                <AlertCircle size={24} className="text-gray-500" />
              )}
              <div>
                <p className="font-medium">
                  Status: {status.status === 'healthy' ? 'Zdrowy' : status.status === 'warning' ? 'Ostrzezenie' : status.auto_backup_enabled ? 'Wlaczone' : 'Brak backupow'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status.max_backups
                    ? `Maksymalnie ${status.max_backups} backupow przechowywanych`
                    : status.retention_days
                      ? `Backupy starsze niz ${status.retention_days} dni sa automatycznie usuwane`
                      : 'Konfiguracja automatycznych backupow'}
                </p>
              </div>
            </div>
            <button onClick={loadData} className="btn-secondary">
              <RefreshCw size={18} className="mr-2" />
              Odswiez
            </button>
          </div>
        </div>
      )}

      {/* Create backup form */}
      {showCreateForm && (
        <div className="card-industrial mb-6 border-2 border-primary">
          <h3 className="font-bold mb-4">Utworz nowy backup</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Opis (opcjonalnie)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input-industrial w-full"
                placeholder="np. Backup przed aktualizacja"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateBackup} disabled={creating} className="btn-primary">
                {creating ? (
                  <>
                    <RefreshCw size={18} className="mr-2 animate-spin" />
                    Tworzenie...
                  </>
                ) : (
                  <>
                    <Database size={18} className="mr-2" />
                    Utworz backup
                  </>
                )}
              </button>
              <button onClick={() => setShowCreateForm(false)} className="btn-secondary">
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backups list */}
      <div className="card-industrial">
        <h2 className="font-bold mb-4">Lista backupow</h2>
        {backups.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Brak zapisanych backupow</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Nazwa pliku</th>
                  <th>Rozmiar</th>
                  <th>Data utworzenia</th>
                  <th>Typ</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(backup => (
                  <tr key={backup.filename}>
                    <td>
                      <div>
                        <p className="font-mono text-sm">{backup.filename}</p>
                        {backup.description && (
                          <p className="text-xs text-muted-foreground">{backup.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="font-mono">{formatSize(backup.size)}</td>
                    <td>{new Date(backup.created_at).toLocaleString('pl-PL')}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs ${
                        backup.type === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        backup.type === 'manual' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {backup.type === 'scheduled' ? 'Automatyczny' : 'Reczny'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRestoreBackup(backup.filename)}
                          disabled={restoring === backup.filename}
                          className="btn-secondary py-1 px-2 text-blue-600"
                          title="Przywroc"
                        >
                          {restoring === backup.filename ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.filename)}
                          className="btn-secondary py-1 px-2 text-red-600"
                          title="Usun"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupsPanel;
