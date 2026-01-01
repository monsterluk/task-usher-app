import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { stages, productionStages, getStageStatusColor } from '@/data/mockData';
import { OrderStage, TimeEntry, OrderComment, OrderHistory, OrderAttachment } from '@/types';
import { ArrowLeft, Check, Users, ChevronRight, Truck, Copy, ExternalLink, Package, Printer, Edit, MessageSquare, Send, Clock, History, FileCheck, Palette, Paperclip, Upload, FileImage, FileText, Trash2, Download, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ApaczkaIntegration from './ApaczkaIntegration';
import WorkOrderPDF from './WorkOrderPDF';
import BOMTab from './BOMTab';
import TraceabilityTab from './TraceabilityTab';
import ProgressTab from './ProgressTab';
import ActivityTab from './ActivityTab';
import WorkSessionsTab from './WorkSessionsTab';
import WarehouseTab from './WarehouseTab';
import DefectsTab from './DefectsTab';
import { attachmentsApi, orderItemsApi, assignmentsApi, stagesApi, ordersApi, isDemoMode } from '@/utils/api';

// Typ dla odpowiedzi z Apaczka
interface ShipmentResult {
  id: number;
  shipment_number?: string;
  tracking_url?: string;
  status: string;
  courier?: string;
}

// Typ dla pozycji zlecenia
interface OrderItemDisplay {
  id: number;
  item_number: number;
  product_name: string;
  description?: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  price_total: number;
  status: string;
  notes?: string;
}

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, setOrders, setTimeEntries, timeEntries, currentUser, workers } = useApp();

  const order = orders.find(o => o.id === Number(id));
  const [selectedStages, setSelectedStages] = useState<number[]>([]);
  const [stageWorkers, setStageWorkers] = useState<Record<number, number[]>>({});
  const [showApaczkaIntegration, setShowApaczkaIntegration] = useState(false);
  const [showPrintCard, setShowPrintCard] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orderItems, setOrderItems] = useState<OrderItemDisplay[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [progressStages, setProgressStages] = useState<{ id: number; name: string; status: string }[]>([]);

  // Załaduj etapy dla paska postępu
  useEffect(() => {
    const loadProgressStages = async () => {
      if (!order?.id) return;

      if (isDemoMode()) {
        // Demo mode - use local data
        if (order.stages) {
          setProgressStages(order.stages.map(s => ({
            id: s.stageId,
            name: s.stageName,
            status: s.status || 'pending'
          })));
        }
        return;
      }

      try {
        const response = await stagesApi.getOrderStages(order.id);
        const stagesData = response.data?.stages || [];
        setProgressStages(stagesData.map((s: any) => ({
          id: s.id,
          name: s.name || s.stage_name,
          status: s.status || 'pending'
        })));
      } catch (error) {
        console.error('Failed to load progress stages:', error);
      }
    };

    loadProgressStages();
  }, [order?.id]);

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

  // Załaduj pozycje zlecenia
  useEffect(() => {
    const loadOrderItems = async () => {
      if (!order?.id) return;

      // W trybie demo - stwórz jedną pozycję z danych zlecenia
      if (isDemoMode()) {
        if (order.product_name) {
          setOrderItems([{
            id: 1,
            item_number: 1,
            product_name: order.product_name,
            quantity: order.quantity || 1,
            unit: 'szt.',
            price_per_unit: order.price_per_unit || 0,
            price_total: order.price_total || 0,
            status: 'NOWE'
          }]);
        }
        return;
      }

      setLoadingItems(true);
      try {
        const response = await orderItemsApi.getOrderItems(order.id);
        if (response.success && response.data?.items?.length > 0) {
          setOrderItems(response.data.items);
        } else if (order.product_name) {
          // Fallback - jeśli nie ma pozycji w bazie, pokaż główny produkt
          setOrderItems([{
            id: 0,
            item_number: 1,
            product_name: order.product_name,
            quantity: order.quantity || 1,
            unit: 'szt.',
            price_per_unit: parseFloat(String(order.price_per_unit)) || 0,
            price_total: parseFloat(String(order.price_total)) || 0,
            status: order.status || 'NOWE'
          }]);
        }
      } catch (error) {
        console.error('Failed to load order items:', error);
        // Fallback
        if (order.product_name) {
          setOrderItems([{
            id: 0,
            item_number: 1,
            product_name: order.product_name,
            quantity: order.quantity || 1,
            unit: 'szt.',
            price_per_unit: parseFloat(String(order.price_per_unit)) || 0,
            price_total: parseFloat(String(order.price_total)) || 0,
            status: order.status || 'NOWE'
          }]);
        }
      } finally {
        setLoadingItems(false);
      }
    };

    loadOrderItems();
  }, [order?.id]);

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

  const saveAndAdvanceStage = async (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    const assignedWorkerIds = stageWorkers[stageId] || [];

    if (assignedWorkerIds.length === 0) {
      toast({ title: "Błąd", description: "Przypisz pracowników do etapu.", variant: "destructive" });
      return;
    }

    try {
      // 1. Create assignments via API for each worker
      for (const workerId of assignedWorkerIds) {
        if (!isDemoMode()) {
          await assignmentsApi.create(stageId, workerId);
        }
      }

      // 2. Update stage status to W_TRAKCIE via API
      if (!isDemoMode()) {
        await stagesApi.update(stageId, { status: 'W_TRAKCIE' });
      }

      // 3. Update local state for UI
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
    } catch (error: any) {
      console.error('Error starting stage:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się uruchomić etapu.",
        variant: "destructive"
      });
    }
  };

  const handleShipmentCreated = (shipment: ShipmentResult) => {
    setOrders(prev => prev.map(o =>
      o.id === order.id
        ? {
            ...o,
            shipment_number: shipment.shipment_number,
            shipment_status: 'ZAMÓWIONA' as const,
            shipment_tracking_url: shipment.tracking_url || `https://apaczka.pl/track/${shipment.shipment_number}`
          }
        : o
    ));
    setShowApaczkaIntegration(false);
    toast({ title: "Kurier zamówiony", description: `Nr przesyłki: ${shipment.shipment_number || 'Oczekuje'}` });
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

  // Map attachment from API format to frontend format
  const mapAttachment = (att: any) => ({
    id: att.id,
    orderId: att.order_id || att.orderId,
    fileName: att.original_filename || att.filename || att.fileName,
    fileType: att.file_type || att.fileType,
    fileSize: att.file_size || att.fileSize,
    fileUrl: att.file_path || att.fileUrl,
    uploadedBy: att.uploaded_by || att.uploadedBy,
    uploadedAt: att.created_at || att.uploadedAt
  });

  // Get mapped attachments
  const attachments = order.attachments?.map(mapAttachment) || [];

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

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage size={20} className="text-blue-500" />;
    if (fileType === 'application/pdf') return <FileText size={20} className="text-red-500" />;
    return <Paperclip size={20} className="text-gray-500" />;
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !order) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Nieprawidłowy format",
          description: `Plik "${file.name}" ma nieobsługiwany format. Dozwolone: JPG, PNG, GIF, WebP, PDF`,
          variant: "destructive"
        });
        continue;
      }

      if (file.size > maxSize) {
        toast({
          title: "Plik za duży",
          description: `Plik "${file.name}" przekracza limit 10MB`,
          variant: "destructive"
        });
        continue;
      }

      try {
        if (isDemoMode()) {
          // Demo mode - create local attachment
          const newAttachment: OrderAttachment = {
            id: `attach_${Date.now()}_${i}`,
            orderId: order.id,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileUrl: URL.createObjectURL(file),
            uploadedBy: currentUser?.name || 'Użytkownik',
            uploadedAt: new Date().toISOString()
          };

          setOrders(prev => prev.map(o =>
            o.id === order.id
              ? { ...o, attachments: [...(o.attachments || []), newAttachment] }
              : o
          ));

          toast({ title: "Plik dodany", description: `${file.name} (tryb demo)` });
        } else {
          // Production mode - upload to server
          const response = await attachmentsApi.upload(order.id, file);
          // API zwraca: { success: true, data: { attachment: {...} } }
          const attachment = response.data?.attachment || response.data;
          if (response.success && attachment) {
            // Mapuj pola z API na format frontendu
            const mappedAttachment = {
              id: attachment.id,
              orderId: attachment.order_id,
              fileName: attachment.original_filename || attachment.filename,
              fileType: attachment.file_type,
              fileSize: attachment.file_size,
              fileUrl: attachment.file_path,
              uploadedBy: attachment.uploaded_by,
              uploadedAt: attachment.created_at
            };
            setOrders(prev => prev.map(o =>
              o.id === order.id
                ? { ...o, attachments: [...(o.attachments || []), mappedAttachment] }
                : o
            ));
            toast({ title: "Plik przesłany", description: file.name });
          }
        }
      } catch (error: any) {
        console.error('Upload error:', error);
        toast({
          title: "Błąd przesyłania",
          description: error.message || `Nie udało się przesłać pliku ${file.name}`,
          variant: "destructive"
        });
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Delete attachment
  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten plik?')) return;

    try {
      if (isDemoMode()) {
        setOrders(prev => prev.map(o =>
          o.id === order?.id
            ? { ...o, attachments: (o.attachments || []).filter(a => a.id !== attachmentId) }
            : o
        ));
        toast({ title: "Plik usunięty" });
      } else {
        await attachmentsApi.delete(Number(attachmentId));
        setOrders(prev => prev.map(o =>
          o.id === order?.id
            ? { ...o, attachments: (o.attachments || []).filter(a => a.id !== attachmentId) }
            : o
        ));
        toast({ title: "Plik usunięty" });
      }
    } catch (error) {
      toast({ title: "Błąd", description: "Nie udało się usunąć pliku", variant: "destructive" });
    }
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
            <p className="font-semibold">{order.price_total ? Number(order.price_total).toFixed(2) : '-'} zł</p>
            {order.price_per_unit && <p className="text-sm text-muted-foreground">{Number(order.price_per_unit || 0).toFixed(2)} zł/szt.</p>}
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

      {/* Progress Bar - Pasek postępu zlecenia */}
      {progressStages.length > 0 && (
        <div className="card-industrial mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock size={20} />
              Postęp zlecenia
            </h2>
            <span className="text-2xl font-bold text-primary">
              {Math.round((progressStages.filter(s => s.status === 'completed' || s.status === 'GOTOWE').length / progressStages.length) * 100)}%
            </span>
          </div>

          {/* Main progress bar */}
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 ease-out"
              style={{
                width: `${(progressStages.filter(s => s.status === 'completed' || s.status === 'GOTOWE').length / progressStages.length) * 100}%`
              }}
            />
          </div>

          {/* Stage indicators */}
          <div className="flex justify-between gap-1">
            {progressStages.map((stage) => {
              const isCompleted = stage.status === 'completed' || stage.status === 'GOTOWE';
              const isInProgress = stage.status === 'in_progress' || stage.status === 'W_TRAKCIE';
              return (
                <div
                  key={stage.id}
                  className="flex-1 text-center"
                  title={stage.name}
                >
                  <div
                    className={`h-2 rounded-full mb-1 ${
                      isCompleted ? 'bg-green-500' :
                      isInProgress ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-300'
                    }`}
                  />
                  <span className={`text-xs truncate block ${
                    isCompleted ? 'text-green-600 font-medium' :
                    isInProgress ? 'text-blue-600 font-medium' :
                    'text-muted-foreground'
                  }`}>
                    {stage.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary stats */}
          <div className="flex gap-4 mt-3 pt-3 border-t text-sm">
            <div>
              <span className="text-muted-foreground">Ukończone: </span>
              <span className="font-semibold text-green-600">
                {progressStages.filter(s => s.status === 'completed' || s.status === 'GOTOWE').length}
              </span>
              <span className="text-muted-foreground"> / {progressStages.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">W trakcie: </span>
              <span className="font-semibold text-blue-600">
                {progressStages.filter(s => s.status === 'in_progress' || s.status === 'W_TRAKCIE').length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Oczekujące: </span>
              <span className="font-semibold">
                {progressStages.filter(s => s.status === 'pending' || s.status === 'NOWY' || !s.status).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pozycje Zlecenia */}
      {orderItems.length > 0 && (
        <div className="card-industrial mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package size={24} />
            Pozycje Zlecenia ({orderItems.length})
          </h2>

          {loadingItems ? (
            <div className="text-center py-4 text-muted-foreground">Ładowanie pozycji...</div>
          ) : (
            <div className="space-y-3">
              {orderItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                        #{item.item_number || index + 1}
                      </span>
                      <span className="font-semibold text-lg">{item.product_name}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      item.status === 'GOTOWE' ? 'bg-green-100 text-green-800' :
                      item.status === 'W_TRAKCIE' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status || 'NOWE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ilość:</span>
                      <p className="font-medium">{item.quantity} {item.unit}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cena/szt.:</span>
                      <p className="font-medium">{Number(item.price_per_unit || 0).toFixed(2)} zł</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Wartość:</span>
                      <p className="font-semibold text-primary">{Number(item.price_total || 0).toFixed(2)} zł</p>
                    </div>
                    {item.description && (
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground">Opis:</span>
                        <p className="font-medium">{item.description}</p>
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="mt-2 text-sm text-muted-foreground italic">{item.notes}</p>
                  )}
                </div>
              ))}

              {/* Podsumowanie */}
              <div className="mt-4 p-4 bg-primary/10 rounded-lg flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-muted-foreground">Łączna ilość: </span>
                  <span className="font-semibold">{orderItems.reduce((sum, i) => sum + (i.quantity || 0), 0)}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">Wartość całkowita: </span>
                  <span className="text-2xl font-bold text-primary">
                    {orderItems.reduce((sum, i) => sum + (Number(i.price_total) || 0), 0).toFixed(2)} zł
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Tab - like Prodio */}
      <div className="card-industrial mb-6">
        <ProgressTab orderId={order.id} />
      </div>

      {/* Work Sessions Tab - historia sesji pracy */}
      <div className="card-industrial mb-6">
        <WorkSessionsTab orderId={order.id} />
      </div>

      {/* Warehouse Tab - wydania/przyjęcia materiałów */}
      <div className="card-industrial mb-6">
        <WarehouseTab orderId={order.id} />
      </div>

      {/* Defects Tab - jakość i defekty */}
      <div className="card-industrial mb-6">
        <DefectsTab orderId={order.id} stages={order.stages?.map(s => ({ id: s.stageId, stage_name: s.stageName })) || []} />
      </div>

      {/* Przygotowanie - GRAFIK */}
      <div className="card-industrial mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Palette size={24} />
          Przygotowanie Produkcji
        </h2>

        {(() => {
          const grafikStage = stages.find(s => s.name === 'GRAFIK');
          const grafikOrderStage = order.stages?.find(s => s.stageName === 'GRAFIK');
          const isGrafikReady = grafikOrderStage?.status === 'completed';

          return (
            <div className={`p-4 rounded-lg border-2 ${isGrafikReady ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGrafikReady}
                  onChange={() => {
                    const newStatus = isGrafikReady ? 'pending' : 'completed';
                    const updatedStages = order.stages?.map(s =>
                      s.stageName === 'GRAFIK' ? { ...s, status: newStatus } : s
                    ) || [];

                    // Dodaj etap GRAFIK jeśli nie istnieje
                    if (!order.stages?.find(s => s.stageName === 'GRAFIK')) {
                      updatedStages.push({
                        stageId: grafikStage?.id || 1,
                        stageName: 'GRAFIK',
                        assignedWorkers: [],
                        status: newStatus as any
                      });
                    }

                    setOrders(prev => prev.map(o =>
                      o.id === order.id ? { ...o, stages: updatedStages } : o
                    ));
                    toast({
                      title: newStatus === 'completed' ? "Pliki gotowe" : "Pliki w przygotowaniu",
                      description: newStatus === 'completed'
                        ? "Zlecenie gotowe do produkcji"
                        : "Grafik musi przygotować pliki"
                    });
                  }}
                  className="w-6 h-6 rounded accent-green-600"
                />
                <div>
                  <p className="font-semibold text-lg">
                    {isGrafikReady ? '✓ Pliki produkcyjne gotowe' : '⏳ Oczekuje na pliki od grafika'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Grafik przygotowuje: rysunki techniczne, pliki CNC, projekty do druku
                  </p>
                </div>
              </label>

              {/* Lokalizacja plików CNC */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Lokalizacja plików CNC / programów
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={order.folder_path || ''}
                    onChange={(e) => {
                      setOrders(prev => prev.map(o =>
                        o.id === order.id ? { ...o, folder_path: e.target.value } : o
                      ));
                    }}
                    onBlur={async (e) => {
                      // Zapisz folder_path do API
                      if (!isDemoMode()) {
                        try {
                          await ordersApi.update(order.id, { folder_path: e.target.value });
                          toast({ title: "Zapisano", description: "Lokalizacja plików została zapisana" });
                        } catch (error) {
                          console.error('Failed to save folder_path:', error);
                          toast({ title: "Błąd", description: "Nie udało się zapisać lokalizacji", variant: "destructive" });
                        }
                      }
                    }}
                    placeholder="np. /PROJEKTY/KLIENT/NR_ZLECENIA/ lub \\\\SERVER\\CNC\\..."
                    className="flex-1 input-industrial font-mono text-sm"
                  />
                  {order.folder_path && order.folder_path.startsWith('http') && (
                    <a
                      href={order.folder_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-1"
                    >
                      <ExternalLink size={16} />
                      Otwórz
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Wpisz ścieżkę do folderu z plikami CNC, aby pracownicy mogli je pobrać
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Etapy PRODUKCYJNE - tylko te kierownik przypisuje */}
      <div className="card-industrial mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Check size={24} />
          Etapy Produkcyjne
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Wybierz etapy potrzebne do realizacji tego zlecenia i przypisz pracowników
        </p>

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
          {productionStages.map((stage) => {
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
                      {stage.description && (
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                      )}
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

                    {/* Filter workers by skill matching the stage name */}
                    {(() => {
                      const eligibleWorkers = workers.filter(w =>
                        w.active && w.skills && w.skills.includes(stage.name)
                      );
                      const otherWorkers = workers.filter(w =>
                        w.active && (!w.skills || !w.skills.includes(stage.name))
                      );

                      return (
                        <>
                          {eligibleWorkers.length > 0 ? (
                            <>
                              <p className="text-xs text-muted-foreground mb-2">
                                Pracownicy z umiejętnością "{stage.name}":
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                {eligibleWorkers.map((worker) => (
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
                                      <p className="text-sm text-muted-foreground">{worker.position} • {Number(worker.hourly_rate || 0).toFixed(2)} zł/h</p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-yellow-600 mb-4">
                              Brak pracowników z umiejętnością "{stage.name}". Dodaj umiejętności w panelu administracyjnym.
                            </p>
                          )}

                          {/* Show other workers in collapsed section if needed */}
                          {otherWorkers.length > 0 && (
                            <details className="mb-4">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                Inni pracownicy ({otherWorkers.length}) - bez umiejętności "{stage.name}"
                              </summary>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 opacity-60">
                                {otherWorkers.map((worker) => (
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
                                      <p className="text-sm text-muted-foreground">{worker.position} • {Number(worker.hourly_rate || 0).toFixed(2)} zł/h</p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </details>
                          )}
                        </>
                      );
                    })()}

                    {assignedWorkers.length > 0 && orderStage?.status !== 'completed' && (
                      <button
                        onClick={() => saveAndAdvanceStage(stage.id)}
                        className="btn-success w-full sm:w-auto"
                      >
                        <ChevronRight size={18} className="mr-2" />
                        Uruchom etap
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

      {/* BOM Section */}
      <div className="card-industrial mt-6">
        <BOMTab orderId={order.id} canEdit={true} />
      </div>

      {/* Traceability Section */}
      <div className="card-industrial mt-6">
        <TraceabilityTab orderId={order.id} />
      </div>

      {/* Attachments Section */}
      <div className="card-industrial mt-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Paperclip size={24} />
          Zalaczniki ({attachments.length})
        </h2>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm text-muted-foreground">Przesyłanie...</span>
              </>
            ) : (
              <>
                <Upload size={32} className="text-muted-foreground" />
                <span className="text-sm font-medium">
                  Przeciągnij pliki tutaj lub kliknij, aby wybrać
                </span>
                <span className="text-xs text-muted-foreground">
                  Obsługiwane formaty: JPG, PNG, GIF, WebP, PDF (max 10MB)
                </span>
              </>
            )}
          </label>
        </div>

        {/* Attachments List */}
        {attachments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
              >
                {/* Preview for images */}
                {attachment.fileType.startsWith('image/') ? (
                  <img
                    src={attachment.fileUrl}
                    alt={attachment.fileName}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-muted rounded">
                    {getFileIcon(attachment.fileType)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" title={attachment.fileName}>
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)} • {attachment.uploadedBy}
                  </p>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-muted rounded"
                    title="Pobierz"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => deleteAttachment(attachment.id)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded"
                    title="Usuń"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Brak załączników. Dodaj zdjęcia lub pliki PDF przeciągając je powyżej.
          </p>
        )}
      </div>

      {/* Activity Tab - like Prodio */}
      <div className="card-industrial mt-6">
        <ActivityTab orderId={order.id} />
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