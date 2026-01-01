import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Download, Edit, X, Save, Loader2, Trash2, Cog } from 'lucide-react';
import { toast } from 'sonner';
import { machinesApi, isDemoMode } from '@/utils/api';

// Machine interface
interface Machine {
  id: number;
  name: string;
  cost_per_hour: number;
  description: string;
  active: boolean;
}

// Demo data for fallback
const DEMO_MACHINES: Machine[] = [
  { id: 1, name: 'CNC Frezarka', cost_per_hour: 100, description: 'Frezarka CNC do precyzyjnego frezowania', active: true },
  { id: 2, name: 'Laser CO2', cost_per_hour: 150, description: 'Cięcie i grawerowanie laserowe', active: true },
  { id: 3, name: 'Ploter tnący', cost_per_hour: 80, description: 'Ploter do cięcia folii i materiałów', active: true },
  { id: 4, name: 'Wytłaczarka', cost_per_hour: 120, description: 'Wytłaczanie tworzyw sztucznych', active: true },
];

const MachinesList = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cost_per_hour: 100,
    description: '',
    active: true,
  });

  // Load machines from API on mount
  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    setLoading(true);

    if (isDemoMode()) {
      // Use demo data
      setMachines(DEMO_MACHINES);
      setLoading(false);
      return;
    }

    try {
      const response = await machinesApi.getAll();
      if (response.success && response.machines) {
        setMachines(response.machines);
      } else if (response.data) {
        setMachines(response.data);
      } else {
        // Fallback to demo data if API returns empty
        setMachines([]);
      }
    } catch (error) {
      console.error('Failed to load machines:', error);
      // Keep empty state, user can add machines
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cost_per_hour: 100,
      description: '',
      active: true,
    });
    setEditingMachine(null);
    setIsFormOpen(false);
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({
      name: machine.name,
      cost_per_hour: machine.cost_per_hour,
      description: machine.description,
      active: machine.active,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Wypełnij nazwę maszyny');
      return;
    }

    setSaving(true);
    try {
      if (isDemoMode()) {
        // Demo mode - local state only
        if (editingMachine) {
          setMachines(prev => prev.map(m =>
            m.id === editingMachine.id
              ? { ...m, ...formData }
              : m
          ));
          toast.success('Maszyna zaktualizowana (tryb demo)');
        } else {
          const newMachine: Machine = {
            id: Math.max(...machines.map(m => m.id), 0) + 1,
            ...formData
          };
          setMachines(prev => [...prev, newMachine]);
          toast.success('Maszyna dodana (tryb demo)');
        }
        resetForm();
      } else {
        // Production mode - API calls
        if (editingMachine) {
          const response = await machinesApi.update(editingMachine.id, {
            name: formData.name,
            cost_per_hour: formData.cost_per_hour,
            description: formData.description,
            active: formData.active
          });

          if (response.success) {
            setMachines(prev => prev.map(m =>
              m.id === editingMachine.id
                ? { ...m, ...formData }
                : m
            ));
            toast.success('Maszyna zaktualizowana');
            resetForm();
          } else {
            throw new Error(response.error || 'Błąd aktualizacji');
          }
        } else {
          const response = await machinesApi.create({
            name: formData.name,
            cost_per_hour: formData.cost_per_hour,
            description: formData.description,
            active: formData.active
          });

          if (response.success && (response.data || response.machine)) {
            const newMachine: Machine = {
              id: response.data?.id || response.machine?.id,
              name: formData.name,
              cost_per_hour: formData.cost_per_hour,
              description: formData.description,
              active: formData.active
            };
            setMachines(prev => [...prev, newMachine]);
            toast.success('Maszyna dodana');
            resetForm();
          } else {
            throw new Error(response.error || 'Błąd dodawania');
          }
        }
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Wystąpił błąd podczas zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (machineId: number) => {
    // Optimistic update
    const previousMachines = [...machines];
    setMachines(prev => prev.filter(m => m.id !== machineId));
    setDeleteConfirm(null);

    if (!isDemoMode()) {
      try {
        const response = await machinesApi.delete(machineId);
        if (response.success) {
          toast.success('Maszyna usunięta');
        } else {
          // Revert on failure
          setMachines(previousMachines);
          toast.error('Błąd usuwania maszyny');
        }
      } catch (error) {
        // Revert on error
        setMachines(previousMachines);
        toast.error('Błąd usuwania maszyny');
      }
    } else {
      toast.success('Maszyna usunięta (tryb demo)');
    }
  };

  const toggleActive = async (machineId: number) => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return;

    const newActiveStatus = !machine.active;

    // Optimistic update
    setMachines(prev => prev.map(m =>
      m.id === machineId ? { ...m, active: newActiveStatus } : m
    ));

    if (!isDemoMode()) {
      try {
        const response = await machinesApi.update(machineId, { active: newActiveStatus });
        if (!response.success) {
          // Revert on failure
          setMachines(prev => prev.map(m =>
            m.id === machineId ? { ...m, active: !newActiveStatus } : m
          ));
          toast.error('Błąd zmiany statusu');
        } else {
          toast.success(newActiveStatus ? 'Maszyna aktywowana' : 'Maszyna dezaktywowana');
        }
      } catch (error) {
        // Revert on error
        setMachines(prev => prev.map(m =>
          m.id === machineId ? { ...m, active: !newActiveStatus } : m
        ));
        toast.error('Błąd zmiany statusu');
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Nazwa', 'Koszt/godz (zł)', 'Opis', 'Status'];
    const rows = machines.map(m => [
      m.name,
      Number(m.cost_per_hour || 0).toFixed(2),
      m.description,
      m.active ? 'Aktywna' : 'Nieaktywna'
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plexisystem_maszyny_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">⚙️ Zarządzanie Maszynami</h1>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="btn-secondary">
            <Download size={18} className="mr-2" />
            Eksport CSV
          </button>
          <button onClick={() => setIsFormOpen(true)} className="btn-primary">
            <Plus size={18} className="mr-2" />
            Dodaj Maszynę
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-4 z-50">
          <div className="card-industrial w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingMachine ? '✏️ Edytuj Maszynę' : '➕ Dodaj Maszynę'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-md">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nazwa maszyny *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-industrial"
                  placeholder="CNC Frezarka"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Koszt na godzinę (zł)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_per_hour}
                  onChange={e => setFormData(prev => ({ ...prev, cost_per_hour: parseFloat(e.target.value) || 0 }))}
                  className="input-industrial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Opis</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-industrial min-h-[80px]"
                  placeholder="Opis maszyny i jej zastosowanie..."
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-5 h-5 rounded border-2 accent-primary"
                  />
                  <span className="font-medium">Aktywna</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin mr-2" size={24} />
          <span>Ładowanie maszyn...</span>
        </div>
      )}

      {/* Machines Grid */}
      {!loading && machines.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((machine) => (
          <div key={machine.id} className={`card-industrial ${!machine.active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Cog size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{machine.name}</h3>
                  <p className="text-xs text-muted-foreground">{machine.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <p><span className="text-muted-foreground">Koszt:</span> <span className="font-mono font-bold">{Number(machine.cost_per_hour || 0).toFixed(2)} zł/h</span></p>
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                <span className={machine.active ? 'text-success' : 'text-destructive'}>
                  {machine.active ? 'Aktywna' : 'Nieaktywna'}
                </span>
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleEdit(machine)} className="btn-secondary flex-1">
                <Edit size={16} className="mr-2" />
                Edytuj
              </button>
              {deleteConfirm === machine.id ? (
                <button onClick={() => handleDelete(machine.id)} className="btn-danger flex-1">
                  ✓ Usuń
                </button>
              ) : (
                <button onClick={() => setDeleteConfirm(machine.id)} className="btn-danger flex-1">
                  <Trash2 size={16} className="mr-2" />
                  Usuń
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {!loading && machines.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Cog size={48} className="mx-auto mb-4 opacity-50" />
          <p>Brak maszyn w systemie</p>
          <button onClick={() => setIsFormOpen(true)} className="btn-primary mt-4">
            <Plus size={18} className="mr-2" />
            Dodaj pierwszą maszynę
          </button>
        </div>
      )}
    </div>
  );
};

export default MachinesList;
