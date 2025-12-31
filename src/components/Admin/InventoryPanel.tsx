import { useState, useEffect, useCallback } from 'react';
import { inventoryApi, isDemoMode } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  DollarSign,
  MapPin,
  ArrowUpCircle,
  ArrowDownCircle,
  Filter,
  Eye,
  History,
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface Material {
  id: number;
  code: string;
  name: string;
  description: string;
  unit: string;
  category_id: number;
  category_name: string;
  thickness_mm: number;
  supplier: string;
  min_stock: number;
  total_stock: number;
  total_reserved: number;
  total_available: number;
  unit_cost: number;
  is_active: boolean;
}

interface StockItem {
  id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  min_stock: number;
  location_id: number;
  location_code: string;
  location_name: string;
  batch_number: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit_cost: number;
  total_value: number;
}

interface Transaction {
  id: number;
  transaction_number: string;
  material_code: string;
  material_name: string;
  unit: string;
  type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  from_location_name: string;
  to_location_name: string;
  worker_name: string;
  reference_type: string;
  reference_number: string;
  notes: string;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Location {
  id: number;
  code: string;
  name: string;
  warehouse: string;
  zone: string;
}

interface StockSummary {
  total_materials: number;
  total_stock_items: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  'PZ': 'Przyjecie zewn.',
  'WZ': 'Wydanie zewn.',
  'MM': 'Przesuniecie',
  'ADJUST': 'Korekta',
  'RESERVE': 'Rezerwacja',
  'RELEASE': 'Zwolnienie',
  'COUNT': 'Inwentaryzacja',
};

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  'PZ': 'text-green-600 bg-green-100',
  'WZ': 'text-red-600 bg-red-100',
  'MM': 'text-blue-600 bg-blue-100',
  'ADJUST': 'text-yellow-600 bg-yellow-100',
  'RESERVE': 'text-purple-600 bg-purple-100',
  'RELEASE': 'text-purple-500 bg-purple-50',
  'COUNT': 'text-gray-600 bg-gray-100',
};

