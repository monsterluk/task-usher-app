import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Worker, Position, UserRole, ROLE_LABELS } from '@/types';
import { positions } from '@/data/mockData';
import { Plus, Download, Edit, X, Save, UserCheck, UserX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { workersApi, isDemoMode } from '@/utils/api';

// Helper do wyświetlania roli
const getRoleDisplay = (role: UserRole): string => {
  return ROLE_LABELS[role] || role;
};

// Helper do sprawdzenia czy rola jest kierownicza
const isManagerRole = (role: UserRole): boolean => {
  return ['ADMIN', 'KIEROWNIK'].includes(role);
};

const WorkersList = () => {
  console.log('[WorkersList] Component rendering...');
  const { workers, setWorkers, refreshWorkers, currentUser } = useApp();
  console.log('[WorkersList] workers from context:', Array.isArray(workers), workers?.length);

  // Only admin can see/edit hourly rates
  const isAdmin = currentUser?.role === 'ADMIN';
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: 'GRAFIK' as Position,
    hourly_rate: 43.27,
    role: 'PRACOWNIK' as UserRole,
    active: true
  });

  // Load workers from API on mount
  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    console.log('[WorkersList] loadWorkers called, isDemoMode:', isDemoMode());
    if (isDemoMode()) return; // Use context data in demo mode

    setLoading(true);
    try {
      console.log('[WorkersList] Calling API...');
      const response = await workersApi.getAll();
      console.log('[WorkersList] API response:', response);
      if (response.success && response.data?.workers) {
        console.log('[WorkersList] Setting workers:', response.data.workers.length);
        setWorkers(response.data.workers);
      }
    } catch (error) {
      console.error('[WorkersList] Failed to load workers:', error);
      // Keep using context data as fallback
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      position: 'GRAFIK',
      hourly_rate: 43.27,
      role: 'PRACOWNIK',
      active: true
    });
    setEditingWorker(null);
    setIsFormOpen(false);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      email: worker.email,
      position: worker.position,
      hourly_rate: worker.hourly_rate ?? 43.27,
      role: worker.role,
      active: worker.active
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    setSaving(true);

    try {
      if (isDemoMode()) {
        // Demo mode - local state only
        if (editingWorker) {
          setWorkers(prev => prev.map(w =>
            w.id === editingWorker.id
              ? { ...w, ...formData }
              : w
          ));
          toast.success('Pracownik zaktualizowany (tryb demo)');
        } else {
          const newWorker: Worker = {
            id: Math.max(...workers.map(w => w.id), 0) + 1,
            ...formData,
            skills: []
          };
          setWorkers(prev => [...prev, newWorker]);
          toast.success('Pracownik dodany (tryb demo)');
        }
      } else {
        // Production mode - API calls
        if (editingWorker) {
          const response = await workersApi.update(editingWorker.id, {
            name: formData.name,
            email: formData.email,
            position: formData.position,
            hourly_rate: formData.hourly_rate,
            role: formData.role,
            active: formData.active
          });

          if (response.success) {
            // Update local state with response data
            setWorkers(prev => prev.map(w =>
              w.id === editingWorker.id
                ? { ...w, ...formData }
                : w
            ));
            toast.success('Pracownik zaktualizowany');
          } else {
            throw new Error(response.error || 'Błąd aktualizacji');
          }
        } else {
          const response = await workersApi.create({
            name: formData.name,
            email: formData.email,
            position: formData.position,
            hourly_rate: formData.hourly_rate,
            role: formData.role
          });

          if (response.success && response.data) {
            // Add new worker to local state
            const newWorker: Worker = {
              id: response.data.id,
              name: formData.name,
              email: formData.email,
              position: formData.position,
              hourly_rate: formData.hourly_rate,
              role: formData.role,
              active: true
            };
            setWorkers(prev => [...prev, newWorker]);
            toast.success('Pracownik dodany');
          } else {
            throw new Error(response.error || 'Błąd dodawania');
          }
        }
      }
      resetForm();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Wystąpił błąd podczas zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (workerId: number) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const newActiveStatus = !worker.active;

    // Optimistic update
    setWorkers(prev => prev.map(w =>
      w.id === workerId ? { ...w, active: newActiveStatus } : w
    ));

    if (!isDemoMode()) {
      try {
        const response = await workersApi.update(workerId, { active: newActiveStatus });
        if (!response.success) {
          // Revert on failure
          setWorkers(prev => prev.map(w =>
            w.id === workerId ? { ...w, active: !newActiveStatus } : w
          ));
          toast.error('Błąd zmiany statusu');
        } else {
          toast.success(newActiveStatus ? 'Pracownik aktywowany' : 'Pracownik dezaktywowany');
        }
      } catch (error) {
        // Revert on error
        setWorkers(prev => prev.map(w =>
          w.id === workerId ? { ...w, active: !newActiveStatus } : w
        ));
        toast.error('Błąd zmiany statusu');
      }
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Pracownicy</h1>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download size={18} className="mr-2" />
            Eksport CSV
          </button>
          <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
            <Plus size={18} className="mr-2" />
            Dodaj Pracownika
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-4 z-50">
          <div className="card-industrial w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingWorker ? 'Edytuj Pracownika' : 'Dodaj Pracownika'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-md">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Imię i Nazwisko *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-industrial"
                  placeholder="Jan Kowalski"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input-industrial"
                  placeholder="jan@plexisystem.pl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Stanowisko</label>
                <select
                  value={formData.position}
                  onChange={e => setFormData(prev => ({ ...prev, position: e.target.value as Position }))}
                  className="input-industrial"
                >
                  {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium mb-2">Stawka (zł/h)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={e => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                    className="input-industrial"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Rola</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="input-industrial"
                >
                  <option value="PRACOWNIK">Pracownik</option>
                  <option value="KIEROWNIK">Kierownik</option>
                  <option value="GRAFIK">Grafik</option>
                  <option value="HANDLOWIEC">Handlowiec</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-5 h-5 rounded border-2 accent-primary"
                  />
                  <span className="font-medium">Aktywny</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
                  {saving ? (
                    <Loader2 size={18} className="mr-2 animate-spin" />
                  ) : (
                    <Save size={18} className="mr-2" />
                  )}
                  {saving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
                <button onClick={resetForm} className="btn-secondary flex-1" disabled={saving}>
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin mr-2" size={24} />
          <span>Ładowanie pracowników...</span>
        </div>
      )}

      {/* Desktop Table */}
      {!loading && <div className="hidden md:block card-industrial overflow-hidden p-0">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Imię i Nazwisko</th>
              <th>Email</th>
              <th>Stanowisko</th>
              {isAdmin && <th>Stawka</th>}
              <th>Rola</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id} className={!worker.active ? 'opacity-50' : ''}>
                <td className="font-semibold">{worker.name}</td>
                <td className="text-muted-foreground">{worker.email}</td>
                <td>{worker.position}</td>
                {isAdmin && <td className="font-mono">{Number(worker.hourly_rate || 0).toFixed(2)} zł/h</td>}
                <td>
                  <span className={`status-badge ${isManagerRole(worker.role) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {getRoleDisplay(worker.role)}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => toggleActive(worker.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm ${
                      worker.active 
                        ? 'bg-success/10 text-success hover:bg-success/20' 
                        : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    }`}
                  >
                    {worker.active ? <UserCheck size={14} /> : <UserX size={14} />}
                    {worker.active ? 'Aktywny' : 'Nieaktywny'}
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => handleEdit(worker)}
                    className="btn-secondary py-2 px-4"
                  >
                    <Edit size={16} className="mr-2" />
                    Edytuj
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      {/* Mobile Cards */}
      {!loading && <div className="md:hidden space-y-4">
        {workers.map((worker) => (
          <div key={worker.id} className={`card-industrial ${!worker.active ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">{worker.name}</h3>
                <p className="text-sm text-muted-foreground">{worker.email}</p>
              </div>
              <span className={`status-badge ${isManagerRole(worker.role) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {getRoleDisplay(worker.role)}
              </span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <p><span className="text-muted-foreground">Stanowisko:</span> {worker.position}</p>
              {isAdmin && <p><span className="text-muted-foreground">Stawka:</span> {Number(worker.hourly_rate || 0).toFixed(2)} zł/h</p>}
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                <span className={worker.active ? 'text-success' : 'text-destructive'}>
                  {worker.active ? 'Aktywny' : 'Nieaktywny'}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(worker)} className="btn-secondary flex-1">
                <Edit size={16} className="mr-2" />
                Edytuj
              </button>
              <button
                onClick={() => toggleActive(worker.id)}
                className={`btn-secondary flex-1 ${worker.active ? 'text-destructive' : 'text-success'}`}
              >
                {worker.active ? <UserX size={16} className="mr-2" /> : <UserCheck size={16} className="mr-2" />}
                {worker.active ? 'Dezaktywuj' : 'Aktywuj'}
              </button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
};

export default WorkersList;
