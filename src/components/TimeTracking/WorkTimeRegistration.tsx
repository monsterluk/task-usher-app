import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { WorkTimeEntry, WorkTimeShift } from '@/types';
import { timeTrackingApi, isDemoMode } from '@/utils/api';
import { toast } from 'sonner';
import {
  Clock, LogIn, LogOut, Plus, Edit, Trash2, X, Save, Loader2, Download, ChevronLeft, ChevronRight
} from 'lucide-react';

// Demo data
const DEMO_ENTRIES: WorkTimeEntry[] = [
  {
    id: 1,
    worker_id: 1,
    worker_name: 'Jan Kowalski',
    worker_position: 'FREZOWANIE',
    entry_time: new Date().toISOString().replace('T', ' ').slice(0, 16).replace(' ', 'T') + ':00.000Z',
    exit_time: null,
    shift: 'DZIEŃ',
    entry_time_smoothed: null,
    exit_time_smoothed: null,
    work_minutes: null,
    work_minutes_smoothed: null,
    overtime_minutes: 0,
    break_minutes: 0,
    notes: null,
    source: 'pin',
    created_by: 1,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SHIFTS: { value: WorkTimeShift; label: string }[] = [
  { value: 'DZIEŃ', label: 'Dzień' },
  { value: 'NOC', label: 'Noc' },
  { value: 'SOBOTA', label: 'Sobota' },
  { value: 'NIEDZIELĘ', label: 'Niedziela' },
];

// Helper: format minutes to hours:minutes
const formatMinutes = (minutes: number | null): string => {
  if (minutes === null || minutes === undefined) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
};

// Helper: format time from ISO string
const formatTime = (isoString: string | null): string => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
};

// Helper: format date from ISO string
const formatDate = (isoString: string | null): string => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const WorkTimeRegistration = () => {
  const { workers, currentUser } = useApp();
  const [entries, setEntries] = useState<WorkTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkTimeEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Date filter
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Form state
  const [formData, setFormData] = useState({
    worker_id: currentUser?.id || 0,
    entry_time: '',
    exit_time: '',
    shift: 'DZIEŃ' as WorkTimeShift,
    notes: '',
  });

  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'KIEROWNIK';

  // Load entries
  useEffect(() => {
    loadEntries();
  }, [filterDate]);

  const loadEntries = async () => {
    setLoading(true);
    if (isDemoMode()) {
      setEntries(DEMO_ENTRIES);
      setLoading(false);
      return;
    }

    try {
      const response = await timeTrackingApi.getEntries({
        start_date: filterDate,
        end_date: filterDate,
        limit: 100,
      });
      if (response.success && response.data) {
        setEntries(response.data);
      }
    } catch (error) {
      console.error('Failed to load entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      worker_id: currentUser?.id || 0,
      entry_time: '',
      exit_time: '',
      shift: 'DZIEŃ',
      notes: '',
    });
    setEditingEntry(null);
    setIsFormOpen(false);
  };

  const handleEdit = (entry: WorkTimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      worker_id: entry.worker_id,
      entry_time: entry.entry_time.slice(0, 16),
      exit_time: entry.exit_time ? entry.exit_time.slice(0, 16) : '',
      shift: entry.shift,
      notes: entry.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.worker_id || !formData.entry_time) {
      toast.error('Wybierz pracownika i czas wejścia');
      return;
    }

    setSaving(true);
    try {
      if (isDemoMode()) {
        // Demo mode
        if (editingEntry) {
          setEntries(prev => prev.map(e =>
            e.id === editingEntry.id
              ? { ...e, ...formData, updated_at: new Date().toISOString() }
              : e
          ));
          toast.success('Wpis zaktualizowany (tryb demo)');
        } else {
          const newEntry: WorkTimeEntry = {
            id: Math.max(...entries.map(e => e.id), 0) + 1,
            worker_id: formData.worker_id,
            worker_name: workers.find(w => w.id === formData.worker_id)?.name || 'Nieznany',
            entry_time: formData.entry_time + ':00.000Z',
            exit_time: formData.exit_time ? formData.exit_time + ':00.000Z' : null,
            shift: formData.shift,
            entry_time_smoothed: null,
            exit_time_smoothed: null,
            work_minutes: null,
            work_minutes_smoothed: null,
            overtime_minutes: 0,
            break_minutes: 0,
            notes: formData.notes || null,
            source: 'manual',
            created_by: currentUser?.id || null,
            approved_by: null,
            approved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setEntries(prev => [newEntry, ...prev]);
          toast.success('Wpis dodany (tryb demo)');
        }
        resetForm();
      } else {
        // Production mode
        if (editingEntry) {
          const response = await timeTrackingApi.updateEntry(editingEntry.id, {
            entry_time: formData.entry_time,
            exit_time: formData.exit_time || undefined,
            shift: formData.shift,
            notes: formData.notes || undefined,
          });
          if (response.success) {
            await loadEntries();
            toast.success('Wpis zaktualizowany');
            resetForm();
          } else {
            throw new Error(response.error || 'Błąd aktualizacji');
          }
        } else {
          const response = await timeTrackingApi.createEntry({
            worker_id: formData.worker_id,
            entry_time: formData.entry_time,
            exit_time: formData.exit_time || undefined,
            shift: formData.shift,
            notes: formData.notes || undefined,
          });
          if (response.success) {
            await loadEntries();
            toast.success('Wpis dodany');
            resetForm();
          } else {
            throw new Error(response.error || 'Błąd dodawania');
          }
        }
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Wystąpił błąd');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!isDemoMode()) {
      try {
        const response = await timeTrackingApi.deleteEntry(entryId);
        if (response.success) {
          toast.success('Wpis usunięty');
        }
      } catch (error) {
        toast.error('Błąd usuwania');
        return;
      }
    }
    setEntries(prev => prev.filter(e => e.id !== entryId));
    setDeleteConfirm(null);
    if (isDemoMode()) {
      toast.success('Wpis usunięty (tryb demo)');
    }
  };

  // Quick clock in for current user
  const handleClockIn = async () => {
    setSaving(true);
    try {
      if (isDemoMode()) {
        const newEntry: WorkTimeEntry = {
          id: Math.max(...entries.map(e => e.id), 0) + 1,
          worker_id: currentUser?.id || 0,
          worker_name: currentUser?.name || 'Nieznany',
          entry_time: new Date().toISOString(),
          exit_time: null,
          shift: 'DZIEŃ',
          entry_time_smoothed: null,
          exit_time_smoothed: null,
          work_minutes: null,
          work_minutes_smoothed: null,
          overtime_minutes: 0,
          break_minutes: 0,
          notes: null,
          source: 'pin',
          created_by: currentUser?.id || null,
          approved_by: null,
          approved_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setEntries(prev => [newEntry, ...prev]);
        toast.success('Zarejestrowano wejście (tryb demo)');
      } else {
        const response = await timeTrackingApi.clockIn();
        if (response.success) {
          await loadEntries();
          toast.success('Zarejestrowano wejście');
        } else {
          throw new Error(response.error || 'Błąd rejestracji');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Błąd rejestracji wejścia');
    } finally {
      setSaving(false);
    }
  };

  // Quick clock out for current user
  const handleClockOut = async () => {
    setSaving(true);
    try {
      if (isDemoMode()) {
        const openEntry = entries.find(e =>
          e.worker_id === currentUser?.id && !e.exit_time
        );
        if (openEntry) {
          const exitTime = new Date();
          const entryTime = new Date(openEntry.entry_time);
          const workMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / (1000 * 60));

          setEntries(prev => prev.map(e =>
            e.id === openEntry.id
              ? {
                  ...e,
                  exit_time: exitTime.toISOString(),
                  work_minutes: workMinutes,
                  work_minutes_smoothed: workMinutes,
                  overtime_minutes: workMinutes > 480 ? workMinutes - 480 : 0,
                  updated_at: exitTime.toISOString(),
                }
              : e
          ));
          toast.success('Zarejestrowano wyjście (tryb demo)');
        } else {
          toast.error('Brak aktywnego wejścia');
        }
      } else {
        const response = await timeTrackingApi.clockOut();
        if (response.success) {
          await loadEntries();
          toast.success('Zarejestrowano wyjście');
        } else {
          throw new Error(response.error || 'Błąd rejestracji');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Błąd rejestracji wyjścia');
    } finally {
      setSaving(false);
    }
  };

  // Check if current user has open entry
  const hasOpenEntry = entries.some(e => e.worker_id === currentUser?.id && !e.exit_time);

  // Navigate dates
  const changeDate = (days: number) => {
    const date = new Date(filterDate);
    date.setDate(date.getDate() + days);
    setFilterDate(date.toISOString().split('T')[0]);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Pracownik', 'Wejście', 'Wyjście', 'Wejście wygładzone', 'Wyjście wygładzone', 'Czas pracy', 'Czas wygładzony', 'Nadgodziny', 'Zmiana'];
    const rows = entries.map(e => [
      formatDate(e.entry_time),
      e.worker_name || '',
      formatTime(e.entry_time),
      formatTime(e.exit_time),
      formatTime(e.entry_time_smoothed),
      formatTime(e.exit_time_smoothed),
      formatMinutes(e.work_minutes),
      formatMinutes(e.work_minutes_smoothed),
      formatMinutes(e.overtime_minutes),
      e.shift,
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `czas_pracy_${filterDate}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        {!hasOpenEntry ? (
          <button
            onClick={handleClockIn}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            Zarejestruj wejście
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            disabled={saving}
            className="btn-secondary flex items-center gap-2 bg-orange-500 text-white hover:bg-orange-600"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
            Zarejestruj wyjście
          </button>
        )}

        {isManager && (
          <>
            <button
              onClick={() => setIsFormOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus size={18} />
              Dodaj wpis
            </button>
            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              Eksport CSV
            </button>
          </>
        )}
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => changeDate(-1)} className="btn-secondary p-2">
          <ChevronLeft size={20} />
        </button>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="input-industrial max-w-[180px]"
        />
        <button onClick={() => changeDate(1)} className="btn-secondary p-2">
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
          className="btn-secondary text-sm"
        >
          Dziś
        </button>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-4 z-50">
          <div className="card-industrial w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingEntry ? 'Edytuj wpis' : 'Dodaj wpis'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-md">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {isManager && (
                <div>
                  <label className="block text-sm font-medium mb-2">Pracownik *</label>
                  <select
                    value={formData.worker_id}
                    onChange={e => setFormData(prev => ({ ...prev, worker_id: parseInt(e.target.value) }))}
                    className="input-industrial"
                  >
                    <option value="">-- Wybierz pracownika --</option>
                    {workers.filter(w => w.active).map(worker => (
                      <option key={worker.id} value={worker.id}>{worker.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Czas wejścia *</label>
                <input
                  type="datetime-local"
                  value={formData.entry_time}
                  onChange={e => setFormData(prev => ({ ...prev, entry_time: e.target.value }))}
                  className="input-industrial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Czas wyjścia</label>
                <input
                  type="datetime-local"
                  value={formData.exit_time}
                  onChange={e => setFormData(prev => ({ ...prev, exit_time: e.target.value }))}
                  className="input-industrial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Zmiana</label>
                <select
                  value={formData.shift}
                  onChange={e => setFormData(prev => ({ ...prev, shift: e.target.value as WorkTimeShift }))}
                  className="input-industrial"
                >
                  {SHIFTS.map(shift => (
                    <option key={shift.value} value={shift.value}>{shift.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notatki</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-industrial min-h-[60px]"
                  placeholder="Opcjonalne uwagi..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
                  {saving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
                <button onClick={resetForm} disabled={saving} className="btn-secondary flex-1">
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin mr-2" size={24} />
          <span>Ładowanie wpisów...</span>
        </div>
      )}

      {/* Table */}
      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-industrial w-full">
            <thead>
              <tr>
                <th>Pracownik</th>
                <th>Wejście</th>
                <th>Wyjście</th>
                <th className="text-center">Wejście wygładzone</th>
                <th className="text-center">Wyjście wygładzone</th>
                <th className="text-center">Czas pracy</th>
                <th className="text-center">Czas wygładzony</th>
                <th className="text-center">Nadgodziny</th>
                <th>Zmiana</th>
                {isManager && <th>Akcje</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className={!entry.exit_time ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                  <td className="font-semibold">{entry.worker_name}</td>
                  <td className="font-mono text-sm">{formatTime(entry.entry_time)}</td>
                  <td className="font-mono text-sm">
                    {entry.exit_time ? formatTime(entry.exit_time) : (
                      <span className="text-green-600 font-semibold">W pracy</span>
                    )}
                  </td>
                  <td className="text-center font-mono text-sm text-muted-foreground">
                    {formatTime(entry.entry_time_smoothed)}
                  </td>
                  <td className="text-center font-mono text-sm text-muted-foreground">
                    {formatTime(entry.exit_time_smoothed)}
                  </td>
                  <td className="text-center font-mono">{formatMinutes(entry.work_minutes)}</td>
                  <td className="text-center font-mono font-semibold">{formatMinutes(entry.work_minutes_smoothed)}</td>
                  <td className={`text-center font-mono ${entry.overtime_minutes > 0 ? 'text-orange-600 font-bold' : ''}`}>
                    {formatMinutes(entry.overtime_minutes)}
                  </td>
                  <td>{entry.shift}</td>
                  {isManager && (
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-1 hover:bg-muted rounded"
                          title="Edytuj"
                        >
                          <Edit size={16} />
                        </button>
                        {deleteConfirm === entry.id ? (
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1 hover:bg-destructive/20 rounded text-destructive"
                            title="Potwierdź"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(entry.id)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground"
                            title="Usuń"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p>Brak wpisów na wybrany dzień</p>
        </div>
      )}
    </div>
  );
};

export default WorkTimeRegistration;
