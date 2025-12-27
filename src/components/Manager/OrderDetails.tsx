import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { stages, workers } from '@/data/mockData';
import { OrderStage, TimeEntry } from '@/types';
import { ArrowLeft, Check, Users, ChevronRight } from 'lucide-react';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, setOrders, setTimeEntries } = useApp();
  
  const order = orders.find(o => o.id === Number(id));
  const [selectedStages, setSelectedStages] = useState<number[]>([]);
  const [stageWorkers, setStageWorkers] = useState<Record<number, number[]>>({});

  useEffect(() => {
    if (order?.stages) {
      setSelectedStages(order.stages.map(s => s.stageId));
      const workersMap: Record<number, number[]> = {};
      order.stages.forEach(s => {
        workersMap[s.stageId] = s.assignedWorkers;
      });
      setStageWorkers(workersMap);
    }
  }, [order]);

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Zlecenie nie znalezione</p>
        <button onClick={() => navigate('/manager/orders')} className="btn-primary mt-4">
          Wróć do listy
        </button>
      </div>
    );
  }

  const toggleStage = (stageId: number) => {
    setSelectedStages(prev => 
      prev.includes(stageId) 
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  const toggleWorker = (stageId: number, workerId: number) => {
    setStageWorkers(prev => {
      const current = prev[stageId] || [];
      const updated = current.includes(workerId)
        ? current.filter(id => id !== workerId)
        : [...current, workerId];
      return { ...prev, [stageId]: updated };
    });
  };

  const saveAndAdvanceStage = (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    const assignedWorkerIds = stageWorkers[stageId] || [];

    // Create time entries for assigned workers
    const newTimeEntries: TimeEntry[] = assignedWorkerIds.map(workerId => {
      const worker = workers.find(w => w.id === workerId)!;
      return {
        id: `te_${Date.now()}_${workerId}_${stageId}`,
        orderId: order.id,
        stageId,
        stageName: stage!.name,
        workerId,
        workerName: worker.name,
        hourlyRate: worker.hourly_rate,
        startTime: null,
        endTime: null,
        totalSeconds: 0,
        status: 'pending' as const
      };
    });

    setTimeEntries(prev => [...prev, ...newTimeEntries]);

    // Update order stages
    const updatedStages: OrderStage[] = selectedStages.map(sId => {
      const existingStage = order.stages?.find(s => s.stageId === sId);
      const stageName = stages.find(s => s.id === sId)!.name;
      
      return {
        stageId: sId,
        stageName,
        assignedWorkers: stageWorkers[sId] || [],
        status: sId === stageId ? 'in_progress' : (existingStage?.status || 'pending')
      };
    });

    setOrders(prev => prev.map(o => 
      o.id === order.id 
        ? { ...o, stages: updatedStages, status: 'W_TRAKCIE' as const }
        : o
    ));
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/manager/orders')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Wróć do listy
      </button>

      <div className="card-industrial mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          Zlecenie {order.order_number}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
          <div>
            <span className="text-muted-foreground">Klient:</span>
            <p className="font-semibold">{order.client_name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Produkt:</span>
            <p className="font-semibold">{order.product_name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Ilość:</span>
            <p className="font-semibold">{order.quantity} szt.</p>
          </div>
          <div>
            <span className="text-muted-foreground">Termin:</span>
            <p className="font-semibold">{new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</p>
          </div>
        </div>
      </div>

      <div className="card-industrial">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Check size={24} />
          Wybierz Etapy
        </h2>
        
        <div className="space-y-4">
          {stages.map((stage) => {
            const isSelected = selectedStages.includes(stage.id);
            const assignedWorkers = stageWorkers[stage.id] || [];
            const orderStage = order.stages?.find(s => s.stageId === stage.id);
            
            return (
              <div 
                key={stage.id} 
                className={`border rounded-md transition-colors ${
                  isSelected ? 'border-primary bg-muted/50' : 'border-border'
                }`}
              >
                <div className="p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStage(stage.id)}
                      className="w-5 h-5 rounded border-2 border-primary accent-primary"
                    />
                    <span className="font-semibold text-lg">{stage.name}</span>
                    {orderStage?.status === 'completed' && (
                      <span className="status-badge status-done ml-auto">Ukończony</span>
                    )}
                    {orderStage?.status === 'in_progress' && (
                      <span className="status-badge status-in-progress ml-auto">W trakcie</span>
                    )}
                  </label>
                </div>

                {isSelected && (
                  <div className="border-t border-border p-4 bg-background">
                    <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                      <Users size={18} />
                      <span className="font-medium">Przydziel pracowników:</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      {workers.map((worker) => (
                        <label
                          key={worker.id}
                          className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                            assignedWorkers.includes(worker.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={assignedWorkers.includes(worker.id)}
                            onChange={() => toggleWorker(stage.id, worker.id)}
                            className="w-4 h-4 rounded border-2 accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{worker.name}</p>
                            <p className="text-sm text-muted-foreground">{worker.hourly_rate.toFixed(2)} zł/h</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {assignedWorkers.length > 0 && orderStage?.status !== 'completed' && (
                      <button
                        onClick={() => saveAndAdvanceStage(stage.id)}
                        className="btn-success w-full sm:w-auto"
                      >
                        <ChevronRight size={18} className="mr-2" />
                        Przejdź do następnego etapu
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
