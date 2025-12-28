import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Eye, Archive, RotateCcw, Package, Calendar } from 'lucide-react';
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
    <div className="flex gap-1.5">
      {(stages || []).slice(0, 5).map((stage, i) => (
        <div
          key={i}
          className="stage-dot"
          style={{ backgroundColor: getStageStatusColor(stage.status, plannedDate) }}
          title={`${stage.stageName}: ${stage.status}`}
        />
      ))}
      {(stages?.length || 0) > 5 && (
        <span className="text-xs text-muted-foreground font-medium ml-1">+{(stages?.length || 0) - 5}</span>
      )}
    </div>
  );

  const activeCount = orders.filter(o => !o.archived && o.status !== 'GOTOWE').length;
  const archiveCount = orders.filter(o => o.archived || o.status === 'GOTOWE').length;

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Lista Zleceń</h1>
          <p className="text-muted-foreground mt-1">Zarządzaj zamówieniami produkcyjnymi</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download size={18} className="mr-2" />
            Eksport CSV
          </button>
          <button className="btn-primary" onClick={() => navigate('/manager/orders/new')}>
            <Plus size={18} className="mr-2" />
            Nowe Zlecenie
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-industrial bg-primary/5 border-primary/20">
          <div className="text-2xl font-bold text-primary">{orders.length}</div>
          <div className="text-sm text-muted-foreground">Wszystkie</div>
        </div>
        <div className="card-industrial bg-success/5 border-success/20">
          <div className="text-2xl font-bold text-success">{activeCount}</div>
          <div className="text-sm text-muted-foreground">Aktywne</div>
        </div>
        <div className="card-industrial bg-warning/5 border-warning/20">
          <div className="text-2xl font-bold text-warning">
            {orders.filter(o => o.status === 'W_TRAKCIE').length}
          </div>
          <div className="text-sm text-muted-foreground">W trakcie</div>
        </div>
        <div className="card-industrial bg-muted">
          <div className="text-2xl font-bold text-muted-foreground">{archiveCount}</div>
          <div className="text-sm text-muted-foreground">Archiwum</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 bg-secondary/50 p-1.5 rounded-xl w-fit">
        {(['AKTYWNE', 'ARCHIWUM', 'WSZYSTKIE'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              filter === f 
                ? 'bg-card text-foreground shadow-md' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
            {f === 'AKTYWNE' && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{activeCount}</span>}
            {f === 'ARCHIWUM' && <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{archiveCount}</span>}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block card-industrial overflow-hidden p-0">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>ID Zlecenia</th>
              <th>Klient</th>
              <th>Produkt</th>
              <th>Etapy</th>
              <th>Termin</th>
              <th>Status</th>
              <th className="text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr 
                key={order.id} 
                className={`cursor-pointer ${order.archived ? 'opacity-60' : ''}`}
                onClick={() => navigate(`/manager/orders/${order.id}`)}
              >
                <td className="font-mono font-bold text-primary">{order.order_number}</td>
                <td className="font-medium">{order.client_name}</td>
                <td className="text-muted-foreground">{order.product_name}</td>
                <td><StageIndicators stages={order.stages} plannedDate={order.planned_completion_date} /></td>
                <td>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={14} />
                    {new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}
                  </div>
                </td>
                <td>{getStatusBadge(order.status)}</td>
                <td className="text-right">
                  <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => navigate(`/manager/orders/${order.id}`)} 
                      className="btn-secondary py-2 px-3"
                      title="Szczegóły"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={(e) => toggleArchive(order.id, e)} 
                      className="btn-secondary py-2 px-3" 
                      title={order.archived ? 'Przywróć' : 'Archiwizuj'}
                    >
                      {order.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium">Brak zleceń do wyświetlenia</p>
            <p className="text-sm mt-1">Zmień filtr lub dodaj nowe zlecenie</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredOrders.map((order) => (
          <div 
            key={order.id} 
            className={`card-industrial-hover cursor-pointer ${order.archived ? 'opacity-60' : ''}`}
            onClick={() => navigate(`/manager/orders/${order.id}`)}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="font-mono font-bold text-lg text-primary">{order.order_number}</span>
              {getStatusBadge(order.status)}
            </div>
            <div className="space-y-2 text-sm mb-4">
              <p className="font-medium">{order.client_name}</p>
              <p className="text-muted-foreground">{order.product_name}</p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Etapy:</span>
                <StageIndicators stages={order.stages} plannedDate={order.planned_completion_date} />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar size={14} />
                <span>Termin: {new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</span>
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => navigate(`/manager/orders/${order.id}`)} 
                className="btn-primary flex-1"
              >
                <Eye size={16} className="mr-2" />
                Szczegóły
              </button>
              <button 
                onClick={(e) => toggleArchive(order.id, e)} 
                className="btn-secondary px-4"
              >
                {order.archived ? <RotateCcw size={18} /> : <Archive size={18} />}
              </button>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="card-industrial text-center py-8 text-muted-foreground">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Brak zleceń</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersList;
