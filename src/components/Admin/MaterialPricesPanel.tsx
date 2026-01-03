import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  DollarSign,
  Percent,
  Settings,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MaterialPrice {
  id: number;
  material_type: string;
  name: string;
  unit: string;
  price_per_unit: number;
  supplier?: string;
  min_order_quantity?: number;
  lead_time_days?: number;
  notes?: string;
  active: boolean;
}

interface ProductionSetting {
  id: number;
  value: number;
  type: string;
  description: string;
  updated_by?: string;
  updated_at?: string;
}

const MATERIAL_TYPES = [
  { value: 'plexi', label: 'Plexi / Akryl' },
  { value: 'pvc', label: 'PCV' },
  { value: 'dibond', label: 'Dibond' },
  { value: 'wood', label: 'Drewno / Sklejka' },
  { value: 'metal', label: 'Metal' },
  { value: 'glass', label: 'Szkło' },
  { value: 'foil', label: 'Folia' },
  { value: 'glue', label: 'Klej / Chemia' },
  { value: 'hardware', label: 'Okucia / Mocowania' },
  { value: 'other', label: 'Inne' }
];

const MaterialPricesPanel = () => {
  const [materials, setMaterials] = useState<MaterialPrice[]>([]);
  const [settings, setSettings] = useState<{ [key: string]: ProductionSetting }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'materials' | 'settings'>('materials');
  const [filterType, setFilterType] = useState<string>('');

  const [formData, setFormData] = useState<Partial<MaterialPrice>>({
    material_type: 'plexi',
    name: '',
    unit: 'm2',
    price_per_unit: 0,
    supplier: '',
    min_order_quantity: undefined,
    lead_time_days: undefined,
    notes: '',
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('plexisystem_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Load materials
      const materialsRes = await fetch('/api/admin/materials', { headers });
      const materialsData = await materialsRes.json();
      if (materialsData.success) {
        setMaterials(materialsData.data.materials || []);
      }

      // Load settings
      const settingsRes = await fetch('/api/admin/settings', { headers });
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setSettings(settingsData.data.settings || {});
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Blad',
        description: 'Nie udalo sie wczytac danych',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      material_type: 'plexi',
      name: '',
      unit: 'm2',
      price_per_unit: 0,
      supplier: '',
      min_order_quantity: undefined,
      lead_time_days: undefined,
      notes: '',
      active: true
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const startEdit = (material: MaterialPrice) => {
    setFormData(material);
    setEditingId(material.id);
    setShowAddForm(false);
  };

  const saveMaterial = async () => {
    if (!formData.name || !formData.price_per_unit) {
      toast({ title: 'Blad', description: 'Nazwa i cena sa wymagane', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('plexisystem_token');
      const url = editingId
        ? `/api/admin/materials/${editingId}`
        : '/api/admin/materials';

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Sukces', description: editingId ? 'Material zaktualizowany' : 'Material dodany' });
        resetForm();
        loadData();
      } else {
        throw new Error(data.message || 'Blad zapisu');
      }
    } catch (error: any) {
      toast({ title: 'Blad', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteMaterial = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunac ten material?')) return;

    try {
      const token = localStorage.getItem('plexisystem_token');
      const response = await fetch(`/api/admin/materials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Usunieto', description: 'Material usuniety' });
        loadData();
      }
    } catch (error) {
      toast({ title: 'Blad', description: 'Nie udalo sie usunac', variant: 'destructive' });
    }
  };

  const saveSetting = async (key: string, value: number) => {
    try {
      const token = localStorage.getItem('plexisystem_token');
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value })
      });

      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          [key]: { ...prev[key], value }
        }));
        toast({ title: 'Zapisano', description: 'Ustawienie zaktualizowane' });
      }
    } catch (error) {
      toast({ title: 'Blad', description: 'Nie udalo sie zapisac', variant: 'destructive' });
    }
  };

  const filteredMaterials = filterType
    ? materials.filter(m => m.material_type === filterType)
    : materials;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'materials'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <Package size={18} className="inline mr-2" />
          Ceny materialow
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <Settings size={18} className="inline mr-2" />
          Narzuty i marze
        </button>
      </div>

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Header with filter and add button */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-industrial"
              >
                <option value="">Wszystkie typy</option>
                {MATERIAL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">
                {filteredMaterials.length} materialow
              </span>
            </div>
            <button
              onClick={() => { setShowAddForm(true); setEditingId(null); }}
              className="btn-primary"
            >
              <Plus size={18} className="mr-2" />
              Dodaj material
            </button>
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingId) && (
            <div className="card-industrial">
              <h3 className="font-bold mb-4">
                {editingId ? 'Edytuj material' : 'Nowy material'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Typ *</label>
                  <select
                    value={formData.material_type || 'plexi'}
                    onChange={(e) => setFormData(prev => ({ ...prev, material_type: e.target.value }))}
                    className="input-industrial w-full"
                  >
                    {MATERIAL_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nazwa *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="np. Plexi przezroczyste 3mm"
                    className="input-industrial w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Jednostka</label>
                  <select
                    value={formData.unit || 'm2'}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="input-industrial w-full"
                  >
                    <option value="m2">m2</option>
                    <option value="mb">mb (metr biezacy)</option>
                    <option value="szt">sztuka</option>
                    <option value="kg">kg</option>
                    <option value="l">litr</option>
                    <option value="opak">opakowanie</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cena za jednostke (PLN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_per_unit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="input-industrial w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dostawca</label>
                  <input
                    type="text"
                    value={formData.supplier || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Nazwa dostawcy"
                    className="input-industrial w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min. zamowienie</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.min_order_quantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_order_quantity: parseFloat(e.target.value) || undefined }))}
                    placeholder="np. 1"
                    className="input-industrial w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Czas dostawy (dni)</label>
                  <input
                    type="number"
                    value={formData.lead_time_days || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lead_time_days: parseInt(e.target.value) || undefined }))}
                    placeholder="np. 3"
                    className="input-industrial w-full"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active ?? true}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                      className="w-5 h-5 rounded"
                    />
                    <span>Aktywny</span>
                  </label>
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-medium mb-1">Notatki</label>
                  <input
                    type="text"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Dodatkowe informacje..."
                    className="input-industrial w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveMaterial} className="btn-primary" disabled={saving}>
                  <Save size={18} className="mr-2" />
                  {saving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
                <button onClick={resetForm} className="btn-secondary">
                  <X size={18} className="mr-2" />
                  Anuluj
                </button>
              </div>
            </div>
          )}

          {/* Materials List */}
          <div className="card-industrial overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Typ</th>
                    <th>Cena</th>
                    <th>Dostawca</th>
                    <th>Status</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Brak materialow. Dodaj pierwszy material.
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map(material => (
                      <tr key={material.id} className={!material.active ? 'opacity-50' : ''}>
                        <td>
                          <div>
                            <p className="font-semibold">{material.name}</p>
                            {material.notes && (
                              <p className="text-xs text-muted-foreground">{material.notes}</p>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            {MATERIAL_TYPES.find(t => t.value === material.material_type)?.label || material.material_type}
                          </span>
                        </td>
                        <td className="font-mono font-semibold">
                          {Number(material.price_per_unit || 0).toFixed(2)} PLN/{material.unit}
                        </td>
                        <td>{material.supplier || '-'}</td>
                        <td>
                          {material.active ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle size={14} /> Aktywny
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertTriangle size={14} /> Nieaktywny
                            </span>
                          )}
                        </td>
                        <td className="flex gap-2">
                          <button onClick={() => startEdit(material)} className="btn-secondary py-1 px-2">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteMaterial(material.id)} className="btn-secondary py-1 px-2 text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="card-industrial">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Percent size={20} />
              Narzuty procentowe
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Te wartosci sa uzywane w kalkulatorze kosztow do obliczania cen.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="block text-sm font-medium mb-2">Narzut na materialy (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.material_margin?.value || 15}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      material_margin: { ...prev.material_margin, value: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-industrial w-24"
                  />
                  <span>%</span>
                  <button
                    onClick={() => saveSetting('material_margin', settings.material_margin?.value || 15)}
                    className="btn-secondary py-1 px-3 ml-auto"
                  >
                    <Save size={14} className="mr-1" /> Zapisz
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Doliczany do kosztu materialow
                </p>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="block text-sm font-medium mb-2">Narzut na robocizne (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.labor_margin?.value || 25}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      labor_margin: { ...prev.labor_margin, value: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-industrial w-24"
                  />
                  <span>%</span>
                  <button
                    onClick={() => saveSetting('labor_margin', settings.labor_margin?.value || 25)}
                    className="btn-secondary py-1 px-3 ml-auto"
                  >
                    <Save size={14} className="mr-1" /> Zapisz
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Doliczany do kosztu pracy
                </p>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="block text-sm font-medium mb-2">Koszty ogolne (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.overhead_rate?.value || 10}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      overhead_rate: { ...prev.overhead_rate, value: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-industrial w-24"
                  />
                  <span>%</span>
                  <button
                    onClick={() => saveSetting('overhead_rate', settings.overhead_rate?.value || 10)}
                    className="btn-secondary py-1 px-3 ml-auto"
                  >
                    <Save size={14} className="mr-1" /> Zapisz
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Prąd, czynsz, administracja
                </p>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="block text-sm font-medium mb-2">Marza zysku (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.profit_margin?.value || 20}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profit_margin: { ...prev.profit_margin, value: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-industrial w-24"
                  />
                  <span>%</span>
                  <button
                    onClick={() => saveSetting('profit_margin', settings.profit_margin?.value || 20)}
                    className="btn-secondary py-1 px-3 ml-auto"
                  >
                    <Save size={14} className="mr-1" /> Zapisz
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Zysk doliczany do ceny koncowej
                </p>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="block text-sm font-medium mb-2">Wspolczynnik odpadow (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.waste_factor?.value || 5}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      waste_factor: { ...prev.waste_factor, value: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-industrial w-24"
                  />
                  <span>%</span>
                  <button
                    onClick={() => saveSetting('waste_factor', settings.waste_factor?.value || 5)}
                    className="btn-secondary py-1 px-3 ml-auto"
                  >
                    <Save size={14} className="mr-1" /> Zapisz
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Zapas na odpady materialowe
                </p>
              </div>
            </div>
          </div>

          <div className="card-industrial">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Stawki godzinowe
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="block text-sm font-medium mb-2">Stawka roboczogodziny (PLN)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    value={settings.hourly_rate?.value || 80}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      hourly_rate: { ...prev.hourly_rate, value: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-industrial w-24"
                  />
                  <span>PLN/h</span>
                  <button
                    onClick={() => saveSetting('hourly_rate', settings.hourly_rate?.value || 80)}
                    className="btn-secondary py-1 px-3 ml-auto"
                  >
                    <Save size={14} className="mr-1" /> Zapisz
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Domyslna stawka za godzine pracy
                </p>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="block text-sm font-medium mb-2">Stawka maszynogodziny (PLN)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    value={settings.machine_rate?.value || 50}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      machine_rate: { ...prev.machine_rate, value: parseFloat(e.target.value) || 0 }
                    }))}
                    className="input-industrial w-24"
                  />
                  <span>PLN/h</span>
                  <button
                    onClick={() => saveSetting('machine_rate', settings.machine_rate?.value || 50)}
                    className="btn-secondary py-1 px-3 ml-auto"
                  >
                    <Save size={14} className="mr-1" /> Zapisz
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Koszt eksploatacji maszyn na godzine
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="card-industrial bg-primary/5 border-primary/20">
            <h3 className="font-bold mb-2">Przyklad kalkulacji</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Dla zlecenia o koszcie materialow 1000 PLN i robocizny 500 PLN:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Materialy + narzut</p>
                <p className="font-mono font-bold">
                  {Number(1000 * (1 + (settings.material_margin?.value || 15) / 100) || 0).toFixed(2)} PLN
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Robocizna + narzut</p>
                <p className="font-mono font-bold">
                  {Number(500 * (1 + (settings.labor_margin?.value || 25) / 100) || 0).toFixed(2)} PLN
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">+ Koszty ogolne</p>
                <p className="font-mono font-bold">
                  {Number(1500 * (settings.overhead_rate?.value || 10) / 100 || 0).toFixed(2)} PLN
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Cena koncowa (z marza)</p>
                <p className="font-mono font-bold text-green-600">
                  {Number(
                    (1000 * (1 + (settings.material_margin?.value || 15) / 100) +
                    500 * (1 + (settings.labor_margin?.value || 25) / 100)) *
                    (1 + (settings.overhead_rate?.value || 10) / 100) *
                    (1 + (settings.profit_margin?.value || 20) / 100)
                  || 0).toFixed(2)} PLN
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialPricesPanel;
