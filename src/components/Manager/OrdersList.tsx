import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Eye, Archive, RotateCcw, Loader2 } from 'lucide-react';
import { getStageStatusColor } from '@/data/mockData';

type FilterType = 'AKTYWNE' | 'ARCHIWUM' | 'WSZYSTKIE';

const OrdersList = () => {
  const { orders, setOrders, refreshOrders, loading } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('AKTYWNE');
  const [localLoading, setLocalLoading] = useState(true);

  // Ładuj zlecenia z API przy mount
  useEffect(() => {
    const loadOrders = async () => {
      setLocalLoading(true);
      await refreshOrders();
      setLocalLoading(false);
    };
    loadOrders();
  }, [refreshOrders]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'AKTYWNE') return !order.archived && order.status !== 'GOTOWE';
    if (filter === 'ARCHIWUM') return order.archived || order.status === 'GOTOWE';
    return true;
  });

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
          title={}
        />
      ))}
      {(stages?.length || 0) > 5 && (
        <span className="text-xs text-muted-foreground">+{(stages?.length || 0) - 5}</span>
      )}
    </div>
  );

  const exportToCSV = () => {
    const headers = ['Nr zlecenia', 'Klient', 'Produkt', 'Ilość', 'Wartość', 'Termin', 'Status'];
    const rows = filteredOrders.map(o => [
      o.order_number,
      o.client_name,
      o.product_name,
      o.quantity,
      o.price_total?.toFixed(2) || '0',
      o.planned_completion_date,
      o.status
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ;
    a.click();
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
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="btn-secondary">
            <Download size={18} className="mr-2" />
            Eksport CSV
          </button>
          <button className="btn-primary" onClick={() => navigate('/manager/orders/new')}>
            <Plus size={18} className="mr-2" />
            Nowe Zlecenie
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['AKTYWNE', 'ARCHIWUM', 'WSZYSTKIE'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={}
          >
            {f} ({f === 'AKTYWNE' ? orders.filter(o => !o.archived && o.status !== 'GOTOWE').length :
                f === 'ARCHYWUM' ? orders.filter(o => o.archived || o.status === 'GOTOWE').length :
                orders.length})
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block card-industrial overflow-hidden p-0">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Nr</th>
              <th>Klient</th>
              <th>Produkt</th>
              <th>Ilość</th>
              <th>Wartość</th>
              <th>Etapy</th>
              <th>Termin</th>
              <th>Dni</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-muted-foreground">
                  Brak zleceń do wyświetlenia
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const days = getDaysUntilDeadline(order.planned_completion_date);
                return (
                  <tr key={order.id} className={order.archived ? 'opacity-60' : ''}>
                    <td className="font-mono font-semibold">{order.order_number}</td>
                    <td>{order.client_name}</td>
                    <td>{order.product_name}</td>
                    <td>{order.quantity} szt.</td>
                    <td className="font-mono">{order.price_total?.toFixed(2) || '0.00'} zł</td>
                    <td><StageIndicators stages={order.stages} plannedDate={order.planned_completion_date} /></td>
                    <td>{new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</td>
                    <td className={getDeadlineColor(days)}>
                      {days < 0 ?  : 
                       days === 0 ? 'Dziś' : 
                       }
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td className="flex gap-2">
                      <button onClick={() => navigate()} className="btn-secondary py-2 px-3" title="Szczegóły">
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
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Brak zleceń do wyświetlenia
          </div>
        ) : (
          filteredOrders.map((order) => {
            const days = getDaysUntilDeadline(order.planned_completion_date);
            return (
              <div key={order.id} className={}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono font-bold text-lg">{order.order_number}</span>
                  {getStatusBadge(order.status)}
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <p><span className="text-muted-foreground">Klient:</span> {order.client_name}</p>
                  <p><span className="text-muted-foreground">Produkt:</span> {order.product_name}</p>
                  <p><span className="text-muted-foreground">Ilość:</span> {order.quantity} szt. | <span className="text-muted-foreground">Wartość:</span> {order.price_total?.toFixed(2) || '0.00'} zł</p>
                  <p><span className="text-muted-foreground">Termin:</span> {new Date(order.planned_completion_date).toLocaleDateString('pl-PL')} (<span className={getDeadlineColor(days)}>{days < 0 ?  : }</span>)</p>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Etapy:</span>
                    <StageIndicators stages={order.stages} plannedDate={order.planned_completion_date} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate()} className="btn-primary flex-1">Szczegóły</button>
                  <button onClick={(e) => toggleArchive(order.id, e)} className="btn-secondary">
                    {order.archived ? <RotateCcw size={18} /> : <Archive size={18} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrdersList;
