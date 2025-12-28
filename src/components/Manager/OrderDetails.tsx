import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { stages, workers, getStageStatusColor } from '@/data/mockData';
import { OrderStage, TimeEntry, OrderComment, OrderHistory } from '@/types';
import { ArrowLeft, Check, Users, ChevronRight, Truck, Copy, ExternalLink, Package, Printer, Edit, MessageSquare, Send, Clock, History } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ApaczkaIntegration from './ApaczkaIntegration';
import WorkOrderPDF from './WorkOrderPDF';
import { ShipmentResponse } from '@/utils/apaczka';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, setOrders, setTimeEntries, timeEntries, currentUser } = useApp();

  const order = orders.find(o => o.id === Number(id));
  const [selectedStages, setSelectedStages] = useState<number[]>([]);
  const [stageWorkers, setStageWorkers] = useState<Record<number, number[]>>({});
  const [showApaczkaIntegration, setShowApaczkaIntegration] = useState(false);
  const [showPrintCard, setShowPrintCard] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);

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

  const getStageStatus = (stageId: number): string => {
    const orderStage = order.stages?.find(s => s.stageId === stageId);
    if (!orderStage) return 'pending';
    return orderStage.status;
  };

  const getStageStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending': return 'NOWY';
      case 'in_progress': return 'W TRAKCIE';
      case 'completed': return 'GOTOWY';
      case 'delayed': return 'OPÓŹNIONY';
      default: return 'NOWY';
    }
  };

  const getStageWorkerTime = (stageId: number): string => {
    const stageEntries = timeEntries.filter(te => te.orderId === order.id && te.stageId === stageId);
    const totalSeconds = stageEntries.reduce((acc, te) => acc + te.totalSeconds, 0);
    if (totalSeconds === 0) return '';
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const saveAndAdvanceStage = (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    const assignedWorkerIds = stageWorkers[stageId] || [];

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

    toast({ title: "Etap uruchomiony", description: `Etap ${stage?.name} jest teraz w trakcie realizacji.` });
  };

  const handleShipmentCreated = (shipment: ShipmentResponse) => {
    setOrders(prev => prev.map(o =>
      o.id === order.id
        ? {
            ...o,
            shipment_number: shipment.trackingNumber,
            shipment_status: 'ZAMÓWIONA' as const,
            shipment_tracking_url: shipment.trackingUrl || `https://apaczka.pl/track/${shipment.trackingNumber}`
          }
        : o
    ));
    setShowApaczkaIntegration(false);
    toast({ title: "Kurier zamówiony", description: `Nr przesyłki: ${shipment.trackingNumber}` });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Skopiowano", description: "Nr przesyłki skopiowany do schowka" });
  };

  const updateShipmentStatus = (status: 'OCZEKUJE' | 'ZAMÓWIONA' | 'W_DRODZE' | 'DOSTARCZONO') => {
    setOrders(prev => prev.map(o =>
      o.id === order.id ? { ...o, shipment_status: status } : o
    ));
  };

  // Add comment
  const addComment = () => {
    if (!newComment.trim() || !currentUser) return;

    const comment: OrderComment = {
      id: `comment_${Date.now()}`,
      orderId: order.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
      type: 'comment'
    };

    const historyEntry: OrderHistory = {
      id: `history_${Date.now()}`,
      orderId: order.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'Dodano komentarz',
      details: newComment.trim().substring(0, 50) + (newComment.length > 50 ? '...' : ''),
      timestamp: new Date().toISOString()
    };

    setOrders(prev => prev.map(o =>
      o.id === order.id
        ? {
            ...o,
            comments: [...(o.comments || []), comment],
            history: [...(o.history || []), historyEntry]
          }
        : o
    ));

    setNewComment('');
    toast({ title: "Komentarz dodany" });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

      {/* Order Info */}
      <div className="card-industrial mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold">
            Zlecenie {order.order_number}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrintCard(true)}
              className="btn-secondary"
            >
              <Printer size={18} className="mr-2" />
              Drukuj kartę
            </button>
            <button
              onClick={() => navigate(`/manager/orders/${order.id}/edit`)}
              className="btn-secondary"
            >
              <Edit size={18} className="mr-2" />
              Edytuj
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-base">
          <div>
            <span className="text-muted-foreground text-sm">Klient:</span>
            <p className="font-semibold">{order.client_name}</p>
            {order.client_email && <p className="text-sm text-muted-foreground">{order.client_email}</p>}
            {order.client_phone && <p className="text-sm text-muted-foreground">{order.client_phone}</p>}
            {order.client_address && (
              <p className="text-sm text-muted-foreground">
                {order.client_address}, {order.client_postal} {order.client_city}
              </p>
            )}
          </div>
          <div>
            <span className="text-muted-foreground text-sm">Produkt:</span>
            <p className="font-semibold">{order.product_name}</p>
            <p className="text-sm text-muted-foreground">{order.quantity} szt.</p>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">Cena:</span>
            <p className="font-semibold">{order.price_total?.toFixed(2) || '-'} zł</p>
            {order.price_per_unit && <p className="text-sm text-muted-foreground">{order.price_per_unit.toFixed(2)} zł/szt.</p>}
          </div>
          <div>
            <span className="text-muted-foreground text-sm">Termin:</span>
            <p className="font-semibold">{new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</p>
          </div>
          {order.client_order_number && (
            <div>
              <span className="text-muted-foreground text-sm">Nr zam. klienta:</span>
              <p className="font-semibold">{order.client_order_number}</p>
            </div>
          )}
          {order.invoice_number && (
            <div>
              <span className="text-muted-foreground text-sm">Faktura:</span>
              <p className="font-semibold">{order.invoice_number}</p>
              {order.invoice_date && <p className="text-sm text-muted-foreground">{new Date(order.invoice_date).toLocaleDateString('pl-PL')}</p>}
            </div>
          )}
        </div>
        {order.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-muted-foreground text-sm">Uwagi:</span>
            <p className="font-medium">{order.notes}</p>
          </div>
        )}
        {order.folder_path && (
          <div className="mt-2">
            <span className="text-muted-foreground text-sm">Folder:</span>
            <p className="font-mono text-sm">{order.folder_path}</p>
          </div>
        )}
      </div>

      {/* Stages with Colors */}
      <div className="card-industrial mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Check size={24} />
          Etapy Zlecenia
        </h2>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 p-3 bg-muted/30 rounded-md">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--stage-pending))' }}></div>
            <span className="text-sm">NOWY</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--stage-in-progress))' }}></div>
            <span className="text-sm">W TRAKCIE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--stage-completed))' }}></div>
            <span className="text-sm">GOTOWY</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--stage-delayed))' }}></div>
            <span className="text-sm">OPÓŹNIONY</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {stages.map((stage) => {
            const isSelected = selectedStages.includes(stage.id);
            const assignedWorkers = stageWorkers[stage.id] || [];
            const orderStage = order.stages?.find(s => s.stageId === stage.id);
            const stageStatus = getStageStatus(stage.id);
            const stageColor = getStageStatusColor(stageStatus, order.planned_completion_date);
            const stageTime = getStageWorkerTime(stage.id);
            const assignedWorkerNames = assignedWorkers.map(wId => workers.find(w => w.id === wId)?.name).filter(Boolean);
            
            return (
              <div 
                key={stage.id} 
                className="border rounded-md transition-colors overflow-hidden"
                style={{ borderLeftWidth: '4px', borderLeftColor: stageColor }}
              >
                <div className="p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStage(stage.id)}
                      className="w-5 h-5 rounded border-2 border-primary accent-primary mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div 
                          className="w-4 h-4 rounded flex-shrink-0" 
                          style={{ backgroundColor: stageColor }}
                        />
                        <span className="font-semibold text-lg">{stage.name}</span>
                        <span 
                          className="text-xs px-2 py-1 rounded font-medium"
                          style={{ 
                            backgroundColor: stageColor,
                            color: stageStatus === 'pending' ? 'hsl(var(--foreground))' : 'white'
                          }}
                        >
                          {getStageStatusLabel(stageStatus)}
                        </span>
                        {stageTime && (
                          <span className="text-sm text-muted-foreground">({stageTime})</span>
                        )}
                      </div>
                      {assignedWorkerNames.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Pracownicy: {assignedWorkerNames.join(', ')}
                        </p>
                      )}
                    </div>
                  </label>
                </div>

                {isSelected && (
                  <div className="border-t border-border p-4 bg-background">
                    <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                      <Users size={18} />
                      <span className="font-medium">Przydziel pracowników:</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      {workers.filter(w => w.active).map((worker) => (
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
                            <p className="text-sm text-muted-foreground">{worker.position} • {worker.hourly_rate.toFixed(2)} zł/h</p>
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

      {/* Shipping Section */}
      <div className="card-industrial">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Truck size={24} />
          Wysyłka
        </h2>

        <div className="space-y-4">
          {/* Shipment Status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-muted-foreground text-sm min-w-[120px]">Status przesyłki:</label>
            <select
              value={order.shipment_status || 'OCZEKUJE'}
              onChange={(e) => updateShipmentStatus(e.target.value as any)}
              className="input-industrial flex-1 max-w-xs"
            >
              <option value="OCZEKUJE">OCZEKUJE</option>
              <option value="ZAMÓWIONA">ZAMÓWIONA</option>
              <option value="W_DRODZE">W DRODZE</option>
              <option value="DOSTARCZONO">DOSTARCZONO</option>
            </select>
          </div>

          {/* Shipment Info */}
          {order.shipment_number && (
            <div className="p-4 bg-muted/30 rounded-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-muted-foreground text-sm min-w-[120px]">Nr przesyłki:</span>
                <span className="font-mono font-semibold">{order.shipment_number}</span>
                <button
                  onClick={() => copyToClipboard(order.shipment_number!)}
                  className="btn-secondary py-1 px-2 text-sm"
                >
                  <Copy size={14} className="mr-1" />
                  Kopiuj
                </button>
              </div>
              {order.shipment_tracking_url && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-muted-foreground text-sm min-w-[120px]">Śledzenie:</span>
                  <a
                    href={order.shipment_tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary py-1 px-2 text-sm inline-flex items-center"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Otwórz link
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Order Courier Button */}
          {!order.shipment_number && !showApaczkaIntegration && (
            <button
              onClick={() => setShowApaczkaIntegration(true)}
              className="btn-primary w-full sm:w-auto"
            >
              <Package size={18} className="mr-2" />
              Zamów kuriera
            </button>
          )}

          {/* Apaczka Integration Component */}
          {showApaczkaIntegration && (
            <div className="space-y-4">
              <ApaczkaIntegration
                orderId={order.id}
                orderNumber={order.order_number}
                clientName={order.client_name}
                clientPhone={order.client_phone}
                clientEmail={order.client_email}
                clientAddress={order.client_address}
                clientPostal={order.client_postal}
                clientCity={order.client_city}
                onShipmentCreated={handleShipmentCreated}
              />
              <button
                onClick={() => setShowApaczkaIntegration(false)}
                className="btn-secondary w-full"
              >
                Anuluj
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="card-industrial mt-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <MessageSquare size={24} />
          Komentarze ({order.comments?.length || 0})
        </h2>

        {/* Add Comment */}
        <div className="flex gap-2 mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Dodaj komentarz lub notatkę..."
            className="input-industrial flex-1 min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) addComment();
            }}
          />
          <button
            onClick={addComment}
            disabled={!newComment.trim()}
            className="btn-primary self-end disabled:opacity-50"
            title="Wyślij (Ctrl+Enter)"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Comments List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {order.comments && order.comments.length > 0 ? (
            [...order.comments].reverse().map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg ${
                  comment.type === 'system'
                    ? 'bg-muted/50 border-l-4 border-primary'
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Brak komentarzy. Dodaj pierwszy komentarz powyżej.
            </p>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className="card-industrial mt-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History size={24} />
            Historia zmian ({order.history?.length || 0})
          </h2>
          <ChevronRight
            size={20}
            className={`transition-transform ${showHistory ? 'rotate-90' : ''}`}
          />
        </button>

        {showHistory && (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
            {order.history && order.history.length > 0 ? (
              [...order.history].reverse().map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{entry.action}</span>
                      <span className="text-xs text-muted-foreground">
                        przez {entry.userName}
                      </span>
                    </div>
                    {entry.details && (
                      <p className="text-xs text-muted-foreground truncate">{entry.details}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Brak historii zmian.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Print Card Modal */}
      {showPrintCard && (
        <div className="fixed inset-0 bg-foreground/80 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <WorkOrderPDF
              order={order}
              workers={workers}
              onClose={() => setShowPrintCard(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;