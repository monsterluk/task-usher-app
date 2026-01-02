import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { DayOff, DayOffType, DayOffStatus, DAY_OFF_TYPE_LABELS, DAY_OFF_TYPE_COLORS } from '@/types';
import { timeTrackingApi, isDemoMode } from '@/utils/api';
import { toast } from 'sonner';
import {
  Palmtree, Plus, X, Save, Loader2, Calendar, Clock, Check, XCircle, ArrowLeft, FileText
} from 'lucide-react';

const DAY_OFF_TYPES: DayOffType[] = [
  'URLOP_WYPOCZYNKOWY',
  'URLOP_NA_ZADANIE',
  'URLOP_OKOLICZNOSCIOWY',
  'URLOP_BEZPLATNY',
  'INNE',
];

const STATUS_LABELS: Record<DayOffStatus, string> = {
  pending: 'Oczekuje na akceptację',
  approved: 'Zatwierdzony',
  rejected: 'Odrzucony',
  cancelled: 'Anulowany',
};

const STATUS_COLORS: Record<DayOffStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
};

const STATUS_ICONS: Record<DayOffStatus, any> = {
  pending: Clock,
  approved: Check,
  rejected: XCircle,
  cancelled: X,
};

// Demo data for worker's own requests
const DEMO_MY_REQUESTS: DayOff[] = [
  {
    id: 1,
    worker_id: 1,
    worker_name: 'Demo User',
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'URLOP_WYPOCZYNKOWY',
    status: 'pending',
    notes: 'Wakacje rodzinne',
    requested_by: 1,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    worker_id: 1,
    worker_name: 'Demo User',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'URLOP_NA_ZADANIE',
    status: 'approved',
    notes: 'Wizyta u lekarza',
    requested_by: 1,
    approved_by: 2,
    approved_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MyLeaveRequests = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [requests, setRequests] = useState<DayOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    type: 'URLOP_WYPOCZYNKOWY' as DayOffType,
    notes: '',
  });

  useEffect(() => {
    loadMyRequests();
  }, [currentUser]);

  const loadMyRequests = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (isDemoMode()) {
      setRequests(DEMO_MY_REQUESTS);
      setLoading(false);
      return;
    }

    try {
      const response = await timeTrackingApi.getDaysOff({
        worker_id: currentUser.id,
      });
      // Handle different response formats
      const data = Array.isArray(response) ? response : (response.data || response || []);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      start_date: '',
      end_date: '',
      type: 'URLOP_WYPOCZYNKOWY',
      notes: '',
    });
    setIsFormOpen(false);
  };

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async () => {
    if (!formData.start_date || !formData.end_date) {
      toast.error('Wybierz daty urlopu');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('Data końcowa musi być późniejsza niż początkowa');
      return;
    }

    if (!currentUser) {
      toast.error('Nie jesteś zalogowany');
      return;
    }

    setSaving(true);
    try {
      if (isDemoMode()) {
        const newRequest: DayOff = {
          id: Math.max(...requests.map(r => r.id), 0) + 1,
          worker_id: currentUser.id,
          worker_name: currentUser.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          type: formData.type,
          status: 'pending',
          notes: formData.notes || null,
          requested_by: currentUser.id,
          approved_by: null,
          approved_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setRequests(prev => [newRequest, ...prev]);
        toast.success('Wniosek złożony! (tryb demo)');
        resetForm();
      } else {
        const response = await timeTrackingApi.createDayOff({
          worker_id: currentUser.id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          type: formData.type,
          notes: formData.notes || undefined,
        });

        if (response && (response.id || response.success)) {
          await loadMyRequests();
          toast.success('Wniosek urlopowy został złożony!');
          resetForm();
        } else {
          throw new Error('Błąd składania wniosku');
        }
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Wystąpił błąd przy składaniu wniosku');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pastRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/worker')}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Palmtree className="text-green-500" size={32} />
              Moje wnioski urlopowe
            </h1>
            <p className="text-muted-foreground">Składaj i śledź status swoich wniosków</p>
          </div>
        </div>

        {/* New Request Button */}
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full mb-6 p-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
        >
          <Plus size={28} />
          <span className="text-xl font-bold">Złóż nowy wniosek urlopowy</span>
        </button>

        {/* Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileText size={24} />
                    Nowy wniosek urlopowy
                  </h2>
                  <button onClick={resetForm} className="p-2 hover:bg-white/20 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Rodzaj urlopu</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as DayOffType }))}
                    className="w-full p-3 border-2 rounded-xl focus:border-green-500 focus:ring-0 transition-colors"
                  >
                    {DAY_OFF_TYPES.map(type => (
                      <option key={type} value={type}>{DAY_OFF_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Od</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        start_date: e.target.value,
                        end_date: prev.end_date < e.target.value ? e.target.value : prev.end_date
                      }))}
                      className="w-full p-3 border-2 rounded-xl focus:border-green-500 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Do</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      min={formData.start_date || new Date().toISOString().split('T')[0]}
                      onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full p-3 border-2 rounded-xl focus:border-green-500 focus:ring-0"
                    />
                  </div>
                </div>

                {formData.start_date && formData.end_date && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center">
                    <span className="text-3xl font-bold text-green-600">
                      {calculateDays(formData.start_date, formData.end_date)}
                    </span>
                    <span className="text-green-600 ml-2">
                      {calculateDays(formData.start_date, formData.end_date) === 1 ? 'dzień' : 'dni'}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-2">Powód / uwagi (opcjonalnie)</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-3 border-2 rounded-xl focus:border-green-500 focus:ring-0 min-h-[80px] resize-none"
                    placeholder="Np. wakacje rodzinne, sprawy osobiste..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !formData.start_date || !formData.end_date}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Save size={20} />
                    )}
                    {saving ? 'Wysyłanie...' : 'Złóż wniosek'}
                  </button>
                  <button
                    onClick={resetForm}
                    disabled={saving}
                    className="px-6 py-4 border-2 rounded-xl font-bold hover:bg-muted transition-colors"
                  >
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
            <Loader2 className="animate-spin mr-3" size={32} />
            <span className="text-lg">Ładowanie wniosków...</span>
          </div>
        )}

        {/* Pending Requests */}
        {!loading && pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="text-yellow-500" size={22} />
              Oczekujące na akceptację ({pendingRequests.length})
            </h2>
            <div className="space-y-4">
              {pendingRequests.map(request => {
                const StatusIcon = STATUS_ICONS[request.status];
                return (
                  <div
                    key={request.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg border-l-4 ${STATUS_COLORS[request.status].split(' ')[2]}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[request.status]}`}>
                            <StatusIcon size={14} />
                            {STATUS_LABELS[request.status]}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm text-white ${DAY_OFF_TYPE_COLORS[request.type]}`}>
                            {DAY_OFF_TYPE_LABELS[request.type]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-lg font-semibold">
                          <Calendar size={18} className="text-muted-foreground" />
                          {request.start_date === request.end_date ? (
                            formatDate(request.start_date)
                          ) : (
                            <>{formatDate(request.start_date)} — {formatDate(request.end_date)}</>
                          )}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {calculateDays(request.start_date, request.end_date)} {calculateDays(request.start_date, request.end_date) === 1 ? 'dzień' : 'dni'}
                        </div>
                        {request.notes && (
                          <p className="mt-2 text-sm text-muted-foreground italic">
                            "{request.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Requests */}
        {!loading && pastRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="text-muted-foreground" size={22} />
              Historia wniosków ({pastRequests.length})
            </h2>
            <div className="space-y-3">
              {pastRequests.map(request => {
                const StatusIcon = STATUS_ICONS[request.status];
                return (
                  <div
                    key={request.id}
                    className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow border-l-4 border-gray-200"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                          <StatusIcon size={12} />
                          {STATUS_LABELS[request.status]}
                        </span>
                        <span className="text-sm font-medium">
                          {request.start_date === request.end_date ? (
                            formatDate(request.start_date)
                          ) : (
                            <>{new Date(request.start_date).toLocaleDateString('pl-PL')} - {new Date(request.end_date).toLocaleDateString('pl-PL')}</>
                          )}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs text-white ${DAY_OFF_TYPE_COLORS[request.type]}`}>
                        {DAY_OFF_TYPE_LABELS[request.type]}
                      </span>
                    </div>
                    {request.notes && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {request.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="text-center py-16">
            <Palmtree size={64} className="mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">Brak wniosków urlopowych</h3>
            <p className="text-muted-foreground mb-6">
              Nie złożyłeś jeszcze żadnego wniosku o urlop
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Złóż pierwszy wniosek
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLeaveRequests;
