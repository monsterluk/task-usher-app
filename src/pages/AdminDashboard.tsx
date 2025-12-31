import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import { Worker, Machine, Position, UserRole, ROLE_LABELS, ROLES_WITH_PRICE_ACCESS } from '@/types';
import { positions } from '@/data/mockData';
import { workersApi, settingsApi, isDemoMode } from '@/utils/api';
import {
  Users,
  Cog,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Settings,
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  BarChart3,
  Key,
  Shield,
  Wrench,
  ArrowLeft,
  Home,
  Plug,
  Database
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AnnouncementBoard from '@/components/AnnouncementBoard';
import MaterialPricesPanel from '@/components/Admin/MaterialPricesPanel';
import IntegrationsPanel from '@/components/Admin/IntegrationsPanel';
import BackupsPanel from '@/components/Admin/BackupsPanel';
import InventoryPanel from '@/components/Admin/InventoryPanel';

// Umiejętności/etapy produkcyjne do przypisania
const AVAILABLE_SKILLS: Position[] = [
  'GRAFIK', 'FREZOWANIE', 'LASER', 'POLEROWANIE', 'WYGINANIE',
  'KLEJENIE', 'DRUKOWANIE', 'OKLEJANIE', 'PAKOWANIE', 'WYSYŁKA'
];

const AVAILABLE_ROLES: UserRole[] = ['ADMIN', 'GRAFIK', 'HANDLOWIEC', 'KIEROWNIK', 'PRACOWNIK'];

// ==================== WORKERS MANAGEMENT ====================
const WorkersManagement = () => {
  const { workers, setWorkers, currentUser } = useApp();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Worker>>({
    name: '',
    email: '',
    pin: '',
    position: 'INNE',
    hourly_rate: 43.27,
    role: 'PRACOWNIK',
    skills: [],
    active: true
  });

  const canViewPrices = currentUser && ROLES_WITH_PRICE_ACCESS.includes(currentUser.role);
  const demoMode = isDemoMode();

  // Load workers from API on mount
  const loadWorkersFromApi = useCallback(async () => {
    if (demoMode) return;
    setIsLoading(true);
    try {
      const response = await workersApi.getAll();
      if (response.success && response.data?.workers) {
        setWorkers(response.data.workers);
      }
    } catch (error: any) {
      console.error('Failed to load workers from API:', error);
      toast({
        title: "Błąd ładowania",
        description: error.message || "Nie udało się pobrać danych pracowników z serwera",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [demoMode, setWorkers]);

  useEffect(() => {
    loadWorkersFromApi();
  }, [loadWorkersFromApi]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      pin: '',
      position: 'INNE',
      hourly_rate: 43.27,
      role: 'PRACOWNIK',
      skills: [],
      active: true
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const startEdit = (worker: Worker) => {
    setFormData({ ...worker, skills: worker.skills || [] });
    setEditingId(worker.id);
    setShowAddForm(false);
  };

  const validatePin = (pin: string): boolean => {
    if (!pin) return true; // PIN is optional
    if (!/^\d{4,6}$/.test(pin)) {
      toast({ title: "Błąd", description: "PIN musi mieć 4-6 cyfr", variant: "destructive" });
      return false;
    }
    // Check if PIN is unique
    const existingWorker = workers.find(w => w.pin === pin && w.id !== editingId);
    if (existingWorker) {
      toast({ title: "Błąd", description: `PIN jest już używany przez: ${existingWorker.name}`, variant: "destructive" });
      return false;
    }
    return true;
  };

  const saveWorker = async () => {
    if (!formData.name || !formData.email) {
      toast({ title: "Błąd", description: "Wypełnij wszystkie wymagane pola", variant: "destructive" });
      return;
    }

    if (formData.pin && !validatePin(formData.pin)) {
      return;
    }

    setIsSaving(true);

    try {
      if (demoMode) {
        // Demo mode - local state only
        if (editingId) {
          setWorkers(prev => prev.map(w => w.id === editingId ? { ...w, ...formData } as Worker : w));
          toast({ title: "Zapisano", description: "Dane pracownika zaktualizowane (tryb demo)" });
        } else {
          const newWorker: Worker = {
            id: Math.max(0, ...workers.map(w => w.id)) + 1,
            name: formData.name!,
            email: formData.email!,
            pin: formData.pin || undefined,
            position: formData.position as Position,
            hourly_rate: formData.hourly_rate || 43.27,
            role: formData.role as UserRole || 'PRACOWNIK',
            skills: formData.skills || [],
            active: formData.active ?? true
          };
          setWorkers(prev => [...prev, newWorker]);
          toast({ title: "Dodano", description: "Nowy pracownik dodany (tryb demo)" });
        }
      } else {
        // Production mode - call API
        if (editingId) {
          const response = await workersApi.update(editingId, {
            name: formData.name,
            email: formData.email,
            pin: formData.pin || null,
            position: formData.position,
            role: formData.role,
            hourly_rate: formData.hourly_rate,
            skills: formData.skills,
            active: formData.active
          });
          if (response.success && response.data?.worker) {
            setWorkers(prev => prev.map(w => w.id === editingId ? response.data.worker : w));
            toast({ title: "Zapisano", description: "Dane pracownika zaktualizowane w bazie danych" });
          }
        } else {
          const response = await workersApi.create({
            name: formData.name!,
            email: formData.email!,
            pin: formData.pin || undefined,
            position: formData.position || 'INNE',
            role: formData.role || 'PRACOWNIK',
            hourly_rate: formData.hourly_rate,
            skills: formData.skills
          });
          if (response.success && response.data?.worker) {
            setWorkers(prev => [...prev, response.data.worker]);
            toast({ title: "Dodano", description: "Nowy pracownik zapisany w bazie danych" });
          }
        }
      }
      resetForm();
    } catch (error: any) {
      console.error('Failed to save worker:', error);
      toast({
        title: "Błąd zapisu",
        description: error.response?.data?.message || error.message || "Nie udało się zapisać pracownika",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWorker = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tego pracownika?')) {
      return;
    }

    try {
      if (demoMode) {
        setWorkers(prev => prev.filter(w => w.id !== id));
        toast({ title: "Usunięto", description: "Pracownik usunięty (tryb demo)" });
      } else {
        const response = await workersApi.delete(id);
        if (response.success) {
          setWorkers(prev => prev.filter(w => w.id !== id));
          toast({ title: "Usunięto", description: response.message || "Pracownik usunięty z bazy danych" });
        }
      }
    } catch (error: any) {
      console.error('Failed to delete worker:', error);
      toast({
        title: "Błąd usuwania",
        description: error.response?.data?.message || error.message || "Nie udało się usunąć pracownika",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (id: number) => {
    const worker = workers.find(w => w.id === id);
    if (!worker) return;

    const newActive = !worker.active;

    try {
      if (demoMode) {
        setWorkers(prev => prev.map(w => w.id === id ? { ...w, active: newActive } : w));
      } else {
        const response = await workersApi.update(id, { active: newActive });
        if (response.success && response.data?.worker) {
          setWorkers(prev => prev.map(w => w.id === id ? response.data.worker : w));
        }
      }
    } catch (error: any) {
      console.error('Failed to toggle worker active status:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić statusu pracownika",
        variant: "destructive"
      });
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...(prev.skills || []), skill]
    }));
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'KIEROWNIK': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'GRAFIK': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'HANDLOWIEC': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'PRACOWNIK': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Powrót do panelu</span>
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users size={28} />
            Zarządzanie Pracownikami
          </h1>
          <p className="text-sm text-muted-foreground">
            {workers.filter(w => w.active).length} aktywnych / {workers.length} wszystkich
          </p>
          {/* Data source indicator */}
          <p className={`text-xs mt-1 ${demoMode ? 'text-orange-600' : 'text-green-600'}`}>
            {demoMode ? '⚠️ Tryb demo (dane lokalne)' : '✓ Połączono z bazą danych'}
          </p>
        </div>
        <button onClick={() => { setShowAddForm(true); setEditingId(null); }} className="btn-primary" disabled={isLoading}>
          <Plus size={18} className="mr-2" />
          Dodaj Pracownika
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="card-industrial mb-6 text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-muted-foreground">Ładowanie danych z bazy...</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="card-industrial mb-6">
          <h2 className="text-lg font-bold mb-4">
            {editingId ? 'Edytuj Pracownika' : 'Nowy Pracownik'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Imię i nazwisko *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-industrial w-full"
                placeholder="Jan Kowalski"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input-industrial w-full"
                placeholder="jan@firma.pl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Key size={14} /> PIN (4-6 cyfr)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={formData.pin || ''}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormData(prev => ({ ...prev, pin: val }));
                }}
                className="input-industrial w-full font-mono text-lg tracking-widest"
                placeholder="1234"
              />
              <p className="text-xs text-muted-foreground mt-1">Używany do logowania</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stanowisko</label>
              <select
                value={formData.position || 'INNE'}
                onChange={e => setFormData(prev => ({ ...prev, position: e.target.value as Position }))}
                className="input-industrial w-full"
              >
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Shield size={14} /> Rola w systemie
              </label>
              <select
                value={formData.role || 'PRACOWNIK'}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                className="input-industrial w-full"
              >
                {AVAILABLE_ROLES.map(role => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
            {canViewPrices && (
              <div>
                <label className="block text-sm font-medium mb-1">Stawka godzinowa (zł)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate || 43.27}
                  onChange={e => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) }))}
                  className="input-industrial w-full"
                />
              </div>
            )}
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active ?? true}
                  onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-5 h-5 rounded accent-primary"
                />
                <span>Aktywny</span>
              </label>
            </div>
          </div>

          {/* Skills Section */}
          <div className="mt-6 pt-4 border-t border-border">
            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
              <Wrench size={16} /> Umiejętności (etapy produkcyjne)
              {(formData.role === 'HANDLOWIEC' || formData.role === 'ADMIN') && (
                <span className="text-xs font-normal text-muted-foreground ml-2">(opcjonalne)</span>
              )}
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              {formData.role === 'PRACOWNIK' || formData.role === 'GRAFIK' || formData.role === 'KIEROWNIK'
                ? 'Zaznacz etapy, które ten pracownik może wykonywać'
                : 'Dla tej roli umiejętności produkcyjne są opcjonalne'}
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SKILLS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    formData.skills?.includes(skill)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {formData.skills?.includes(skill) && <CheckCircle size={14} className="inline mr-1" />}
                  {skill}
                </button>
              ))}
            </div>
            {formData.skills && formData.skills.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Wybrano: {formData.skills.length} umiejętności
              </p>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={saveWorker} className="btn-primary" disabled={isSaving}>
              <Save size={18} className="mr-2" />
              {isSaving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
            <button onClick={resetForm} className="btn-secondary" disabled={isSaving}>
              <X size={18} className="mr-2" />
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Workers Table */}
      <div className="card-industrial overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="table-industrial">
            <thead>
              <tr>
                <th>Pracownik</th>
                <th>PIN</th>
                <th>Rola</th>
                <th>Umiejętności</th>
                {canViewPrices && <th>Stawka/h</th>}
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(worker => (
                <tr key={worker.id} className={!worker.active ? 'opacity-50' : ''}>
                  <td>
                    <div>
                      <p className="font-semibold">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">{worker.email}</p>
                      <p className="text-xs text-muted-foreground">{worker.position}</p>
                    </div>
                  </td>
                  <td>
                    {worker.pin ? (
                      <span className="font-mono text-lg bg-muted px-2 py-1 rounded">{worker.pin}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Brak</span>
                    )}
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(worker.role)}`}>
                      {ROLE_LABELS[worker.role] || worker.role}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {worker.skills && worker.skills.length > 0 ? (
                        worker.skills.slice(0, 3).map(skill => (
                          <span key={skill} className="px-1.5 py-0.5 bg-primary/10 rounded text-xs">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Brak</span>
                      )}
                      {worker.skills && worker.skills.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          +{worker.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  {canViewPrices && (
                    <td className="font-mono">{Number(worker.hourly_rate || 0).toFixed(2)} zł</td>
                  )}
                  <td>
                    <button onClick={() => toggleActive(worker.id)} className="flex items-center gap-1">
                      {worker.active ? (
                        <><CheckCircle size={16} className="text-green-600" /> Aktywny</>
                      ) : (
                        <><XCircle size={16} className="text-red-600" /> Nieaktywny</>
                      )}
                    </button>
                  </td>
                  <td className="flex gap-2">
                    <button onClick={() => startEdit(worker)} className="btn-secondary py-1 px-2">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteWorker(worker.id)} className="btn-secondary py-1 px-2 text-red-600 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==================== MACHINES MANAGEMENT ====================
const MachinesManagement = () => {
  const { machines, setMachines } = useApp();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Machine>>({
    name: '',
    department: 'FREZOWANIE',
    hourly_rate: 100,
    status: 'available',
    description: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      department: 'FREZOWANIE',
      hourly_rate: 100,
      status: 'available',
      description: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const startEdit = (machine: Machine) => {
    setFormData(machine);
    setEditingId(machine.id);
    setShowAddForm(false);
  };

  const saveMachine = () => {
    if (!formData.name) {
      toast({ title: "Błąd", description: "Podaj nazwę maszyny", variant: "destructive" });
      return;
    }

    if (editingId) {
      setMachines(prev => prev.map(m => m.id === editingId ? { ...m, ...formData } as Machine : m));
      toast({ title: "Zapisano", description: "Dane maszyny zaktualizowane" });
    } else {
      const newMachine: Machine = {
        id: Math.max(0, ...machines.map(m => m.id)) + 1,
        name: formData.name!,
        department: formData.department as Position,
        hourly_rate: formData.hourly_rate || 100,
        status: formData.status || 'available',
        description: formData.description
      };
      setMachines(prev => [...prev, newMachine]);
      toast({ title: "Dodano", description: "Nowa maszyna dodana" });
    }
    resetForm();
  };

  const deleteMachine = (id: number) => {
    if (confirm('Czy na pewno chcesz usunąć tę maszynę?')) {
      setMachines(prev => prev.filter(m => m.id !== id));
      toast({ title: "Usunięto", description: "Maszyna usunięta" });
    }
  };

  const getStatusBadge = (status: Machine['status']) => {
    const badges = {
      available: { bg: 'bg-green-100', text: 'text-green-800', label: 'Dostępna' },
      in_use: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'W użyciu' },
      maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Serwis' },
      offline: { bg: 'bg-red-100', text: 'text-red-800', label: 'Wyłączona' }
    };
    const badge = badges[status];
    return <span className={`px-2 py-1 rounded text-xs ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  return (
    <div className="p-4 md:p-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Powrót do panelu</span>
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Cog size={28} />
            Zarządzanie Maszynami
          </h1>
          <p className="text-sm text-muted-foreground">
            {machines.filter(m => m.status === 'available').length} dostępnych / {machines.length} wszystkich
          </p>
        </div>
        <button onClick={() => { setShowAddForm(true); setEditingId(null); }} className="btn-primary">
          <Plus size={18} className="mr-2" />
          Dodaj Maszynę
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="card-industrial mb-6">
          <h2 className="text-lg font-bold mb-4">
            {editingId ? 'Edytuj Maszynę' : 'Nowa Maszyna'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nazwa maszyny *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-industrial w-full"
                placeholder="Frezarka CNC 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dział</label>
              <select
                value={formData.department || 'FREZOWANIE'}
                onChange={e => setFormData(prev => ({ ...prev, department: e.target.value as Position }))}
                className="input-industrial w-full"
              >
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stawka godzinowa (zł)</label>
              <input
                type="number"
                step="0.01"
                value={formData.hourly_rate || 100}
                onChange={e => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) }))}
                className="input-industrial w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status || 'available'}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as Machine['status'] }))}
                className="input-industrial w-full"
              >
                <option value="available">Dostępna</option>
                <option value="in_use">W użyciu</option>
                <option value="maintenance">Serwis</option>
                <option value="offline">Wyłączona</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Opis</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input-industrial w-full"
                placeholder="Dodatkowy opis maszyny"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveMachine} className="btn-primary">
              <Save size={18} className="mr-2" />
              Zapisz
            </button>
            <button onClick={resetForm} className="btn-secondary">
              <X size={18} className="mr-2" />
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Machines by Department */}
      {positions.filter(pos => machines.some(m => m.department === pos)).map(department => (
        <div key={department} className="card-industrial mb-4">
          <h3 className="font-bold text-lg mb-3">{department}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {machines.filter(m => m.department === department).map(machine => (
              <div key={machine.id} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{machine.name}</p>
                    <p className="text-sm text-muted-foreground">{machine.description}</p>
                  </div>
                  {getStatusBadge(machine.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">{Number(machine.hourly_rate || 0).toFixed(2)} zł/h</span>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(machine)} className="btn-secondary py-1 px-2">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteMachine(machine.id)} className="btn-secondary py-1 px-2 text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== ADMIN HOME / KPIs ====================
const AdminHome = () => {
  const { orders, workers, machines, timeEntries } = useApp();
  const navigate = useNavigate();

  const activeOrders = orders.filter(o => !o.archived && o.status !== 'GOTOWE');
  const completedOrders = orders.filter(o => o.status === 'GOTOWE');

  // Calculate revenues with proper number conversion and safety checks
  const totalRevenue = completedOrders.reduce((sum, o) => {
    const price = Number(o.price_total) || 0;
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  const pendingRevenue = activeOrders.reduce((sum, o) => {
    const price = Number(o.price_total) || 0;
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  const activeWorkers = workers.filter(w => w.active).length;
  const availableMachines = machines.filter(m => m.status === 'available').length;
  const overdueOrders = activeOrders.filter(o => o.planned_completion_date && new Date(o.planned_completion_date) < new Date());

  // Calculate labor costs with safety checks
  const totalLaborHours = timeEntries.reduce((sum, te) => {
    const seconds = Number(te.totalSeconds) || 0;
    return sum + (isNaN(seconds) ? 0 : seconds / 3600);
  }, 0);

  const avgHourlyRate = workers.length > 0
    ? workers.reduce((sum, w) => {
        const rate = Number(w.hourly_rate) || 0;
        return sum + (isNaN(rate) ? 0 : rate);
      }, 0) / workers.length
    : 50;

  const estimatedLaborCost = isNaN(totalLaborHours * avgHourlyRate) ? 0 : totalLaborHours * avgHourlyRate;

  const KPICard = ({ title, value, subtitle, icon: Icon, color, onClick }: any) => (
    <div className={`card-industrial ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Icon size={24} className={color} />
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Panel Administratora</h1>
          <p className="text-sm text-muted-foreground">Przegląd finansowy i zarządzanie zasobami</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => navigate('/admin/workers')} className="btn-secondary">
          <Users size={18} className="mr-2" /> Pracownicy
        </button>
        <button onClick={() => navigate('/admin/machines')} className="btn-secondary">
          <Cog size={18} className="mr-2" /> Maszyny
        </button>
        <button onClick={() => navigate('/admin/settings')} className="btn-secondary">
          <Settings size={18} className="mr-2" /> Ustawienia
        </button>
        <button onClick={() => navigate('/admin/prices')} className="btn-primary">
          <DollarSign size={18} className="mr-2" /> Ceny materialow
        </button>
        <button onClick={() => navigate('/admin/integrations')} className="btn-secondary">
          <Plug size={18} className="mr-2" /> Integracje
        </button>
        <button onClick={() => navigate('/admin/inventory')} className="btn-secondary">
          <Package size={18} className="mr-2" /> Magazyn
        </button>
        <button onClick={() => navigate('/admin/backups')} className="btn-secondary">
          <Database size={18} className="mr-2" /> Backupy
        </button>
      </div>

      {/* Financial KPIs */}
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <DollarSign size={20} /> Finanse
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Przychód (zrealizowane)" value={`${(totalRevenue || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`}
          icon={DollarSign} color="text-green-600" subtitle={`${completedOrders.length} zleceń`} />
        <KPICard title="Przychód oczekiwany" value={`${(pendingRevenue || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`}
          icon={TrendingUp} color="text-blue-600" subtitle={`${activeOrders.length} aktywnych`} />
        <KPICard title="Koszty pracy (szac.)" value={`${(estimatedLaborCost || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`}
          icon={Users} color="text-orange-600" subtitle={`${(totalLaborHours || 0).toFixed(1)} godz.`} />
        <KPICard title="Przeterminowane" value={overdueOrders.length}
          icon={AlertTriangle} color={overdueOrders.length > 0 ? "text-red-600" : "text-green-600"} />
      </div>

      {/* Resources */}
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <BarChart3 size={20} /> Zasoby
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Aktywni pracownicy" value={activeWorkers} icon={Users} color="text-blue-600"
          subtitle={`z ${workers.length} w systemie`} onClick={() => navigate('/admin/workers')} />
        <KPICard title="Dostępne maszyny" value={availableMachines} icon={Cog} color="text-purple-600"
          subtitle={`z ${machines.length} w systemie`} onClick={() => navigate('/admin/machines')} />
        <KPICard title="Wszystkie zlecenia" value={orders.length} icon={Package} color="text-primary" onClick={() => navigate('/kierownik')} />
        <KPICard title="Średnia stawka" value={`${(avgHourlyRate || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł/h`} icon={DollarSign} color="text-green-600" />
      </div>

      {/* Announcement Board */}
      <div className="mb-8">
        <AnnouncementBoard />
      </div>

      {/* Workers by Position */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-industrial">
          <h3 className="text-lg font-bold mb-4">Pracownicy wg stanowisk</h3>
          <div className="space-y-2">
            {positions.filter(pos => workers.some(w => w.position === pos && w.active)).map(pos => {
              const count = workers.filter(w => w.position === pos && w.active).length;
              return (
                <div key={pos} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span>{pos}</span>
                  <span className="font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-industrial">
          <h3 className="text-lg font-bold mb-4">Maszyny wg działów</h3>
          <div className="space-y-2">
            {positions.filter(pos => machines.some(m => m.department === pos)).map(pos => {
              const count = machines.filter(m => m.department === pos).length;
              const available = machines.filter(m => m.department === pos && m.status === 'available').length;
              return (
                <div key={pos} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span>{pos}</span>
                  <span className="text-sm">{available}/{count} dostępnych</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Default production stages
const DEFAULT_STAGES = [
  'GRAFIK', 'FREZOWANIE', 'LASER', 'POLEROWANIE', 'WYGINANIE',
  'KLEJENIE', 'DRUKOWANIE', 'OKLEJANIE', 'PAKOWANIE', 'WYSYŁKA'
];

// ==================== ADMIN SETTINGS ====================
const AdminSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [settings, setSettings] = useState({
    company_name: 'PLEXI SYSTEM',
    company_nip: '',
    default_worker_rate: 43.27,
    default_machine_rate: 100.00,
    company_address: '',
    company_email: '',
    company_phone: '',
    default_stages: DEFAULT_STAGES as string[],
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (isDemoMode()) {
        setLoading(false);
        return;
      }
      try {
        const response = await settingsApi.get();
        if (response.success && response.data) {
          setSettings(response.data);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Try to initialize settings table
        try {
          await settingsApi.init();
          const response = await settingsApi.get();
          if (response.success && response.data) {
            setSettings(response.data);
          }
        } catch (initError) {
          console.error('Failed to initialize settings:', initError);
        }
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (isDemoMode()) {
      toast({ title: 'Tryb demo', description: 'Ustawienia nie są zapisywane w trybie demo' });
      return;
    }

    setSaving(true);
    try {
      const response = await settingsApi.update(settings);
      if (response.success) {
        toast({ title: 'Sukces', description: 'Ustawienia zostały zapisane' });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zapisać ustawień', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="text-center py-8">Ładowanie ustawień...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Powrót do panelu</span>
      </button>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Ustawienia systemu</h1>

      <div className="space-y-6">
        <div className="card-industrial">
          <h2 className="font-bold mb-4">Dane firmy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nazwa firmy</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                className="input-industrial w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">NIP</label>
              <input
                type="text"
                value={settings.company_nip}
                onChange={(e) => setSettings(prev => ({ ...prev, company_nip: e.target.value }))}
                placeholder="000-000-00-00"
                className="input-industrial w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Adres</label>
              <input
                type="text"
                value={settings.company_address || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, company_address: e.target.value }))}
                placeholder="ul. Przykładowa 1, 00-000 Miasto"
                className="input-industrial w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={settings.company_email || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, company_email: e.target.value }))}
                placeholder="kontakt@firma.pl"
                className="input-industrial w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Telefon</label>
              <input
                type="tel"
                value={settings.company_phone || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, company_phone: e.target.value }))}
                placeholder="+48 123 456 789"
                className="input-industrial w-full"
              />
            </div>
          </div>
        </div>

        <div className="card-industrial">
          <h2 className="font-bold mb-4">Domyślne stawki</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Stawka pracownika (zł/h)</label>
              <input
                type="number"
                value={settings.default_worker_rate}
                onChange={(e) => setSettings(prev => ({ ...prev, default_worker_rate: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                className="input-industrial w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Stawka maszyny (zł/h)</label>
              <input
                type="number"
                value={settings.default_machine_rate}
                onChange={(e) => setSettings(prev => ({ ...prev, default_machine_rate: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                className="input-industrial w-full"
              />
            </div>
          </div>
        </div>

        {/* Global Stages Management */}
        <div className="card-industrial">
          <h2 className="font-bold mb-4">Globalne etapy produkcji</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Zarządzaj domyślnymi etapami produkcji. Te etapy będą dostępne przy tworzeniu nowych zleceń.
          </p>

          {/* Current stages */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(settings.default_stages || DEFAULT_STAGES).map((stage, index) => (
              <div
                key={`${stage}-${index}`}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg"
              >
                <span className="text-sm font-medium text-primary">{index + 1}. {stage}</span>
                <button
                  onClick={() => {
                    setSettings(prev => ({
                      ...prev,
                      default_stages: prev.default_stages.filter((_, i) => i !== index)
                    }));
                  }}
                  className="text-red-500 hover:text-red-700 ml-1"
                  title="Usuń etap"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Add new stage */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value.toUpperCase())}
              placeholder="Nazwa nowego etapu"
              className="input-industrial flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newStageName.trim()) {
                  e.preventDefault();
                  if (!settings.default_stages.includes(newStageName.trim())) {
                    setSettings(prev => ({
                      ...prev,
                      default_stages: [...prev.default_stages, newStageName.trim()]
                    }));
                    setNewStageName('');
                  }
                }
              }}
            />
            <button
              onClick={() => {
                if (newStageName.trim() && !settings.default_stages.includes(newStageName.trim())) {
                  setSettings(prev => ({
                    ...prev,
                    default_stages: [...prev.default_stages, newStageName.trim()]
                  }));
                  setNewStageName('');
                }
              }}
              className="btn-secondary"
              disabled={!newStageName.trim() || settings.default_stages.includes(newStageName.trim())}
            >
              <Plus size={18} className="mr-2" />
              Dodaj etap
            </button>
          </div>

          {/* Reset to defaults */}
          <button
            onClick={() => setSettings(prev => ({ ...prev, default_stages: [...DEFAULT_STAGES] }))}
            className="btn-secondary mt-4 text-sm"
          >
            Przywróć domyślne etapy
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
        </button>
      </div>
    </div>
  );
};

// ==================== MAIN ADMIN DASHBOARD ====================
const AdminDashboard = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <main className="container mx-auto">
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/workers" element={<WorkersManagement />} />
          <Route path="/machines" element={<MachinesManagement />} />
          <Route path="/settings" element={<AdminSettings />} />
          <Route path="/prices" element={<MaterialPricesPanel />} />
          <Route path="/integrations" element={<IntegrationsPanel />} />
          <Route path="/inventory" element={<InventoryPanel />} />
          <Route path="/backups" element={<BackupsPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
