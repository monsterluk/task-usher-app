import { useApp } from '@/context/AppContext';
import { initialOrders } from '@/data/mockData';
import Timer from './Timer';
import { Clock, CheckCircle } from 'lucide-react';

const MyStages = () => {
  const { currentUser, timeEntries, setTimeEntries, orders } = useApp();

  if (!currentUser) return null;

  // Get time entries for the current worker
  const myEntries = timeEntries.filter(e => e.workerId === currentUser.id);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleStart = (entryId: string) => {
    setTimeEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, status: 'in_progress' as const, startTime: new Date().toISOString() }
        : entry
    ));
  };

  const handleStop = (entryId: string, totalSeconds: number) => {
    setTimeEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { 
            ...entry, 
            status: 'completed' as const, 
            endTime: new Date().toISOString(),
            totalSeconds 
          }
        : entry
    ));
  };

  const getOrder = (orderId: number) => {
    return orders.find(o => o.id === orderId) || initialOrders.find(o => o.id === orderId);
  };

  if (myEntries.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
          <Clock size={28} />
          Moje Etapy
        </h1>
        <div className="card-industrial text-center py-12">
          <p className="text-muted-foreground text-lg">
            Nie masz przydzielonych etapów
          </p>
          <p className="text-muted-foreground mt-2">
            Poczekaj na przydzielenie zadań przez kierownika
          </p>
        </div>
      </div>
    );
  }

  // Sort entries: in_progress first, then pending, then completed
  const sortedEntries = [...myEntries].sort((a, b) => {
    const priority = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
    return priority[a.status] - priority[b.status];
  });

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
        <Clock size={28} />
        Moje Etapy
      </h1>

      <div className="space-y-4">
        {sortedEntries.map((entry) => {
          const order = getOrder(entry.orderId);
          const isRunning = entry.status === 'in_progress';
          const isCompleted = entry.status === 'completed';

          return (
            <div 
              key={entry.id} 
              className={`card-industrial ${
                isRunning ? 'border-2 border-warning' : 
                isCompleted ? 'bg-muted/50' : ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    {isCompleted && (
                      <CheckCircle size={24} className="text-success flex-shrink-0 mt-1" />
                    )}
                    <div>
                      <h2 className="text-lg font-bold">
                        Zlecenie #{order?.order_number}
                      </h2>
                      <p className="text-muted-foreground">
                        {order?.client_name} - {order?.product_name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <span className="font-semibold text-lg">
                      Etap: {entry.stageName}
                    </span>
                    {isRunning && (
                      <span className="status-badge status-in-progress">W trakcie</span>
                    )}
                    {isCompleted && (
                      <span className="text-muted-foreground">
                        (Czas: {formatTime(entry.totalSeconds)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-48">
                  {isCompleted ? (
                    <div className="text-center py-3 px-4 bg-success/10 rounded-md">
                      <p className="text-success font-semibold">Zakończone</p>
                      <p className="timer-display text-success">{formatTime(entry.totalSeconds)}</p>
                    </div>
                  ) : (
                    <Timer
                      isRunning={isRunning}
                      initialSeconds={entry.totalSeconds}
                      onStart={() => handleStart(entry.id)}
                      onStop={(totalSeconds) => handleStop(entry.id, totalSeconds)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyStages;
