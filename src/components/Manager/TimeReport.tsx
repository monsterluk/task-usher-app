import { useApp } from '@/context/AppContext';
import { FileText } from 'lucide-react';

const TimeReport = () => {
  const { timeEntries, orders } = useApp();

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
  const totalCost = completedEntries.reduce(
    (sum, entry) => sum + calculateCost(entry.totalSeconds, entry.hourlyRate),
    0
  );

  // Group entries by order
  const entriesByOrder = completedEntries.reduce((acc, entry) => {
    const order = orders.find(o => o.id === entry.orderId);
    const orderKey = order?.order_number || 'Nieznane';
    if (!acc[orderKey]) acc[orderKey] = [];
    acc[orderKey].push(entry);
    return acc;
  }, {} as Record<string, typeof completedEntries>);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText size={28} />
        <h1 className="text-2xl md:text-3xl font-bold">Raport Czasu Pracy</h1>
      </div>

      {Object.keys(entriesByOrder).length === 0 ? (
        <div className="card-industrial text-center py-12">
          <p className="text-muted-foreground text-lg">Brak zarejestrowanych czasów pracy</p>
        </div>
      ) : (
        <>
          {Object.entries(entriesByOrder).map(([orderNumber, entries]) => (
            <div key={orderNumber} className="card-industrial mb-6">
              <h2 className="text-lg font-bold mb-4 pb-2 border-b border-border">
                Zlecenie {orderNumber}
              </h2>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Etap</th>
                      <th>Pracownik</th>
                      <th>Czas</th>
                      <th>Stawka</th>
                      <th className="text-right">Koszt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="font-semibold">{entry.stageName}</td>
                        <td>{entry.workerName}</td>
                        <td className="font-mono">{formatTime(entry.totalSeconds)}</td>
                        <td>{entry.hourlyRate.toFixed(2)} zł/h</td>
                        <td className="text-right font-semibold">
                          {calculateCost(entry.totalSeconds, entry.hourlyRate).toFixed(2)} zł
                        </td>
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
                      <span className="font-bold">
                        {calculateCost(entry.totalSeconds, entry.hourlyRate).toFixed(2)} zł
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{entry.workerName}</p>
                      <p>Czas: {formatTime(entry.totalSeconds)} • {entry.hourlyRate.toFixed(2)} zł/h</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="card-industrial bg-primary text-primary-foreground">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-lg font-semibold">RAZEM ROBOCIZNA:</span>
              <span className="text-3xl font-bold">{totalCost.toFixed(2)} zł</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TimeReport;
