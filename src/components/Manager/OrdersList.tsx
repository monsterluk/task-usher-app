import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Eye, Archive, RotateCcw } from 'lucide-react';
import { getStageStatusColor } from '@/data/mockData';

type FilterType = 'AKTYWNE' | 'ARCHIWUM' | 'WSZYSTKIE';

const OrdersList = () => {
  const { orders, setOrders } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('AKTYWNE');

  const filteredOrders = orders.filter(order => {
    if (filter === 'AKTYWNE') return !order.archived && order.status !== 'GOTOWE';
    if (filter === 'ARCHIWUM') return order.archived || order.status === 'GOTOWE';
    return true;
  });

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
          title={`${stage.stageName}: ${stage.status}`}
        />
      ))}
      {(stages?.length || 0) > 5 && (
        <span className="text-xs text-muted-foreground">+{(stages?.length || 0) - 5}</span>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Lista Zleceń</h1>
        <div className="flex gap-3">
          <button className="btn-secondary"><Download size={18} className="mr-2" />Eksport CSV</button>
          <button className="btn-primary" onClick={() => navigate('/manager/orders/new')}>
            <Plus size={18} className="mr-2" />Nowe Zlecenie
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['AKTYWNE', 'ARCHIWUM', 'WSZYSTKIE'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block card-industrial overflow-hidden p-0">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>ID</th>
              <th>Klient</th>
              <th>Produkt</th>
              <th>Etapy</th>
              <th>Termin</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className={order.archived ? 'opacity-60' : ''}>
                <td className="font-mono font-semibold">{order.order_number}</td>
                <td>{order.client_name}</td>
                <td>{order.product_name}</td>
                <td><StageIndicators stages={order.stages} plannedDate={order.planned_completion_date} /></td>
                <td>{new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</td>
                <td>{getStatusBadge(order.status)}</td>
                <td className="flex gap-2">
                  <button onClick={() => navigate(`/manager/orders/${order.id}`)} className="btn-secondary py-2 px-3">
                    <Eye size={16} />
                  </button>
                  <button onClick={(e) => toggleArchive(order.id, e)} className="btn-secondary py-2 px-3" title={order.archived ? 'Przywróć' : 'Archiwizuj'}>
                    {order.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className={`card-industrial ${order.archived ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <span className="font-mono font-bold text-lg">{order.order_number}</span>
              {getStatusBadge(order.status)}
            </div>
            <div className="space-y-2 text-sm mb-4">
              <p><span className="text-muted-foreground">Klient:</span> {order.client_name}</p>
              <p><span className="text-muted-foreground">Produkt:</span> {order.product_name}</p>
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
        ))}
      </div>
    </div>
  );
};

export default OrdersList;
