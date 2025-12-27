import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Eye } from 'lucide-react';

const OrdersList = () => {
  const { orders } = useApp();
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOWE':
        return <span className="status-badge status-new">Nowe</span>;
      case 'W_TRAKCIE':
        return <span className="status-badge status-in-progress">W trakcie</span>;
      case 'GOTOWE':
        return <span className="status-badge status-done">Gotowe</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Lista Zleceń</h1>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download size={18} className="mr-2" />
            Eksport CSV
          </button>
          <button className="btn-primary">
            <Plus size={18} className="mr-2" />
            Nowe Zlecenie
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block card-industrial overflow-hidden p-0">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>ID</th>
              <th>Klient</th>
              <th>Produkt</th>
              <th>Ilość</th>
              <th>Termin</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="font-mono font-semibold">{order.order_number}</td>
                <td>{order.client_name}</td>
                <td>{order.product_name}</td>
                <td>{order.quantity}</td>
                <td>{new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</td>
                <td>{getStatusBadge(order.status)}</td>
                <td>
                  <button
                    onClick={() => navigate(`/manager/orders/${order.id}`)}
                    className="btn-secondary py-2 px-4"
                  >
                    <Eye size={16} className="mr-2" />
                    Szczegóły
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="card-industrial">
            <div className="flex justify-between items-start mb-3">
              <span className="font-mono font-bold text-lg">{order.order_number}</span>
              {getStatusBadge(order.status)}
            </div>
            <div className="space-y-2 text-sm mb-4">
              <p><span className="text-muted-foreground">Klient:</span> {order.client_name}</p>
              <p><span className="text-muted-foreground">Produkt:</span> {order.product_name}</p>
              <p><span className="text-muted-foreground">Ilość:</span> {order.quantity}</p>
              <p><span className="text-muted-foreground">Termin:</span> {new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</p>
            </div>
            <button
              onClick={() => navigate(`/manager/orders/${order.id}`)}
              className="btn-primary w-full"
            >
              <Eye size={18} className="mr-2" />
              Szczegóły
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersList;
