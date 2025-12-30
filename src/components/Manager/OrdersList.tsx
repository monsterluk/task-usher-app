import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Download, Eye, Archive, RotateCcw, Loader2, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, ArrowLeft, Filter } from 'lucide-react';
import AdvancedOrderFilters, { OrderFilters, defaultFilters } from './Filters/AdvancedOrderFilters';
import { getStageStatusColor } from '@/data/mockData';
import { PRIORITY_LABELS, PRIORITY_COLORS, OrderPriority } from '@/types';

type FilterType = 'AKTYWNE' | 'ARCHIWUM' | 'WSZYSTKIE' | 'PRZETERMINOWANE';
type SortField = 'order_number' | 'client_name' | 'product_name' | 'quantity' | 'price_total' | 'planned_completion_date' | 'status' | 'priority';
type SortDirection = 'asc' | 'desc';

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
  const itemsPerPage = 15;

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOWE': return <span className="status-badge status-new">Nowe</span>;
      case 'W_TRAKCIE': return <span className="status-badge status-in-progress">W trakcie</span>;
      case 'GOTOWE': return <span className="status-badge status-done">Gotowe</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Szukaj po nr zlecenia, kliencie, produkcie..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-industrial w-full pl-10"
          />
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
      <div className="hidden md:block card-industrial overflow-hidden p-0">
        <table className="table-industrial">
          <thead>
            <tr>
              <th className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('order_number')}>
                <span className="flex items-center gap-1">Nr <SortIcon field="order_number" /></span>
              </th>
              <th className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('client_name')}>
                <span className="flex items-center gap-1">Klient <SortIcon field="client_name" /></span>
              </th>
              <th className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('product_name')}>
                <span className="flex items-center gap-1">Produkt <SortIcon field="product_name" /></span>
              </th>
              <th className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('quantity')}>
                <span className="flex items-center gap-1">Ilość <SortIcon field="quantity" /></span>
              </th>
              <th className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('price_total')}>
                <span className="flex items-center gap-1">Wartość <SortIcon field="price_total" /></span>
              </th>
              <th>Etapy</th>
              <th className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('planned_completion_date')}>
                <span className="flex items-center gap-1">Termin <SortIcon field="planned_completion_date" /></span>
              </th>
              <th>Dni</th>
              <th className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
              </th>
              <th className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('priority')}>
                <span className="flex items-center gap-1">Priorytet <SortIcon field="priority" /></span>
              </th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak zleceń do wyświetlenia'}
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const days = getDaysUntilDeadline(order.planned_completion_date);
                return (
                  <tr key={order.id} className={order.archived ? 'opacity-60' : ''}>
                    <td className="font-mono font-semibold">{order.order_number}</td>
                    <td>{order.client_name}</td>
                    <td>{order.product_name}</td>
                    <td>{order.quantity} szt.</td>
                    <td className="font-mono">{Number(order.price_total || 0).toFixed(2)} zł</td>
                    <td><StageIndicators stages={order.stages} plannedDate={order.planned_completion_date} /></td>
                    <td>{new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</td>
                    <td className={getDeadlineColor(days)}>
                      {days < 0 ? `${Math.abs(days)} dni temu` :
                       days === 0 ? 'Dziś' :
                       `${days} dni`}
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>
                      <span className={`font-medium ${PRIORITY_COLORS[order.priority as OrderPriority] || 'text-blue-600'}`}>
                        {PRIORITY_LABELS[order.priority as OrderPriority] || 'Normalny'}
                      </span>
                    </td>
                    <td className="flex gap-2">
                      <button onClick={() => navigate(`/manager/orders/${order.id}`)} className="btn-secondary py-2 px-3" title="Szczegóły">
                        <Eye size={16} />
                      </button>
                      <button onClick={(e) => toggleArchive(order.id, e)} className="btn-secondary py-2 px-3" title={order.archived ? 'Przywróć' : 'Archiwizuj'}>
                        {order.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
            return (
              <div key={order.id} className={`card-industrial ${order.archived ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg">{order.order_number}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${PRIORITY_COLORS[order.priority as OrderPriority] || 'text-blue-600'}`}>
                      {PRIORITY_LABELS[order.priority as OrderPriority] || 'Normalny'}
                    </span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <p><span className="text-muted-foreground">Klient:</span> {order.client_name}</p>
                  <p><span className="text-muted-foreground">Produkt:</span> {order.product_name}</p>
                  <p><span className="text-muted-foreground">Ilość:</span> {order.quantity} szt. | <span className="text-muted-foreground">Wartość:</span> {Number(order.price_total || 0).toFixed(2)} zł</p>
                  <p><span className="text-muted-foreground">Termin:</span> {new Date(order.planned_completion_date).toLocaleDateString('pl-PL')} (<span className={getDeadlineColor(days)}>{days < 0 ? `${Math.abs(days)} dni temu` : days === 0 ? 'Dziś' : `${days} dni`}</span>)</p>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Etapy:</span>
                    <StageIndicators stages={order.stages} plannedDate={order.planned_completion_date} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/manager/orders/${order.id}`)} className="btn-primary flex-1">Szczegóły</button>
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
