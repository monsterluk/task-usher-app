import { useState, useEffect, useCallback } from 'react';
import { bomApi, inventoryApi, isDemoMode } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Link,
  Unlink
} from 'lucide-react';

interface BOMItem {
  id: number;
  material_name: string;
  material_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  supplier: string;
  is_consumed: boolean;
  notes: string;
  created_at: string;
  material_id?: number;
  inventory_item_id?: number;
  reservation_id?: number;
}

interface InventoryMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  unit_cost: number;
  total_stock: number;
  total_available: number;
  category_name: string;
}

interface BOMTabProps {
  orderId: number;
  canEdit?: boolean;
}

const MATERIAL_TYPES = [
  'PLEXI',
  'PMMA',
  'POLIWEGLAN',
  'PCV',
  'DIBOND',
  'INNE',
];

const UNITS = ['szt.', 'm2', 'mb', 'kg', 'l', 'ark.'];

const BOMTab = ({ orderId, canEdit = true }: BOMTabProps) => {
  const [items, setItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [inventoryMaterials, setInventoryMaterials] = useState<InventoryMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    material_name: '',
    material_type: 'PLEXI',
    quantity: 1,
    unit: 'szt.',
    unit_price: 0,
    supplier: '',
    notes: '',
  });

  const demoMode = isDemoMode();

  // Load inventory materials
  useEffect(() => {
    const loadInventoryMaterials = async () => {
      if (demoMode) return;
      try {
        const response = await inventoryApi.getMaterials({ active: true });
        if (response.success && response.data?.materials) {
          setInventoryMaterials(response.data.materials);
        }
      } catch (error) {
        console.error('Failed to load inventory materials:', error);
      }
    };
    loadInventoryMaterials();
  }, [demoMode]);

  // Handle material selection from inventory
  const handleMaterialSelect = (materialId: number) => {
    const material = inventoryMaterials.find(m => m.id === materialId);
    if (material) {
      setSelectedMaterialId(materialId);
      setFormData(prev => ({
        ...prev,
        material_name: material.name,
        unit: material.unit,
        unit_price: material.unit_cost || 0,
      }));
    }
  };

  const loadBOM = useCallback(async () => {
    if (demoMode) {
      // Demo data
      setItems([
        {
          id: 1,
          material_name: 'Plexi bezbarwna 5mm',
          material_type: 'PLEXI',
          quantity: 2,
          unit: 'm2',
          unit_price: 180,
          total_price: 360,
          supplier: 'Plast-Met',
          is_consumed: false,
          notes: '',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          material_name: 'Klej Acrifix 192',
          material_type: 'INNE',
          quantity: 1,
          unit: 'szt.',
          unit_price: 45,
          total_price: 45,
          supplier: 'Chemik',
          is_consumed: true,
          notes: 'Zuzyto 50%',
          created_at: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await bomApi.getOrderBom(orderId);
      if (response.success && response.data?.items) {
        setItems(response.data.items);
      }
    } catch (error: any) {
      console.error('Failed to load BOM:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId, demoMode]);

  useEffect(() => {
    loadBOM();
  }, [loadBOM]);

  const resetForm = () => {
    setFormData({
      material_name: '',
      material_type: 'PLEXI',
      quantity: 1,
      unit: 'szt.',
      unit_price: 0,
      supplier: '',
      notes: '',
    });
    setSelectedMaterialId(null);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (item: BOMItem) => {
    setFormData({
      material_name: item.material_name,
      material_type: item.material_type,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      supplier: item.supplier || '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.material_name) {
      toast({ title: 'Blad', description: 'Podaj nazwe materialu', variant: 'destructive' });
      return;
    }

    if (demoMode) {
      toast({ title: 'Tryb demo', description: 'Zapis niedostepny w trybie demo' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const response = await bomApi.updateBomItem(editingId, formData);
        if (response.success) {
          toast({ title: 'Zapisano', description: 'Material zaktualizowany' });
          await loadBOM();
        }
      } else {
        // Include material_id if selected from inventory
        const payload = {
          ...formData,
          material_id: selectedMaterialId,
        };
        const response = await bomApi.createBomItem(orderId, payload);
        if (response.success) {
          toast({
            title: 'Dodano',
            description: selectedMaterialId
              ? 'Material dodany do BOM (powiazany z magazynem)'
              : 'Material dodany do BOM'
          });
          await loadBOM();
        }
      }
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie zapisac',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (demoMode) {
      toast({ title: 'Tryb demo', description: 'Usuwanie niedostepne w trybie demo' });
      return;
    }

    if (!confirm('Czy na pewno chcesz usunac ten material?')) return;

    try {
      const response = await bomApi.deleteBomItem(id);
      if (response.success) {
        toast({ title: 'Usunieto', description: 'Material usuniety z BOM' });
        await loadBOM();
      }
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie usunac',
        variant: 'destructive',
      });
    }
  };

  const handleMarkConsumed = async (id: number) => {
    if (demoMode) return;

    // Find the item to check if it's inventory-linked
    const item = items.find(i => i.id === id);

    try {
      if (item?.material_id) {
        // Item is linked to inventory - use issue which creates WZ transaction
        const response = await bomApi.issueBomItem(id, { notes: `Wydane do zlecenia` });
        if (response.success) {
          toast({ title: 'Wydano', description: 'Material wydany z magazynu (utworzono WZ)' });
          await loadBOM();
        }
      } else {
        // Not linked to inventory - just mark as consumed
        const response = await bomApi.markConsumed(id);
        if (response.success) {
          toast({ title: 'Oznaczono', description: 'Material oznaczony jako zuzyty' });
          await loadBOM();
        }
      }
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie oznaczyc',
        variant: 'destructive'
      });
    }
  };

  const totalCost = items.reduce((sum, item) => sum + (item.total_price || item.quantity * item.unit_price), 0);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Ladowanie BOM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={20} />
          <h3 className="font-bold">Bill of Materials (BOM)</h3>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary py-1 px-3 text-sm">
            <Plus size={16} className="mr-1" />
            Dodaj material
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-muted-foreground" />
          <span className="text-sm">Pozycji: <strong>{items.length}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign size={18} className="text-green-600" />
          <span className="text-sm">
            Koszt materialow: <strong>{totalCost.toFixed(2)} zl</strong>
          </span>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="p-4 bg-muted/20 rounded-lg border border-border">
          <h4 className="font-medium mb-3">{editingId ? 'Edytuj material' : 'Nowy material'}</h4>

          {/* Inventory material selection */}
          {!editingId && inventoryMaterials.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <label className="block text-xs font-medium mb-1 text-blue-800">
                <Link size={12} className="inline mr-1" />
                Wybierz z magazynu (opcjonalne)
              </label>
              <select
                value={selectedMaterialId || ''}
                onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  if (id) handleMaterialSelect(id);
                  else {
                    setSelectedMaterialId(null);
                  }
                }}
                className="input-industrial w-full text-sm"
              >
                <option value="">-- Wybierz material z magazynu lub wpisz recznie --</option>
                {inventoryMaterials.map(mat => (
                  <option key={mat.id} value={mat.id}>
                    {mat.code} - {mat.name} (dostepne: {mat.total_available} {mat.unit})
                  </option>
                ))}
              </select>
              {selectedMaterialId && (
                <p className="text-xs text-blue-600 mt-1">
                  Material z magazynu - po wydaniu zostanie automatycznie zdjety ze stanu
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nazwa materialu *</label>
              <input
                type="text"
                value={formData.material_name}
                onChange={e => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                className="input-industrial w-full text-sm"
                placeholder="np. Plexi bezbarwna 5mm"
                disabled={!!selectedMaterialId}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Typ</label>
              <select
                value={formData.material_type}
                onChange={e => setFormData(prev => ({ ...prev, material_type: e.target.value }))}
                className="input-industrial w-full text-sm"
              >
                {MATERIAL_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Ilosc</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={e => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  className="input-industrial w-full text-sm"
                />
                <select
                  value={formData.unit}
                  onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="input-industrial w-20 text-sm"
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Cena jednostkowa (zl)</label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={e => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                className="input-industrial w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Dostawca</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                className="input-industrial w-full text-sm"
                placeholder="np. Plast-Met"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Notatki</label>
              <input
                type="text"
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="input-industrial w-full text-sm"
                placeholder="Dodatkowe uwagi"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary py-1 px-3 text-sm">
              <Save size={14} className="mr-1" />
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
            <button onClick={resetForm} className="btn-secondary py-1 px-3 text-sm">
              <X size={14} className="mr-1" />
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package size={32} className="mx-auto mb-2 opacity-50" />
          <p>Brak materialow w BOM</p>
          <p className="text-xs">Dodaj materialy uzyte do realizacji zlecenia</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2">Material</th>
                <th className="text-left py-2 px-2">Typ</th>
                <th className="text-right py-2 px-2">Ilosc</th>
                <th className="text-right py-2 px-2">Cena jedn.</th>
                <th className="text-right py-2 px-2">Wartosc</th>
                <th className="text-left py-2 px-2">Dostawca</th>
                <th className="text-center py-2 px-2">Status</th>
                {canEdit && <th className="text-center py-2 px-2">Akcje</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={`border-b border-border/50 ${item.is_consumed ? 'opacity-60' : ''}`}>
                  <td className="py-2 px-2">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-medium">{item.material_name}</p>
                        {item.material_id && (
                          <span title="Powiazany z magazynem" className="text-blue-500">
                            <Link size={12} />
                          </span>
                        )}
                      </div>
                      {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className="px-2 py-0.5 bg-muted rounded text-xs">{item.material_type}</span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    {item.unit_price.toFixed(2)} zl
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-medium">
                    {(item.total_price || item.quantity * item.unit_price).toFixed(2)} zl
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{item.supplier || '-'}</td>
                  <td className="py-2 px-2 text-center">
                    {item.is_consumed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                        <CheckCircle size={12} /> {item.material_id ? 'Wydano (WZ)' : 'Zuzyty'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkConsumed(item.id)}
                        className={`px-2 py-0.5 rounded text-xs hover:opacity-80 ${
                          item.material_id
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                      >
                        {item.material_id ? 'Wydaj z mag.' : 'Oznacz zuzyty'}
                      </button>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-2 px-2">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => startEdit(item)} className="p-1 hover:bg-muted rounded">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-muted rounded text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold">
                <td colSpan={4} className="py-2 px-2 text-right">Razem:</td>
                <td className="py-2 px-2 text-right font-mono">{totalCost.toFixed(2)} zl</td>
                <td colSpan={canEdit ? 3 : 2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default BOMTab;
