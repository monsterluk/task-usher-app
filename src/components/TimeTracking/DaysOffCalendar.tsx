import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { DayOff, DayOffType, DayOffStatus, DAY_OFF_TYPE_LABELS, DAY_OFF_TYPE_COLORS } from '@/types';
import { timeTrackingApi, isDemoMode } from '@/utils/api';
import { toast } from 'sonner';
import {
  Calendar, Plus, Edit, Trash2, X, Save, Loader2, ChevronLeft, ChevronRight, Check, XCircle
} from 'lucide-react';

// Demo data
const DEMO_DAYS_OFF: DayOff[] = [
  {
    id: 1,
    worker_id: 1,
    worker_name: 'Jan Kowalski',
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear(), new Date().getMonth(), 19).toISOString().split('T')[0],
    type: 'URLOP_WYPOCZYNKOWY',
    status: 'approved',
    notes: 'Wakacje',
    requested_by: 1,
    approved_by: 2,
    approved_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    worker_id: 2,
    worker_name: 'Anna Nowak',
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().split('T')[0],
    type: 'ZWOLNIENIE_LEKARSKIE',
    status: 'approved',
    notes: null,
    requested_by: 2,
    approved_by: 2,
    approved_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DAY_OFF_TYPES: DayOffType[] = [
  'URLOP_WYPOCZYNKOWY',
  'URLOP_NA_ZADANIE',
  'ZWOLNIENIE_LEKARSKIE',
  'URLOP_OKOLICZNOSCIOWY',
  'URLOP_BEZPLATNY',
  'URLOP_MACIERZYNSKI',
  'URLOP_RODZICIELSKI',
  'DELEGACJA',
  'SZKOLENIE',
  'INNE',
];

const STATUS_LABELS: Record<DayOffStatus, string> = {
  pending: 'Oczekujący',
  approved: 'Zatwierdzony',
  rejected: 'Odrzucony',
  cancelled: 'Anulowany',
};

const STATUS_COLORS: Record<DayOffStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const DaysOffCalendar = () => {
  const { workers, currentUser } = useApp();
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDayOff, setEditingDayOff] = useState<DayOff | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Form state
  const [formData, setFormData] = useState({
    worker_id: currentUser?.id || 0,
    start_date: '',
    end_date: '',
    type: 'URLOP_WYPOCZYNKOWY' as DayOffType,
    notes: '',
  });

  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'KIEROWNIK';

  // Load days off for current month
  useEffect(() => {
    loadDaysOff();
  }, [currentDate]);

  const loadDaysOff = async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    if (isDemoMode()) {
      setDaysOff(DEMO_DAYS_OFF);
      setLoading(false);
      return;
    }

    try {
      const response = await timeTrackingApi.getDaysOff({
        start_date: startDate,
        end_date: endDate,
      });
      if (response.success && response.data) {
        setDaysOff(response.data);
      }
    } catch (error) {
      console.error('Failed to load days off:', error);
      setDaysOff([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      worker_id: currentUser?.id || 0,
      start_date: '',
      end_date: '',
      type: 'URLOP_WYPOCZYNKOWY',
      notes: '',
    });
    setEditingDayOff(null);
    setIsFormOpen(false);
  };

  const handleEdit = (dayOff: DayOff) => {
    setEditingDayOff(dayOff);
    setFormData({
      worker_id: dayOff.worker_id,
      start_date: dayOff.start_date,
      end_date: dayOff.end_date,
      type: dayOff.type,
      notes: dayOff.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.worker_id || !formData.start_date || !formData.end_date || !formData.type) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('Data końcowa musi być późniejsza niż początkowa');
      return;
    }

    setSaving(true);
    try {
      if (isDemoMode()) {
        if (editingDayOff) {
          setDaysOff(prev => prev.map(d =>
            d.id === editingDayOff.id
              ? { ...d, ...formData, updated_at: new Date().toISOString() }
              : d
          ));
          toast.success('Wpis zaktualizowany (tryb demo)');
        } else {
          const newDayOff: DayOff = {
            id: Math.max(...daysOff.map(d => d.id), 0) + 1,
            worker_id: formData.worker_id,
            worker_name: workers.find(w => w.id === formData.worker_id)?.name || 'Nieznany',
            start_date: formData.start_date,
            end_date: formData.end_date,
            type: formData.type,
            status: isManager ? 'approved' : 'pending',
            notes: formData.notes || null,
            requested_by: currentUser?.id || 0,
            approved_by: isManager ? currentUser?.id || null : null,
            approved_at: isManager ? new Date().toISOString() : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setDaysOff(prev => [...prev, newDayOff]);
          toast.success('Wpis dodany (tryb demo)');
        }
        resetForm();
      } else {
        if (editingDayOff) {
          const response = await timeTrackingApi.updateDayOff(editingDayOff.id, formData);
          if (response.success) {
            await loadDaysOff();
            toast.success('Wpis zaktualizowany');
            resetForm();
          } else {
            throw new Error(response.error || 'Błąd aktualizacji');
          }
        } else {
          const response = await timeTrackingApi.createDayOff(formData);
          if (response.success) {
            await loadDaysOff();
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

  const handleApprove = async (id: number, status: 'approved' | 'rejected') => {
    if (isDemoMode()) {
      setDaysOff(prev => prev.map(d =>
        d.id === id
          ? { ...d, status, approved_at: new Date().toISOString(), approved_by: currentUser?.id || null }
          : d
      ));
      toast.success(status === 'approved' ? 'Zatwierdzono' : 'Odrzucono');
      return;
    }

    try {
      const response = await timeTrackingApi.approveDayOff(id, status);
      if (response.success) {
        await loadDaysOff();
        toast.success(status === 'approved' ? 'Zatwierdzono' : 'Odrzucono');
      }
    } catch (error) {
      toast.error('Błąd zatwierdzania');
    }
  };

  const handleDelete = async (id: number) => {
    if (!isDemoMode()) {
      try {
        const response = await timeTrackingApi.deleteDayOff(id);
        if (!response.success) {
          toast.error('Błąd usuwania');
          return;
        }
      } catch (error) {
        toast.error('Błąd usuwania');
        return;
      }
    }
    setDaysOff(prev => prev.filter(d => d.id !== id));
    setDeleteConfirm(null);
    toast.success('Wpis usunięty');
  };

  // Navigate months
  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

    const days: (number | null)[] = [];

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // Get days off for a specific date
  const getDaysOffForDate = (day: number): DayOff[] => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    return daysOff.filter(d => {
      return dateStr >= d.start_date && dateStr <= d.end_date && d.status === 'approved';
    });
  };

  const calendarDays = generateCalendarDays();
  const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => changeMonth(-1)} className="btn-secondary p-2">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold min-w-[180px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={() => changeMonth(1)} className="btn-secondary p-2">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
            className="btn-secondary"
          >
            {viewMode === 'calendar' ? 'Lista' : 'Kalendarz'}
          </button>
          <button onClick={() => setIsFormOpen(true)} className="btn-primary">
            <Plus size={18} className="mr-2" />
            Dodaj dzień wolny
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-4 z-50">
          <div className="card-industrial w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingDayOff ? 'Edytuj dzień wolny' : 'Dodaj dzień wolny'}
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
                <label className="block text-sm font-medium mb-2">Typ *</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as DayOffType }))}
                  className="input-industrial"
                >
                  {DAY_OFF_TYPES.map(type => (
                    <option key={type} value={type}>{DAY_OFF_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Data od *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="input-industrial"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Data do *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="input-industrial"
                  />
                </div>
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
          <span>Ładowanie...</span>
        </div>
      )}

      {/* Calendar View */}
      {!loading && viewMode === 'calendar' && (
        <div className="bg-card rounded-lg p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayOffs = day ? getDaysOffForDate(day) : [];
              const isToday = day &&
                new Date().getDate() === day &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div
                  key={index}
                  className={`min-h-[80px] p-1 border rounded ${
                    day ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayOffs.slice(0, 3).map(dayOff => (
                          <div
                            key={dayOff.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${DAY_OFF_TYPE_COLORS[dayOff.type]} text-white`}
                            title={`${dayOff.worker_name}: ${DAY_OFF_TYPE_LABELS[dayOff.type]}`}
                          >
                            {dayOff.worker_name?.split(' ')[0]}
                          </div>
                        ))}
                        {dayOffs.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayOffs.length - 3} więcej
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {DAY_OFF_TYPES.slice(0, 5).map(type => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${DAY_OFF_TYPE_COLORS[type]}`} />
                <span className="text-muted-foreground">{DAY_OFF_TYPE_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <div className="space-y-4">
          {daysOff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>Brak wpisów w tym miesiącu</p>
            </div>
          ) : (
            daysOff.map(dayOff => (
              <div
                key={dayOff.id}
                className={`p-4 rounded-lg border ${
                  dayOff.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : 'bg-card'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold">{dayOff.worker_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[dayOff.status]}`}>
                        {STATUS_LABELS[dayOff.status]}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className={`inline-block px-2 py-1 rounded text-white ${DAY_OFF_TYPE_COLORS[dayOff.type]}`}>
                        {DAY_OFF_TYPE_LABELS[dayOff.type]}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {dayOff.start_date === dayOff.end_date
                        ? new Date(dayOff.start_date).toLocaleDateString('pl-PL')
                        : `${new Date(dayOff.start_date).toLocaleDateString('pl-PL')} - ${new Date(dayOff.end_date).toLocaleDateString('pl-PL')}`
                      }
                    </div>
                    {dayOff.notes && (
                      <div className="mt-1 text-sm text-muted-foreground italic">
                        {dayOff.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isManager && dayOff.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(dayOff.id, 'approved')}
                          className="btn-secondary p-2 text-green-600 hover:bg-green-50"
                          title="Zatwierdź"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleApprove(dayOff.id, 'rejected')}
                          className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                          title="Odrzuć"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    {isManager && (
                      <>
                        <button
                          onClick={() => handleEdit(dayOff)}
                          className="btn-secondary p-2"
                          title="Edytuj"
                        >
                          <Edit size={18} />
                        </button>
                        {deleteConfirm === dayOff.id ? (
                          <button
                            onClick={() => handleDelete(dayOff.id)}
                            className="btn-danger p-2"
                            title="Potwierdź usunięcie"
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(dayOff.id)}
                            className="btn-secondary p-2 text-muted-foreground"
                            title="Usuń"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DaysOffCalendar;
