import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { FileText, Search, X } from 'lucide-react';

const TimeReport = () => {
  const { timeEntries, orders, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Only admin can see hourly rates
  const isAdmin = currentUser?.role === 'ADMIN';

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const calculateCost = (seconds: number, hourlyRate: number): number => {
    const hours = seconds / 3600;
    return hours * hourlyRate;
  };

  const completedEntries = timeEntries.filter(e => e.status === 'completed' && e.totalSeconds > 0);

  // Filter entries based on search query
  const filteredEntries = completedEntries.filter(entry => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const order = orders.find(o => o.id === entry.orderId);
    return (
      (order?.order_number?.toLowerCase().includes(query) || false) ||
      (order?.client_name?.toLowerCase().includes(query) || false) ||
      (order?.product_name?.toLowerCase().includes(query) || false) ||
      (entry.workerName?.toLowerCase().includes(query) || false) ||
      (entry.stageName?.toLowerCase().includes(query) || false)
    );
  });

  const totalCost = filteredEntries.reduce(
    (sum, entry) => sum + calculateCost(entry.totalSeconds, entry.hourlyRate),
    0
  );

  // Group entries by order
  const entriesByOrder = filteredEntries.reduce((acc, entry) => {
    const order = orders.find(o => o.id === entry.orderId);
    const orderKey = order?.order_number || 'Nieznane';
    const clientName = order?.client_name || '';
    if (!acc[orderKey]) acc[orderKey] = { entries: [], clientName };
    acc[orderKey].entries.push(entry);
    return acc;
  }, {} as Record<string, { entries: typeof filteredEntries; clientName: string }>);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <FileText size={28} />
          <h1 className="text-2xl md:text-3xl font-bold">Raport Czasu Pracy</h1>
        </div>
        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Szukaj po nr zlecenia, kliencie, pracowniku..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-industrial w-full pl-10 pr-10"
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
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground mb-4">
          Znaleziono {filteredEntries.length} wpisów dla "{searchQuery}"
        </p>
      )}

      {Object.keys(entriesByOrder).length === 0 ? (
        <div className="card-industrial text-center py-12">
          <p className="text-muted-foreground text-lg">
            {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak zarejestrowanych czasów pracy'}
          </p>
        </div>
      ) : (
        <>
          {Object.entries(entriesByOrder).map(([orderNumber, { entries, clientName }]) => (
            <div key={orderNumber} className="card-industrial mb-6">
              <h2 className="text-lg font-bold mb-4 pb-2 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span>Zlecenie {orderNumber}</span>
                {clientName && <span className="text-sm font-normal text-muted-foreground">{clientName}</span>}
              </h2>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Etap</th>
                      <th>Pracownik</th>
                      <th>Czas</th>
                      {isAdmin && <th>Stawka</th>}
                      {isAdmin && <th className="text-right">Koszt</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="font-semibold">{entry.stageName}</td>
                        <td>{entry.workerName}</td>
                        <td className="font-mono">{formatTime(entry.totalSeconds)}</td>
                        {isAdmin && <td>{Number(entry.hourlyRate || 0).toFixed(2)} zł/h</td>}
                        {isAdmin && (
                          <td className="text-right font-semibold">
                            {Number(calculateCost(entry.totalSeconds, entry.hourlyRate) || 0).toFixed(2)} zł
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {entries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-muted rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold">{entry.stageName}</span>
                      {isAdmin && (
                        <span className="font-bold">
                          {Number(calculateCost(entry.totalSeconds, entry.hourlyRate) || 0).toFixed(2)} zł
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{entry.workerName}</p>
                      <p>Czas: {formatTime(entry.totalSeconds)}{isAdmin && ` • ${Number(entry.hourlyRate || 0).toFixed(2)} zł/h`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {isAdmin && (
            <div className="card-industrial bg-primary text-primary-foreground">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-lg font-semibold">
                  {searchQuery ? 'RAZEM (filtrowane):' : 'RAZEM ROBOCIZNA:'}
                </span>
                <span className="text-3xl font-bold">{Number(totalCost || 0).toFixed(2)} zł</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TimeReport;
