import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Worker, Position } from '@/types';
import { positions } from '@/data/mockData';
import { Plus, Download, Edit, X, Save, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

const WorkersList = () => {
  const { workers, setWorkers } = useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: 'GRAFIK' as Position,
    hourly_rate: 43.27,
    role: 'worker' as 'manager' | 'worker',
    active: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      position: 'GRAFIK',
      hourly_rate: 43.27,
      role: 'worker',
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
      hourly_rate: worker.hourly_rate,
      role: worker.role,
      active: worker.active
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    if (editingWorker) {
      setWorkers(prev => prev.map(w => 
        w.id === editingWorker.id 
          ? { ...w, ...formData }
          : w
      ));
      toast.success('Pracownik zaktualizowany');
    } else {
      const newWorker: Worker = {
        id: Math.max(...workers.map(w => w.id)) + 1,
        ...formData
      };
      setWorkers(prev => [...prev, newWorker]);
      toast.success('Pracownik dodany');
    }
    resetForm();
  };

  const toggleActive = (workerId: number) => {
    setWorkers(prev => prev.map(w => 
      w.id === workerId ? { ...w, active: !w.active } : w
    ));
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

              <div>
                <label className="block text-sm font-medium mb-2">Rola</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as 'manager' | 'worker' }))}
                  className="input-industrial"
                >
                  <option value="worker">Pracownik</option>
                  <option value="manager">Kierownik</option>
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
                <button onClick={handleSave} className="btn-primary flex-1">
                  <Save size={18} className="mr-2" />
                  Zapisz
                </button>
                <button onClick={resetForm} className="btn-secondary flex-1">
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block card-industrial overflow-hidden p-0">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Imię i Nazwisko</th>
              <th>Email</th>
              <th>Stanowisko</th>
              <th>Stawka</th>
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
                <td className="font-mono">{Number(worker.hourly_rate || 0).toFixed(2)} zł/h</td>
                <td>
                  <span className={`status-badge ${worker.role === 'manager' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {worker.role === 'manager' ? 'Kierownik' : 'Pracownik'}
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
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {workers.map((worker) => (
          <div key={worker.id} className={`card-industrial ${!worker.active ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">{worker.name}</h3>
                <p className="text-sm text-muted-foreground">{worker.email}</p>
              </div>
              <span className={`status-badge ${worker.role === 'manager' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {worker.role === 'manager' ? 'Kierownik' : 'Pracownik'}
              </span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <p><span className="text-muted-foreground">Stanowisko:</span> {worker.position}</p>
              <p><span className="text-muted-foreground">Stawka:</span> {Number(worker.hourly_rate || 0).toFixed(2)} zł/h</p>
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
      </div>
    </div>
  );
};

export default WorkersList;
