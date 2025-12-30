import { useState, useEffect } from 'react';
import {
  Filter,
  X,
  Calendar,
  User,
  Package,
  Clock,
  AlertTriangle,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Save,
  Bookmark
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export interface OrderFilters {
  search: string;
  status: string[];
  priority: string[];
  dateFrom: string;
  dateTo: string;
  clientName: string;
  productType: string;
  assignedWorker: number | null;
  currentStage: string;
  isOverdue: boolean | null;
  minValue: number | null;
  maxValue: number | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AdvancedOrderFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onClose?: () => void;
  compact?: boolean;
}

const defaultFilters: OrderFilters = {
  search: '',
  status: [],
  priority: [],
  dateFrom: '',
  dateTo: '',
  clientName: '',
  productType: '',
  assignedWorker: null,
  currentStage: '',
  isOverdue: null,
  minValue: null,
  maxValue: null,
  sortBy: 'created_at',
  sortOrder: 'desc'
};

interface SavedFilter {
  id: string;
  name: string;
  filters: OrderFilters;
}

const AdvancedOrderFilters = ({
  filters,
  onFiltersChange,
  onClose,
  compact = false
}: AdvancedOrderFiltersProps) => {
  const { workers, orders } = useApp();
  const [expanded, setExpanded] = useState(!compact);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('plexisystem_saved_filters');
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, []);

  // Get unique values from orders
  const uniqueClients = [...new Set(orders.map(o => o.client_name))].sort();
  const uniqueStages = [...new Set(orders.flatMap(o => o.stages?.map(s => s.name) || []))].sort();
  const uniqueProductTypes = [...new Set(orders.map(o => o.product_name?.split(' ')[0]))].filter(Boolean).sort();

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy' || key === 'sortOrder') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (value === null || value === '') return false;
    return true;
  }).length;

  const handleReset = () => {
    onFiltersChange(defaultFilters);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: { ...filters }
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('plexisystem_saved_filters', JSON.stringify(updated));
    setShowSaveDialog(false);
    setFilterName('');
  };

  const handleLoadFilter = (saved: SavedFilter) => {
    onFiltersChange(saved.filters);
  };

  const handleDeleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('plexisystem_saved_filters', JSON.stringify(updated));
  };

  const toggleArrayFilter = (key: 'status' | 'priority', value: string) => {
    const current = filters[key];
    if (current.includes(value)) {
      onFiltersChange({ ...filters, [key]: current.filter(v => v !== value) });
    } else {
      onFiltersChange({ ...filters, [key]: [...current, value] });
    }
  };

  return (
    <div className={`bg-card rounded-lg border border-border ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-semibold"
        >
          <Filter size={18} />
          <span>Filtry zaawansowane</span>
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
              {activeFiltersCount}
            </span>
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1">Szukaj</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                placeholder="Numer zlecenia, klient, produkt..."
                className="input-industrial w-full pl-10"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'NOWE', label: 'Nowe', color: 'bg-gray-100 text-gray-800' },
                { value: 'W_TRAKCIE', label: 'W trakcie', color: 'bg-blue-100 text-blue-800' },
                { value: 'GOTOWE', label: 'Gotowe', color: 'bg-green-100 text-green-800' },
                { value: 'WSTRZYMANE', label: 'Wstrzymane', color: 'bg-yellow-100 text-yellow-800' }
              ].map(status => (
                <button
                  key={status.value}
                  onClick={() => toggleArrayFilter('status', status.value)}
                  className={`px-3 py-1.5 rounded text-sm transition-all ${
                    filters.status.includes(status.value)
                      ? 'ring-2 ring-primary ring-offset-1 ' + status.color
                      : status.color + ' opacity-60 hover:opacity-100'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2">Priorytet</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'KRYTYCZNY', label: 'Krytyczny', color: 'bg-red-100 text-red-800' },
                { value: 'WYSOKI', label: 'Wysoki', color: 'bg-orange-100 text-orange-800' },
                { value: 'NORMALNY', label: 'Normalny', color: 'bg-blue-100 text-blue-800' },
                { value: 'NISKI', label: 'Niski', color: 'bg-gray-100 text-gray-800' }
              ].map(priority => (
                <button
                  key={priority.value}
                  onClick={() => toggleArrayFilter('priority', priority.value)}
                  className={`px-3 py-1.5 rounded text-sm transition-all ${
                    filters.priority.includes(priority.value)
                      ? 'ring-2 ring-primary ring-offset-1 ' + priority.color
                      : priority.color + ' opacity-60 hover:opacity-100'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Od daty</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                className="input-industrial w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Do daty</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                className="input-industrial w-full"
              />
            </div>
          </div>

          {/* Client & Product */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Klient</label>
              <select
                value={filters.clientName}
                onChange={(e) => onFiltersChange({ ...filters, clientName: e.target.value })}
                className="input-industrial w-full"
              >
                <option value="">Wszyscy</option>
                {uniqueClients.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Etap</label>
              <select
                value={filters.currentStage}
                onChange={(e) => onFiltersChange({ ...filters, currentStage: e.target.value })}
                className="input-industrial w-full"
              >
                <option value="">Wszystkie</option>
                {uniqueStages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Worker & Overdue */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pracownik</label>
              <select
                value={filters.assignedWorker || ''}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  assignedWorker: e.target.value ? parseInt(e.target.value) : null
                })}
                className="input-industrial w-full"
              >
                <option value="">Wszyscy</option>
                {workers.filter(w => w.active).map(worker => (
                  <option key={worker.id} value={worker.id}>{worker.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Termin</label>
              <select
                value={filters.isOverdue === null ? '' : filters.isOverdue ? 'overdue' : 'on_time'}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  isOverdue: e.target.value === '' ? null : e.target.value === 'overdue'
                })}
                className="input-industrial w-full"
              >
                <option value="">Wszystkie</option>
                <option value="overdue">Po terminie</option>
                <option value="on_time">W terminie</option>
              </select>
            </div>
          </div>

          {/* Value Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Wartosc od (PLN)</label>
              <input
                type="number"
                value={filters.minValue || ''}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  minValue: e.target.value ? parseFloat(e.target.value) : null
                })}
                placeholder="Min"
                className="input-industrial w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wartosc do (PLN)</label>
              <input
                type="number"
                value={filters.maxValue || ''}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  maxValue: e.target.value ? parseFloat(e.target.value) : null
                })}
                placeholder="Max"
                className="input-industrial w-full"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sortuj wg</label>
              <select
                value={filters.sortBy}
                onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value })}
                className="input-industrial w-full"
              >
                <option value="created_at">Data utworzenia</option>
                <option value="planned_completion_date">Termin</option>
                <option value="order_number">Numer</option>
                <option value="client_name">Klient</option>
                <option value="priority">Priorytet</option>
                <option value="price_total">Wartosc</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kolejnosc</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  sortOrder: e.target.value as 'asc' | 'desc'
                })}
                className="input-industrial w-full"
              >
                <option value="desc">Malejaco</option>
                <option value="asc">Rosnaco</option>
              </select>
            </div>
          </div>

          {/* Saved Filters */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Zapisane filtry</span>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Save size={14} />
                Zapisz obecne
              </button>
            </div>
            {savedFilters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {savedFilters.map(saved => (
                  <div
                    key={saved.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded text-sm"
                  >
                    <button
                      onClick={() => handleLoadFilter(saved)}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Bookmark size={12} />
                      {saved.name}
                    </button>
                    <button
                      onClick={() => handleDeleteSavedFilter(saved.id)}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Brak zapisanych filtrow</p>
            )}
          </div>

          {/* Save Dialog */}
          {showSaveDialog && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Nazwa filtra..."
                  className="input-industrial flex-1"
                  autoFocus
                />
                <button onClick={handleSaveFilter} className="btn-primary px-3">
                  Zapisz
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="btn-secondary px-3"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedOrderFilters;
export { defaultFilters };
