import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Download, Eye, Archive, RotateCcw, Loader2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, ArrowLeft, Filter, Trash2, Play, Edit, X, CheckSquare, Square } from 'lucide-react';
import AdvancedOrderFilters, { OrderFilters, defaultFilters } from './Filters/AdvancedOrderFilters';
import { getStageStatusColor } from '@/data/mockData';
import { PRIORITY_LABELS, PRIORITY_COLORS, OrderPriority } from '@/types';

type FilterType = 'AKTYWNE' | 'ARCHIWUM' | 'WSZYSTKIE' | 'PRZETERMINOWANE';
type SortField = 'order_number' | 'client_name' | 'product_name' | 'quantity' | 'price_total' | 'planned_completion_date' | 'status' | 'priority';
type SortDirection = 'asc' | 'desc';

// Enhanced Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    'NOWE': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Nowe' },
    'DO_PRODUKCJI': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Do produkcji' },
    'W_TRAKCIE': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'W trakcie' },
    'CZESCIOWO_GOTOWE': { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Częściowo gotowe' },
    'GOTOWE': { bg: 'bg-green-100', text: 'text-green-800', label: 'Gotowe' },
    'DO_WYSYLKI': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Do wysyłki' },
    'WYSLANE': { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Wysłane' },
    'ZAFAKTUROWANE': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Zafakturowane' },
    'ZAMKNIETE': { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Zamknięte' },
  };
  const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} transition-all duration-200`}>
      {style.label}
    </span>
  );
};

// Priority Badge Component with emojis
const PriorityBadge = ({ priority }: { priority: string }) => {
  const styles: Record<string, { emoji: string; bg: string; text: string; label: string }> = {
    'PILNE': { emoji: '🔥', bg: 'bg-red-100', text: 'text-red-700', label: 'Pilne' },
    'WYSOKI': { emoji: '⚡', bg: 'bg-orange-100', text: 'text-orange-700', label: 'Wysoki' },
    'NORMALNY': { emoji: '', bg: 'bg-gray-100', text: 'text-gray-600', label: 'Normalny' },
    'NISKI': { emoji: '📅', bg: 'bg-slate-100', text: 'text-slate-600', label: 'Niski' },
  };
  const style = styles[priority] || styles['NORMALNY'];

  if (priority === 'NORMALNY' || priority === 'NISKI') {
    return null; // No badge for normal/low priority
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.emoji} {style.label}
    </span>
  );
};

// Worker Avatar Component
const WorkerAvatar = ({ name, size = 'sm' }: { name?: string; size?: 'sm' | 'md' }) => {
  if (!name) return null;

  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
  ];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';

  return (
    <div
      className={`${sizeClass} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-semibold cursor-default transition-transform hover:scale-110`}
      title={name}
    >
      {initials}
    </div>
  );
};

const OrdersList = () => {
  const { orders, setOrders, refreshOrders, loading, currentUser } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for initial filter from URL
  const getInitialFilter = (): FilterType => {
    const urlFilter = searchParams.get('filter');
    if (urlFilter === 'PRZETERMINOWANE') return 'PRZETERMINOWANE';
    return 'AKTYWNE';
  };

  const [filter, setFilter] = useState<FilterType>(getInitialFilter());
  const [localLoading, setLocalLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('planned_completion_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<OrderFilters>(defaultFilters);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const itemsPerPage = 15;

  // Bulk selection handlers
  const toggleSelectOrder = (orderId: number) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(o => o.id)));
    }
  };

  const clearSelection = () => setSelectedOrders(new Set());

  // Bulk actions
  const bulkArchive = () => {
    setOrders(prev => prev.map(o =>
      selectedOrders.has(o.id) ? { ...o, archived: true } : o
    ));
    clearSelection();
  };

  const bulkDelete = () => {
    if (window.confirm(`Czy na pewno chcesz usunąć ${selectedOrders.size} zleceń?`)) {
      setOrders(prev => prev.filter(o => !selectedOrders.has(o.id)));
      clearSelection();
    }
  };

  const bulkSetStatus = (status: string) => {
    setOrders(prev => prev.map(o =>
      selectedOrders.has(o.id) ? { ...o, status } : o
    ));
    clearSelection();
  };

  // Ładuj zlecenia z API przy mount (tylko raz)
  useEffect(() => {
    const loadOrders = async () => {
      setLocalLoading(true);
      await refreshOrders();
      setLocalLoading(false);
    };
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Celowo puste - ładujemy tylko przy montowaniu

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  // Helper: check if order is overdue
  const isOrderOverdue = (order: typeof orders[0]) => {
    if (order.archived || order.status === 'GOTOWE') return false;
    const deadline = new Date(order.planned_completion_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    return deadline < today;
  };

  // Filter and search orders
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (filter === 'AKTYWNE' && (order.archived || order.status === 'GOTOWE')) return false;
    if (filter === 'ARCHIWUM' && !order.archived && order.status !== 'GOTOWE') return false;
    if (filter === 'PRZETERMINOWANE' && !isOrderOverdue(order)) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        order.order_number.toLowerCase().includes(query) ||
        order.client_name.toLowerCase().includes(query) ||
        order.product_name.toLowerCase().includes(query) ||
        (order.client_order_number?.toLowerCase().includes(query) || false)
      );
    }
    return true;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    // Handle special cases
    if (sortField === 'price_total') {
      aVal = aVal || 0;
      bVal = bVal || 0;
    } else if (sortField === 'planned_completion_date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal?.toLowerCase() || '';
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + itemsPerPage);

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // Oblicz dni do terminu
  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Kolor dla dni do terminu
  const getDeadlineColor = (days: number) => {
    if (days < 0) return 'text-red-500 font-bold'; // Opóźnione
    if (days <= 2) return 'text-orange-500 font-bold'; // Pilne
    if (days <= 7) return 'text-yellow-500'; // Ostrzeżenie
    return ''; // Normalne
  };

  const toggleArchive = (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, archived: !o.archived } : o
    ));
  };

  // getStatusBadge replaced by StatusBadge component at top of file

  const StageIndicators = ({ stages, plannedDate }: { stages?: any[]; plannedDate: string }) => (
    <div className="flex gap-1">
      {(stages || []).slice(0, 5).map((stage, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-sm"
          style={{ backgroundColor: getStageStatusColor(stage.status, plannedDate) }}
          title={stage.stage_name || `Etap ${i + 1}`}
        />
      ))}
      {(stages?.length || 0) > 5 && (
        <span className="text-xs text-muted-foreground">+{(stages?.length || 0) - 5}</span>
      )}
    </div>
  );

  // Helper to escape CSV values
  const escapeCSV = (value: string | number | undefined): string => {
    if (value === undefined || value === null) return '';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportToCSV = () => {
    const headers = ['Nr zlecenia', 'Nr klienta', 'Klient', 'Email', 'Telefon', 'Adres', 'Produkt', 'Ilość', 'Cena jedn.', 'Wartość', 'Termin', 'Status', 'Aktualny etap', 'Data utworzenia'];
    const rows = filteredOrders.map(o => [
      escapeCSV(o.order_number),
      escapeCSV(o.client_order_number),
      escapeCSV(o.client_name),
      escapeCSV(o.client_email),
      escapeCSV(o.client_phone),
      escapeCSV([o.client_address, o.client_postal, o.client_city].filter(Boolean).join(', ')),
      escapeCSV(o.product_name),
      o.quantity,
      Number(o.price_per_unit || 0).toFixed(2),
      Number(o.price_total || 0).toFixed(2),
      o.planned_completion_date,
      o.status === 'NOWE' ? 'Nowe' : o.status === 'W_TRAKCIE' ? 'W trakcie' : o.status === 'GOTOWE' ? 'Gotowe' : o.status,
      escapeCSV(o.currentStage),
      o.created_at ? new Date(o.created_at).toLocaleDateString('pl-PL') : ''
    ]);

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plexisystem_zlecenia_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // Create XML-based Excel format for better compatibility
    const headers = ['Nr zlecenia', 'Nr klienta', 'Klient', 'Email', 'Telefon', 'Adres', 'Produkt', 'Ilość', 'Cena jedn.', 'Wartość', 'Termin', 'Status', 'Aktualny etap', 'Data utworzenia'];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header"><Font ss:Bold="1"/><Interior ss:Color="#4472C4" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF"/></Style>
    <Style ss:ID="money"><NumberFormat ss:Format="#,##0.00\ &quot;zł&quot;"/></Style>
  </Styles>
  <Worksheet ss:Name="Zlecenia">
    <Table>
      <Row ss:StyleID="header">
        ${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}
      </Row>`;

    filteredOrders.forEach(o => {
      xml += `
      <Row>
        <Cell><Data ss:Type="String">${o.order_number || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${o.client_order_number || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.client_name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Data></Cell>
        <Cell><Data ss:Type="String">${o.client_email || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${o.client_phone || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${[o.client_address, o.client_postal, o.client_city].filter(Boolean).join(', ').replace(/&/g, '&amp;')}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.product_name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Data></Cell>
        <Cell><Data ss:Type="Number">${o.quantity || 0}</Data></Cell>
        <Cell ss:StyleID="money"><Data ss:Type="Number">${o.price_per_unit || 0}</Data></Cell>
        <Cell ss:StyleID="money"><Data ss:Type="Number">${o.price_total || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${o.planned_completion_date}</Data></Cell>
        <Cell><Data ss:Type="String">${o.status === 'NOWE' ? 'Nowe' : o.status === 'W_TRAKCIE' ? 'W trakcie' : o.status === 'GOTOWE' ? 'Gotowe' : o.status}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.currentStage || '').replace(/&/g, '&amp;')}</Data></Cell>
        <Cell><Data ss:Type="String">${o.created_at ? new Date(o.created_at).toLocaleDateString('pl-PL') : ''}</Data></Cell>
      </Row>`;
    });

    xml += `
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plexisystem_zlecenia_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (loading || localLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
        <span className="ml-2">Ładowanie zleceń z API...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">📋 Lista Zleceń</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} zleceń w systemie
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {currentUser?.role === 'ADMIN' && (
            <button onClick={() => navigate('/admin')} className="btn-secondary" title="Wróć do panelu admina">
              <ArrowLeft size={18} className="mr-2" />
              Panel Admin
            </button>
          )}
          {currentUser?.role === 'KIEROWNIK' && (
            <button onClick={() => navigate('/manager')} className="btn-secondary" title="Wróć do dashboardu">
              <ArrowLeft size={18} className="mr-2" />
              Dashboard
            </button>
          )}
          <button onClick={exportToCSV} className="btn-secondary" title="Eksport do CSV">
            <Download size={18} className="mr-2" />
            CSV
          </button>
          <button onClick={exportToExcel} className="btn-secondary" title="Eksport do Excel">
            <FileSpreadsheet size={18} className="mr-2" />
            Excel
          </button>
          <button className="btn-primary" onClick={() => navigate('/manager/orders/new')}>
            <Plus size={18} className="mr-2" />
            Nowe Zlecenie
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrders.size > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
              <CheckSquare size={20} />
              Zaznaczono: {selectedOrders.size}
            </span>
            <button onClick={clearSelection} className="text-sm text-muted-foreground hover:text-foreground">
              <X size={16} className="inline mr-1" />
              Anuluj
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => bulkSetStatus('W_TRAKCIE')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Play size={16} />
              Do produkcji
            </button>
            <button
              onClick={bulkArchive}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              <Archive size={16} />
              Archiwizuj
            </button>
            <button
              onClick={bulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              <Trash2 size={16} />
              Usuń
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Enhanced Search Input */}
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="🔍 Szukaj po nr zlecenia, kliencie, produkcie..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Advanced Filter Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`btn-secondary ${showAdvancedFilters ? 'bg-primary text-primary-foreground' : ''}`}
        >
          <Filter size={18} className="mr-2" />
          Filtry
        </button>

        {/* Status Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['AKTYWNE', 'PRZETERMINOWANE', 'ARCHIWUM', 'WSZYSTKIE'] as FilterType[]).map(f => {
            const getFilterCount = () => {
              switch (f) {
                case 'AKTYWNE': return orders.filter(o => !o.archived && o.status !== 'GOTOWE').length;
                case 'PRZETERMINOWANE': return orders.filter(isOrderOverdue).length;
                case 'ARCHIWUM': return orders.filter(o => o.archived || o.status === 'GOTOWE').length;
                case 'WSZYSTKIE': return orders.length;
              }
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  filter === f
                    ? f === 'PRZETERMINOWANE'
                      ? 'bg-red-500 text-white'
                      : 'bg-primary text-primary-foreground'
                    : f === 'PRZETERMINOWANE' && getFilterCount() > 0
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {f} ({getFilterCount()})
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="mb-4">
          <AdvancedOrderFilters
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            onClose={() => setShowAdvancedFilters(false)}
          />
        </div>
      )}

      {/* Results info */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground mb-4">
          Znaleziono {filteredOrders.length} zleceń dla "{searchQuery}"
        </p>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block card-industrial overflow-hidden p-0 rounded-xl shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Enhanced Gradient Header */}
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
                <th className="px-4 py-4 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="w-5 h-5 rounded border-2 border-white/50 flex items-center justify-center hover:border-white transition-colors"
                  >
                    {selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0 ? (
                      <CheckSquare size={14} className="text-white" />
                    ) : (
                      <Square size={14} className="text-white/50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleSort('order_number')}>
                  <span className="flex items-center gap-2 text-white font-semibold text-sm">Nr <SortIcon field="order_number" /></span>
                </th>
                <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleSort('client_name')}>
                  <span className="flex items-center gap-2 text-white font-semibold text-sm">Klient <SortIcon field="client_name" /></span>
                </th>
                <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleSort('product_name')}>
                  <span className="flex items-center gap-2 text-white font-semibold text-sm">Produkt <SortIcon field="product_name" /></span>
                </th>
                <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleSort('quantity')}>
                  <span className="flex items-center gap-2 text-white font-semibold text-sm">Ilość <SortIcon field="quantity" /></span>
                </th>
                <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleSort('price_total')}>
                  <span className="flex items-center gap-2 text-white font-semibold text-sm">Wartość <SortIcon field="price_total" /></span>
                </th>
                <th className="px-4 py-4 text-left text-white font-semibold text-sm">Etapy</th>
                <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleSort('planned_completion_date')}>
                  <span className="flex items-center gap-2 text-white font-semibold text-sm">Termin <SortIcon field="planned_completion_date" /></span>
                </th>
                <th className="px-4 py-4 text-left text-white font-semibold text-sm">Dni</th>
                <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleSort('status')}>
                  <span className="flex items-center gap-2 text-white font-semibold text-sm">Status <SortIcon field="status" /></span>
                </th>
                <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleSort('priority')}>
                  <span className="flex items-center gap-2 text-white font-semibold text-sm">Priorytet <SortIcon field="priority" /></span>
                </th>
                <th className="px-4 py-4 text-left text-white font-semibold text-sm">Akcje</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={48} className="opacity-20" />
                    {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak zleceń do wyświetlenia'}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const days = getDaysUntilDeadline(order.planned_completion_date);
                const isSelected = selectedOrders.has(order.id);
                const isOverdue = days < 0;

                return (
                  <tr
                    key={order.id}
                    className={`
                      group transition-all duration-200 cursor-pointer
                      ${order.archived ? 'opacity-50 bg-gray-50 dark:bg-gray-900/50' : ''}
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                      ${isOverdue && !order.archived ? 'bg-red-50/50 dark:bg-red-900/10' : ''}
                    `}
                    onClick={() => navigate(`/manager/orders/${order.id}`)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelectOrder(order.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {isSelected && <CheckSquare size={12} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <WorkerAvatar name={order.client_name} />
                        <span className="font-medium">{order.client_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={order.product_name}>{order.product_name}</td>
                    <td className="px-4 py-3 text-center">{order.quantity} szt.</td>
                    <td className="px-4 py-3 font-mono font-semibold">{Number(order.price_total || 0).toLocaleString('pl-PL')} zł</td>
                    <td className="px-4 py-3"><StageIndicators stages={order.stages} plannedDate={order.planned_completion_date} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</td>
                    <td className={`px-4 py-3 font-semibold whitespace-nowrap ${getDeadlineColor(days)}`}>
                      {days < 0 ? `${Math.abs(days)} dni temu` :
                       days === 0 ? '🔥 Dziś' :
                       days <= 2 ? `⚠️ ${days} dni` :
                       `${days} dni`}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={order.priority || 'NORMALNY'} /></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => navigate(`/manager/orders/${order.id}`)}
                          className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                          title="Szczegóły"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/manager/orders/${order.id}/edit`)}
                          className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          title="Edytuj"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => toggleArchive(order.id, e)}
                          className="p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
                          title={order.archived ? 'Przywróć' : 'Archiwizuj'}
                        >
                          {order.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {paginatedOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak zleceń do wyświetlenia'}
          </div>
        ) : (
          paginatedOrders.map((order) => {
            const days = getDaysUntilDeadline(order.planned_completion_date);
            const isSelected = selectedOrders.has(order.id);
            const isOverdue = days < 0;
            return (
              <div
                key={order.id}
                className={`card-industrial transition-all duration-200 ${order.archived ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isOverdue && !order.archived ? 'border-red-200 dark:border-red-800' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSelectOrder(order.id)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {isSelected && <CheckSquare size={14} />}
                    </button>
                    <div>
                      <span className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">{order.order_number}</span>
                      <PriorityBadge priority={order.priority || 'NORMALNY'} />
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <WorkerAvatar name={order.client_name} size="sm" />
                    <span className="font-medium">{order.client_name}</span>
                  </div>
                  <p><span className="text-muted-foreground">Produkt:</span> {order.product_name}</p>
                  <p><span className="text-muted-foreground">Ilość:</span> {order.quantity} szt. | <span className="text-muted-foreground">Wartość:</span> <span className="font-semibold">{Number(order.price_total || 0).toLocaleString('pl-PL')} zł</span></p>
                  <p>
                    <span className="text-muted-foreground">Termin:</span> {new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}
                    <span className={`ml-2 font-semibold ${getDeadlineColor(days)}`}>
                      {days < 0 ? `${Math.abs(days)} dni temu` :
                       days === 0 ? '🔥 Dziś' :
                       days <= 2 ? `⚠️ ${days} dni` :
                       `${days} dni`}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Etapy:</span>
                    <StageIndicators stages={order.stages} plannedDate={order.planned_completion_date} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/manager/orders/${order.id}`)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Eye size={18} />
                    Szczegóły
                  </button>
                  <button onClick={() => navigate(`/manager/orders/${order.id}/edit`)} className="btn-secondary">
                    <Edit size={18} />
                  </button>
                  <button onClick={(e) => toggleArchive(order.id, e)} className="btn-secondary">
                    {order.archived ? <RotateCcw size={18} /> : <Archive size={18} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <p className="text-sm text-muted-foreground">
            Wyświetlono {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredOrders.length)} z {filteredOrders.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-secondary py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-md transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