const InventoryPanel = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'materials' | 'transactions' | 'pz' | 'wz'>('stock');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [lowStockMaterials, setLowStockMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);

  // PZ Form
  const [pzForm, setPzForm] = useState({
    material_id: 0,
    location_id: 0,
    quantity: 1,
    unit_cost: 0,
    batch_number: '',
    supplier: '',
    supplier_document: '',
    notes: '',
  });

  // WZ Form
  const [wzForm, setWzForm] = useState({
    inventory_item_id: 0,
    quantity: 1,
    reference_type: 'order',
    reference_number: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const demoMode = isDemoMode();

  const loadData = useCallback(async () => {
    if (demoMode) {
      // Demo data
      setSummary({
        total_materials: 19,
        total_stock_items: 45,
        total_value: 25680.50,
        low_stock_count: 3,
        out_of_stock_count: 1,
      });
      setLowStockMaterials([
        { code: 'PLEX-CLEAR-5', name: 'Plyta plexi bezbarwna 5mm', current_stock: 4, min_stock: 10 },
        { code: 'KLEJ-ACRIFIX-192', name: 'Klej Acrifix 192', current_stock: 8, min_stock: 20 },
      ]);
      setCategories([
        { id: 1, name: 'Plyty plexi', description: '' },
        { id: 2, name: 'Kleje', description: '' },
        { id: 3, name: 'Profile', description: '' },
      ]);
      setLocations([
        { id: 1, code: 'MAG-A-1', name: 'Regal A - Polka 1', warehouse: 'Magazyn glowny', zone: 'Plyty' },
        { id: 2, code: 'MAG-C-2', name: 'Regal C - Gorna', warehouse: 'Magazyn glowny', zone: 'Kleje' },
      ]);
      setMaterials([
        {
          id: 1, code: 'PLEX-CLEAR-3', name: 'Plyta plexi bezbarwna 3mm',
          description: '', unit: 'szt', category_id: 1, category_name: 'Plyty plexi',
          thickness_mm: 3, supplier: 'Plast-Met', min_stock: 10, total_stock: 15,
          total_reserved: 2, total_available: 13, unit_cost: 180, is_active: true,
        },
        {
          id: 2, code: 'PLEX-CLEAR-5', name: 'Plyta plexi bezbarwna 5mm',
          description: '', unit: 'szt', category_id: 1, category_name: 'Plyty plexi',
          thickness_mm: 5, supplier: 'Plast-Met', min_stock: 10, total_stock: 4,
          total_reserved: 0, total_available: 4, unit_cost: 250, is_active: true,
        },
      ]);
      setStock([
        {
          id: 1, material_id: 1, material_code: 'PLEX-CLEAR-3', material_name: 'Plyta plexi bezbarwna 3mm',
          unit: 'szt', min_stock: 10, location_id: 1, location_code: 'MAG-A-1', location_name: 'Regal A - Polka 1',
          batch_number: '', quantity: 15, reserved_quantity: 2, available_quantity: 13, unit_cost: 180, total_value: 2700,
        },
      ]);
      setTransactions([
        {
          id: 1, transaction_number: 'PZ/2024/12/0001', material_code: 'PLEX-CLEAR-3',
          material_name: 'Plyta plexi bezbarwna 3mm', unit: 'szt', type: 'PZ', quantity: 10,
          unit_cost: 180, total_cost: 1800, from_location_name: '', to_location_name: 'Regal A - Polka 1',
          worker_name: 'Jan Kowalski', reference_type: '', reference_number: 'FV/2024/1234',
          notes: '', created_at: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [summaryRes, categoriesRes, locationsRes] = await Promise.all([
        inventoryApi.getStockSummary(),
        inventoryApi.getCategories(true),
        inventoryApi.getLocations({ active: true }),
      ]);

      if (summaryRes.success) {
        setSummary(summaryRes.data.summary);
        setLowStockMaterials(summaryRes.data.low_stock_materials || []);
      }
      if (categoriesRes.success) setCategories(categoriesRes.data.categories);
      if (locationsRes.success) setLocations(locationsRes.data.locations);

      // Load tab-specific data
      if (activeTab === 'stock') {
        const stockRes = await inventoryApi.getStock({ low_stock: filterLowStock || undefined });
        if (stockRes.success) setStock(stockRes.data.stock);
      } else if (activeTab === 'materials') {
        const materialsRes = await inventoryApi.getMaterials({
          category_id: filterCategory || undefined,
          search: searchQuery || undefined,
          low_stock: filterLowStock || undefined,
        });
        if (materialsRes.success) setMaterials(materialsRes.data.materials);
      } else if (activeTab === 'transactions') {
        const transRes = await inventoryApi.getTransactions({ limit: 50 });
        if (transRes.success) setTransactions(transRes.data.transactions);
      }
    } catch (error: any) {
      console.error('Failed to load inventory data:', error);
      toast({ title: 'Blad', description: 'Nie udalo sie zaladowac danych magazynowych', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterLowStock, filterCategory, searchQuery, demoMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitPZ = async () => {
    if (!pzForm.material_id || !pzForm.quantity || pzForm.quantity <= 0) {
      toast({ title: 'Blad', description: 'Wybierz material i podaj ilosc', variant: 'destructive' });
      return;
    }

    if (demoMode) {
      toast({ title: 'Tryb demo', description: 'Zapis niedostepny w trybie demo' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await inventoryApi.createReceiptPZ(pzForm);
      if (response.success) {
        toast({ title: 'Przyjeto', description: `Dokument ${response.data.transaction_number}` });
        setPzForm({
          material_id: 0, location_id: 0, quantity: 1, unit_cost: 0,
          batch_number: '', supplier: '', supplier_document: '', notes: '',
        });
        setActiveTab('transactions');
        loadData();
      }
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie utworzyc PZ',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitWZ = async () => {
    if (!wzForm.inventory_item_id || !wzForm.quantity || wzForm.quantity <= 0) {
      toast({ title: 'Blad', description: 'Wybierz pozycje i podaj ilosc', variant: 'destructive' });
      return;
    }

    if (demoMode) {
      toast({ title: 'Tryb demo', description: 'Zapis niedostepny w trybie demo' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await inventoryApi.createIssueWZ(wzForm);
      if (response.success) {
        toast({ title: 'Wydano', description: `Dokument ${response.data.transaction_number}` });
        setWzForm({
          inventory_item_id: 0, quantity: 1, reference_type: 'order', reference_number: '', notes: '',
        });
        setActiveTab('transactions');
        loadData();
      }
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie utworzyc WZ',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);
  };

  if (loading && !summary) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Ladowanie magazynu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-primary" />
          <h2 className="text-xl font-bold">Magazyn</h2>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card-industrial p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package size={16} />
              <span className="text-xs">Materialow</span>
            </div>
            <p className="text-xl font-bold">{summary.total_materials}</p>
          </div>
          <div className="card-industrial p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin size={16} />
              <span className="text-xs">Pozycji mag.</span>
            </div>
            <p className="text-xl font-bold">{summary.total_stock_items}</p>
          </div>
          <div className="card-industrial p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <DollarSign size={16} />
              <span className="text-xs">Wartosc</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(Number(summary.total_value))}</p>
          </div>
          <div className="card-industrial p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <AlertTriangle size={16} />
              <span className="text-xs">Niski stan</span>
            </div>
            <p className="text-xl font-bold">{summary.low_stock_count}</p>
          </div>
          <div className="card-industrial p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertTriangle size={16} />
              <span className="text-xs">Brak</span>
            </div>
            <p className="text-xl font-bold">{summary.out_of_stock_count}</p>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockMaterials.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
            <AlertTriangle size={18} />
            <span>Materialy ponizej minimalnego stanu ({lowStockMaterials.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockMaterials.slice(0, 5).map((m, i) => (
              <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                {m.code}: {m.current_stock}/{m.min_stock}
              </span>
            ))}
            {lowStockMaterials.length > 5 && (
              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
                +{lowStockMaterials.length - 5} wiecej
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(['stock', 'materials', 'transactions', 'pz', 'wz'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 hover:bg-muted'
            }`}
          >
            {tab === 'stock' && 'Stany magazynowe'}
            {tab === 'materials' && 'Katalog materialow'}
            {tab === 'transactions' && 'Transakcje'}
            {tab === 'pz' && 'Przyjecie (PZ)'}
            {tab === 'wz' && 'Wydanie (WZ)'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card-industrial p-4">
        {/* Stock Tab */}
        {activeTab === 'stock' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filterLowStock}
                  onChange={(e) => setFilterLowStock(e.target.checked)}
                  className="rounded"
                />
                Tylko niski stan
              </label>
            </div>

            {stock.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Brak pozycji magazynowych</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2">Material</th>
                      <th className="text-left py-2 px-2">Lokalizacja</th>
                      <th className="text-right py-2 px-2">Stan</th>
                      <th className="text-right py-2 px-2">Zarezerwowane</th>
                      <th className="text-right py-2 px-2">Dostepne</th>
                      <th className="text-right py-2 px-2">Wartosc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((item) => {
                      const isLowStock = item.quantity <= item.min_stock;
                      return (
                        <tr key={item.id} className={`border-b border-border/50 ${isLowStock ? 'bg-yellow-50' : ''}`}>
                          <td className="py-2 px-2">
                            <p className="font-medium">{item.material_code}</p>
                            <p className="text-xs text-muted-foreground">{item.material_name}</p>
                          </td>
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 bg-muted rounded text-xs">{item.location_code}</span>
                            <p className="text-xs text-muted-foreground">{item.location_name}</p>
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {item.quantity} {item.unit}
                            {isLowStock && <AlertTriangle size={14} className="inline ml-1 text-yellow-600" />}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-purple-600">
                            {item.reserved_quantity} {item.unit}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-medium text-green-600">
                            {item.available_quantity} {item.unit}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {formatCurrency(Number(item.total_value))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Szukaj materialu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-industrial w-full pl-9 text-sm"
                />
              </div>
              <select
                value={filterCategory || ''}
                onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
                className="input-industrial text-sm"
              >
                <option value="">Wszystkie kategorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filterLowStock}
                  onChange={(e) => setFilterLowStock(e.target.checked)}
                  className="rounded"
                />
                Niski stan
              </label>
            </div>

            {materials.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Brak materialow</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2">Kod</th>
                      <th className="text-left py-2 px-2">Nazwa</th>
                      <th className="text-left py-2 px-2">Kategoria</th>
                      <th className="text-right py-2 px-2">Stan</th>
                      <th className="text-right py-2 px-2">Min.</th>
                      <th className="text-right py-2 px-2">Cena</th>
                      <th className="text-left py-2 px-2">Dostawca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((mat) => {
                      const isLowStock = mat.total_stock <= mat.min_stock;
                      return (
                        <tr key={mat.id} className={`border-b border-border/50 ${isLowStock ? 'bg-yellow-50' : ''}`}>
                          <td className="py-2 px-2 font-mono">{mat.code}</td>
                          <td className="py-2 px-2">
                            <p className="font-medium">{mat.name}</p>
                            {mat.thickness_mm && <span className="text-xs text-muted-foreground">{mat.thickness_mm}mm</span>}
                          </td>
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 bg-muted rounded text-xs">{mat.category_name}</span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {mat.total_stock} {mat.unit}
                            {isLowStock && <AlertTriangle size={14} className="inline ml-1 text-yellow-600" />}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                            {mat.min_stock} {mat.unit}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {mat.unit_cost ? formatCurrency(Number(mat.unit_cost)) : '-'}
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">{mat.supplier || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Brak transakcji</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2">Nr dokumentu</th>
                      <th className="text-center py-2 px-2">Typ</th>
                      <th className="text-left py-2 px-2">Material</th>
                      <th className="text-right py-2 px-2">Ilosc</th>
                      <th className="text-right py-2 px-2">Wartosc</th>
                      <th className="text-left py-2 px-2">Lokalizacja</th>
                      <th className="text-left py-2 px-2">Wykonawca</th>
                      <th className="text-left py-2 px-2">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((trans) => (
                      <tr key={trans.id} className="border-b border-border/50">
                        <td className="py-2 px-2 font-mono text-xs">{trans.transaction_number}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${TRANSACTION_TYPE_COLORS[trans.type] || 'bg-gray-100'}`}>
                            {TRANSACTION_TYPE_LABELS[trans.type] || trans.type}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <p className="font-medium">{trans.material_code}</p>
                          <p className="text-xs text-muted-foreground">{trans.material_name}</p>
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          <span className={trans.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                            {trans.quantity > 0 ? '+' : ''}{trans.quantity} {trans.unit}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {trans.total_cost ? formatCurrency(Number(trans.total_cost)) : '-'}
                        </td>
                        <td className="py-2 px-2 text-xs">
                          {trans.type === 'PZ' && trans.to_location_name}
                          {trans.type === 'WZ' && trans.from_location_name}
                          {trans.type === 'MM' && `${trans.from_location_name} -> ${trans.to_location_name}`}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">{trans.worker_name || '-'}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{formatDate(trans.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PZ Form */}
        {activeTab === 'pz' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <ArrowUpCircle size={20} />
              <h3 className="font-bold">Przyjecie zewnetrzne (PZ)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Material *</label>
                <select
                  value={pzForm.material_id}
                  onChange={(e) => setPzForm(prev => ({ ...prev, material_id: Number(e.target.value) }))}
                  className="input-industrial w-full"
                >
                  <option value={0}>-- Wybierz material --</option>
                  {materials.map((mat) => (
                    <option key={mat.id} value={mat.id}>{mat.code} - {mat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Lokalizacja</label>
                <select
                  value={pzForm.location_id}
                  onChange={(e) => setPzForm(prev => ({ ...prev, location_id: Number(e.target.value) }))}
                  className="input-industrial w-full"
                >
                  <option value={0}>-- Bez lokalizacji --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.code} - {loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Ilosc *</label>
                <input
                  type="number"
                  step="0.01"
                  value={pzForm.quantity}
                  onChange={(e) => setPzForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="input-industrial w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Cena jednostkowa</label>
                <input
                  type="number"
                  step="0.01"
                  value={pzForm.unit_cost}
                  onChange={(e) => setPzForm(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
                  className="input-industrial w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nr partii</label>
                <input
                  type="text"
                  value={pzForm.batch_number}
                  onChange={(e) => setPzForm(prev => ({ ...prev, batch_number: e.target.value }))}
                  className="input-industrial w-full"
                  placeholder="np. LOT-2024-001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Dostawca</label>
                <input
                  type="text"
                  value={pzForm.supplier}
                  onChange={(e) => setPzForm(prev => ({ ...prev, supplier: e.target.value }))}
                  className="input-industrial w-full"
                  placeholder="np. Plast-Met"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nr dokumentu dostawy</label>
                <input
                  type="text"
                  value={pzForm.supplier_document}
                  onChange={(e) => setPzForm(prev => ({ ...prev, supplier_document: e.target.value }))}
                  className="input-industrial w-full"
                  placeholder="np. FV/2024/1234"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Notatki</label>
                <input
                  type="text"
                  value={pzForm.notes}
                  onChange={(e) => setPzForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-industrial w-full"
                  placeholder="Dodatkowe uwagi"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSubmitPZ}
                disabled={submitting || !pzForm.material_id || pzForm.quantity <= 0}
                className="btn-primary"
              >
                <Save size={16} className="mr-2" />
                {submitting ? 'Zapisywanie...' : 'Zapisz przyjecie'}
              </button>
            </div>
          </div>
        )}

        {/* WZ Form */}
        {activeTab === 'wz' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <ArrowDownCircle size={20} />
              <h3 className="font-bold">Wydanie zewnetrzne (WZ)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">Pozycja magazynowa *</label>
                <select
                  value={wzForm.inventory_item_id}
                  onChange={(e) => setWzForm(prev => ({ ...prev, inventory_item_id: Number(e.target.value) }))}
                  className="input-industrial w-full"
                >
                  <option value={0}>-- Wybierz pozycje --</option>
                  {stock.filter(s => s.available_quantity > 0).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.material_code} @ {item.location_code} - dostepne: {item.available_quantity} {item.unit}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Ilosc *</label>
                <input
                  type="number"
                  step="0.01"
                  value={wzForm.quantity}
                  onChange={(e) => setWzForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="input-industrial w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nr referencyjny</label>
                <input
                  type="text"
                  value={wzForm.reference_number}
                  onChange={(e) => setWzForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  className="input-industrial w-full"
                  placeholder="np. ZLC-2024-001"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">Notatki</label>
                <input
                  type="text"
                  value={wzForm.notes}
                  onChange={(e) => setWzForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-industrial w-full"
                  placeholder="Cel wydania, uwagi"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSubmitWZ}
                disabled={submitting || !wzForm.inventory_item_id || wzForm.quantity <= 0}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                <Save size={16} className="mr-2" />
                {submitting ? 'Zapisywanie...' : 'Zapisz wydanie'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPanel;
