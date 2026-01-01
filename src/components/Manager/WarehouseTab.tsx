import { useState, useEffect } from 'react';
import { inventoryApi, isDemoMode } from '@/utils/api';
import { Package, ArrowDownToLine, ArrowUpFromLine, Loader2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface WarehouseTabProps {
  orderId: number;
}

interface Transaction {
  id: number;
  transaction_number: string;
  type: 'PZ' | 'WZ' | 'MM' | 'KOREKTA';
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  from_location_name?: string;
  to_location_name?: string;
  reference_number?: string;
  notes?: string;
  worker_name?: string;
  created_at: string;
}

interface Reservation {
  id: number;
  order_id: number;
  order_number: string;
  inventory_item_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  quantity_reserved: number;
  quantity_issued: number;
  status: 'PENDING' | 'PARTIAL' | 'FULFILLED' | 'CANCELLED';
  location_name?: string;
  notes?: string;
  created_at: string;
}

const WarehouseTab = ({ orderId }: WarehouseTabProps) => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'reservations'>('transactions');

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        // Demo mode - mock data
        setTransactions([
          {
            id: 1,
            transaction_number: 'WZ/2026/001',
            type: 'WZ',
            material_id: 1,
            material_code: 'PLEXI-3MM-CLEAR',
            material_name: 'Plexi 3mm przezroczyste',
            unit: 'm²',
            quantity: 2.5,
            unit_cost: 45.00,
            total_cost: 112.50,
            to_location_name: 'Produkcja',
            reference_number: '1001/2026',
            worker_name: 'Jan Kowalski',
            created_at: new Date().toISOString(),
          },
        ]);
        setReservations([
          {
            id: 1,
            order_id: orderId,
            order_number: '1001/2026',
            inventory_item_id: 1,
            material_code: 'PLEXI-3MM-CLEAR',
            material_name: 'Plexi 3mm przezroczyste',
            unit: 'm²',
            quantity_reserved: 5.0,
            quantity_issued: 2.5,
            status: 'PARTIAL',
            location_name: 'Magazyn główny',
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        // Production mode - load from API
        const [transRes, resRes] = await Promise.all([
          inventoryApi.getTransactions({ reference_id: orderId, limit: 50 }),
          inventoryApi.getReservations({ order_id: orderId }),
        ]);

        setTransactions(transRes.data?.transactions || []);
        setReservations(resRes.data?.reservations || []);
      }
    } catch (error) {
      console.error('Failed to load warehouse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PZ': return <ArrowDownToLine size={16} className="text-green-600" />;
      case 'WZ': return <ArrowUpFromLine size={16} className="text-red-600" />;
      default: return <Package size={16} className="text-gray-600" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      'PZ': { label: 'Przyjęcie', class: 'bg-green-100 text-green-800' },
      'WZ': { label: 'Wydanie', class: 'bg-red-100 text-red-800' },
      'MM': { label: 'Przesunięcie', class: 'bg-blue-100 text-blue-800' },
      'KOREKTA': { label: 'Korekta', class: 'bg-yellow-100 text-yellow-800' },
    };
    const badge = badges[type] || { label: type, class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.class}`}>
        {badge.label}
      </span>
    );
  };

  const getReservationStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
      'PENDING': { label: 'Oczekuje', class: 'bg-yellow-100 text-yellow-800', icon: <Clock size={12} /> },
      'PARTIAL': { label: 'Częściowo', class: 'bg-blue-100 text-blue-800', icon: <AlertTriangle size={12} /> },
      'FULFILLED': { label: 'Zrealizowane', class: 'bg-green-100 text-green-800', icon: <CheckCircle size={12} /> },
      'CANCELLED': { label: 'Anulowane', class: 'bg-gray-100 text-gray-800', icon: null },
    };
    const badge = badges[status] || badges['PENDING'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.class}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  // Calculate summaries
  const totalIssued = transactions
    .filter(t => t.type === 'WZ')
    .reduce((sum, t) => sum + (t.total_cost || t.quantity * (t.unit_cost || 0)), 0);

  const totalReceived = transactions
    .filter(t => t.type === 'PZ')
    .reduce((sum, t) => sum + (t.total_cost || t.quantity * (t.unit_cost || 0)), 0);

  const pendingReservations = reservations.filter(r => r.status === 'PENDING' || r.status === 'PARTIAL').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin mr-2" />
        <span>Ładowanie danych magazynowych...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package size={24} />
          Magazyn ({transactions.length + reservations.length})
        </h2>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-red-600 mb-1 flex items-center gap-1">
                <ArrowUpFromLine size={14} />
                Wydano materiałów
              </div>
              <div className="text-2xl font-bold text-red-800">{totalIssued.toFixed(2)} zł</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 mb-1 flex items-center gap-1">
                <ArrowDownToLine size={14} />
                Przyjęto materiałów
              </div>
              <div className="text-2xl font-bold text-green-800">{totalReceived.toFixed(2)} zł</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-600 mb-1 flex items-center gap-1">
                <Clock size={14} />
                Oczekujące rezerwacje
              </div>
              <div className="text-2xl font-bold text-yellow-800">{pendingReservations}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b mb-4">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'transactions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Transakcje ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'reservations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Rezerwacje ({reservations.length})
            </button>
          </div>

          {/* Transactions tab */}
          {activeTab === 'transactions' && (
            <>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Brak transakcji magazynowych dla tego zlecenia.</p>
                  <p className="text-sm">Wydania materiałów pojawią się tutaj automatycznie.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Typ</th>
                        <th className="text-left p-2 font-medium">Nr dokumentu</th>
                        <th className="text-left p-2 font-medium">Materiał</th>
                        <th className="text-right p-2 font-medium">Ilość</th>
                        <th className="text-right p-2 font-medium">Wartość</th>
                        <th className="text-left p-2 font-medium">Lokalizacja</th>
                        <th className="text-left p-2 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-muted/20">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.type)}
                              {getTransactionBadge(transaction.type)}
                            </div>
                          </td>
                          <td className="p-2 font-mono text-xs">{transaction.transaction_number}</td>
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{transaction.material_code}</div>
                              <div className="text-xs text-muted-foreground">{transaction.material_name}</div>
                            </div>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {transaction.type === 'WZ' ? '-' : '+'}{transaction.quantity} {transaction.unit}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {transaction.total_cost?.toFixed(2) || '-'} zł
                          </td>
                          <td className="p-2 text-sm">
                            {transaction.type === 'WZ' ? transaction.from_location_name : transaction.to_location_name || '-'}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {formatDateTime(transaction.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Reservations tab */}
          {activeTab === 'reservations' && (
            <>
              {reservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Brak rezerwacji materiałowych dla tego zlecenia.</p>
                  <p className="text-sm">Rezerwacje są tworzone na podstawie BOM (listy materiałów).</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-left p-2 font-medium">Materiał</th>
                        <th className="text-right p-2 font-medium">Zarezerwowano</th>
                        <th className="text-right p-2 font-medium">Wydano</th>
                        <th className="text-left p-2 font-medium">Lokalizacja</th>
                        <th className="text-left p-2 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((reservation) => (
                        <tr key={reservation.id} className="border-b hover:bg-muted/20">
                          <td className="p-2">
                            {getReservationStatusBadge(reservation.status)}
                          </td>
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{reservation.material_code}</div>
                              <div className="text-xs text-muted-foreground">{reservation.material_name}</div>
                            </div>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {reservation.quantity_reserved} {reservation.unit}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {reservation.quantity_issued} {reservation.unit}
                            {reservation.quantity_issued < reservation.quantity_reserved && (
                              <span className="text-yellow-600 ml-1">
                                ({((reservation.quantity_issued / reservation.quantity_reserved) * 100).toFixed(0)}%)
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-sm">{reservation.location_name || '-'}</td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {formatDateTime(reservation.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default WarehouseTab;
