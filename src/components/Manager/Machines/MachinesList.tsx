import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Download, Edit, X, Save, Loader2, Trash2, Cog } from 'lucide-react';
import { toast } from 'sonner';

// Machine interface
interface Machine {
  id: number;
  name: string;
  cost_per_hour: number;
  description: string;
  active: boolean;
}

const MachinesList = () => {
  const [machines, setMachines] = useState<Machine[]>([
    { id: 1, name: 'CNC Frezarka', cost_per_hour: 100, description: 'Frezarka CNC do precyzyjnego frezowania', active: true },
    { id: 2, name: 'Laser CO2', cost_per_hour: 150, description: 'Cięcie i grawerowanie laserowe', active: true },
    { id: 3, name: 'Ploter tnący', cost_per_hour: 80, description: 'Ploter do cięcia folii i materiałów', active: true },
    { id: 4, name: 'Wytłaczarka', cost_per_hour: 120, description: 'Wytłaczanie tworzyw sztucznych', active: true },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    cost_per_hour: 100,
    description: '',
    active: true,
  });

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

    setLoading(true);
    try {
      if (editingMachine) {
        setMachines(prev => prev.map(m => 
          m.id === editingMachine.id
            ? { ...m, ...formData }
            : m
        ));
        toast.success('Maszyna zaktualizowana');
        resetForm();
      } else {
        const newMachine: Machine = {
          id: Math.max(...machines.map(m => m.id), 0) + 1,
          ...formData
        };
        setMachines(prev => [...prev, newMachine]);
        toast.success('Maszyna dodana pomyślnie!');
        resetForm();
      }
    } catch (error) {
      toast.error('Wystąpił błąd');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (machineId: number) => {
    setMachines(prev => prev.filter(m => m.id !== machineId));
    toast.success('Maszyna usunięta');
    setDeleteConfirm(null);
  };

  const toggleActive = (machineId: number) => {
    setMachines(prev => prev.map(m => 
      m.id === machineId ? { ...m, active: !m.active } : m
    ));
  };

  const exportToCSV = () => {
    const headers = ['Nazwa', 'Koszt/godz (zł)', 'Opis', 'Status'];
    const rows = machines.map(m => [
      m.name,
      m.cost_per_hour.toFixed(2),
      m.description,
      m.active ? 'Aktywna' : 'Nieaktywna'
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ;
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
                <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                  Zapisz
                </button>
                <button onClick={resetForm} disabled={loading} className="btn-secondary flex-1">
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((machine) => (
          <div key={machine.id} className={}>
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
              <p><span className="text-muted-foreground">Koszt:</span> <span className="font-mono font-bold">{machine.cost_per_hour.toFixed(2)} zł/h</span></p>
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

      {machines.length === 0 && (
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
