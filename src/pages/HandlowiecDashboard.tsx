import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Briefcase, Plus, LogOut, ClipboardList, Package, Clock, CheckCircle, Eye, ArrowLeft, Settings,
  MessageSquare, Paperclip, Truck, TrendingUp, DollarSign, AlertTriangle, Send, Upload, X, FileText, Image
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/types';
import { generateOrderNumber } from '@/data/mockData';
import { ordersApi, commentsApi, attachmentsApi, shipmentsApi, isDemoMode } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import AnnouncementBoard from '@/components/AnnouncementBoard';
import ClockWidget from '@/components/TimeTracking/ClockWidget';

// Interface for comments
interface Comment {
  id: number;
  content: string;
  author_name: string;
  created_at: string;
}

// Interface for attachments
interface Attachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Podgląd szczegółów zlecenia dla handlowca - rozbudowany
const OrderDetailsView = () => {
  const { orders, timeEntries, currentUser } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const demoMode = isDemoMode();

  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const order = orders.find(o => o.id === Number(id));

  // Load comments and attachments
  useEffect(() => {
    if (!order || demoMode) return;

    const loadData = async () => {
      // Load comments
      setLoadingComments(true);
      try {
        const response = await commentsApi.getOrderComments(order.id);
        if (response.success && response.data?.comments) {
          setComments(response.data.comments);
        }
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoadingComments(false);
      }

      // Load attachments
      setLoadingAttachments(true);
      try {
        const response = await attachmentsApi.getOrderAttachments(order.id);
        if (response.success && response.data?.attachments) {
          const mapped = response.data.attachments.map((att: any) => ({
            id: att.id,
            fileName: att.original_filename || att.filename || att.fileName,
            fileType: att.file_type || att.fileType,
            fileSize: att.file_size || att.fileSize,
            fileUrl: att.file_path || att.fileUrl,
            uploadedBy: att.uploaded_by || att.uploadedBy,
            uploadedAt: att.created_at || att.uploadedAt
          }));
          setAttachments(mapped);
        }
      } catch (error) {
        console.error('Failed to load attachments:', error);
      } finally {
        setLoadingAttachments(false);
      }
    };

    loadData();
  }, [order, demoMode]);

  // Calculate total work hours for this order
  const calculateWorkHours = useCallback(() => {
    if (!order) return { totalHours: 0, stageHours: {} as Record<string, number> };

    const orderTimeEntries = timeEntries.filter(te => te.orderId === order.id);
    const totalSeconds = orderTimeEntries.reduce((sum, te) => sum + (te.totalSeconds || 0), 0);
    const totalHours = totalSeconds / 3600;

    // Group by stage
    const stageHours: Record<string, number> = {};
    orderTimeEntries.forEach(te => {
      const stage = order.stages?.find(s => s.stageId === te.stageId);
      if (stage) {
        stageHours[stage.stageName] = (stageHours[stage.stageName] || 0) + (te.totalSeconds || 0) / 3600;
      }
    });

    return { totalHours, stageHours };
  }, [order, timeEntries]);

  const { totalHours, stageHours } = calculateWorkHours();

  // Send comment
  const handleSendComment = async () => {
    if (!newComment.trim() || !order) return;

    if (demoMode) {
      const demoComment: Comment = {
        id: Date.now(),
        content: newComment,
        author_name: currentUser?.name || 'Handlowiec',
        created_at: new Date().toISOString()
      };
      setComments(prev => [...prev, demoComment]);
      setNewComment('');
      toast({ title: 'Komentarz dodany (demo)' });
      return;
    }

    setSendingComment(true);
    try {
      const response = await commentsApi.create(order.id, newComment);
      if (response.success && response.data?.comment) {
        setComments(prev => [...prev, response.data.comment]);
        setNewComment('');
        toast({ title: 'Komentarz dodany' });
      }
    } catch (error) {
      console.error('Failed to send comment:', error);
      toast({ title: 'Błąd przy dodawaniu komentarza', variant: 'destructive' });
    } finally {
      setSendingComment(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !order) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Plik jest za duży (max 10MB)', variant: 'destructive' });
      return;
    }

    if (demoMode) {
      const demoAttachment: Attachment = {
        id: Date.now(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: URL.createObjectURL(file),
        uploadedBy: currentUser?.name || 'Handlowiec',
        uploadedAt: new Date().toISOString()
      };
      setAttachments(prev => [...prev, demoAttachment]);
      toast({ title: 'Plik dodany (demo)' });
      return;
    }

    setUploadingFile(true);
    try {
      const response = await attachmentsApi.upload(order.id, file);
      if (response.success && response.data?.attachment) {
        const att = response.data.attachment;
        setAttachments(prev => [...prev, {
          id: att.id,
          fileName: att.original_filename || att.filename,
          fileType: att.file_type,
          fileSize: att.file_size,
          fileUrl: att.file_path,
          uploadedBy: att.uploaded_by,
          uploadedAt: att.created_at
        }]);
        toast({ title: 'Plik przesłany' });
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast({ title: 'Błąd przy przesyłaniu pliku', variant: 'destructive' });
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten plik?')) return;

    if (demoMode) {
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast({ title: 'Plik usunięty (demo)' });
      return;
    }

    try {
      await attachmentsApi.delete(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast({ title: 'Plik usunięty' });
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      toast({ title: 'Błąd przy usuwaniu pliku', variant: 'destructive' });
    }
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
    if (fileType?.includes('pdf')) return <FileText size={16} className="text-red-500" />;
    return <Paperclip size={16} className="text-gray-500" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Nie znaleziono zlecenia</p>
        <button onClick={() => navigate('/handlowiec/orders')} className="btn-primary">
          Wróć do listy
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOWE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'W_TRAKCIE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'GOTOWE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NOWE': return 'Nowe';
      case 'W_TRAKCIE': return 'W trakcie';
      case 'GOTOWE': return 'Gotowe';
      default: return status;
    }
  };

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Zakończony';
      case 'in_progress': return 'W trakcie';
      default: return 'Oczekuje';
    }
  };

  // Calculate progress
  const getProgress = () => {
    if (!order.stages || order.stages.length === 0) return 0;
    const completed = order.stages.filter(s => s.status === 'completed').length;
    return Math.round((completed / order.stages.length) * 100);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/handlowiec/orders')} className="btn-secondary">
          <ArrowLeft size={18} className="mr-2" />
          Wróć
        </button>
        <h2 className="text-2xl font-bold">Zlecenie {order.order_number}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      {/* Progress Summary Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Postęp produkcji</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${getProgress()}%` }} />
                </div>
                <span className="font-bold text-lg">{getProgress()}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Przepracowano</p>
              <p className="text-2xl font-bold text-primary mt-1">{Number(totalHours || 0).toFixed(1)} h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ukończone etapy</p>
              <p className="text-2xl font-bold mt-1">
                {order.stages?.filter(s => s.status === 'completed').length || 0}/{order.stages?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Termin</p>
              {order.planned_completion_date ? (
                <p className={`text-lg font-bold mt-1 ${new Date(order.planned_completion_date) < new Date() ? 'text-red-500' : ''}`}>
                  {new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1">Nie określono</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dane klienta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Nazwa klienta</span>
              <p className="font-medium">{order.client_name}</p>
            </div>
            {order.client_email && (
              <div>
                <span className="text-sm text-muted-foreground">Email</span>
                <p className="font-medium">{order.client_email}</p>
              </div>
            )}
            {order.client_phone && (
              <div>
                <span className="text-sm text-muted-foreground">Telefon</span>
                <p className="font-medium">{order.client_phone}</p>
              </div>
            )}
            {order.client_order_number && (
              <div>
                <span className="text-sm text-muted-foreground">Nr zamówienia klienta</span>
                <p className="font-medium">{order.client_order_number}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Szczegóły zlecenia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Produkt</span>
              <p className="font-medium">{order.product_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Ilość</span>
                <p className="font-medium">{order.quantity}</p>
              </div>
              {order.price_total && (
                <div>
                  <span className="text-sm text-muted-foreground">Wartość</span>
                  <p className="font-medium">{Number(order.price_total || 0).toFixed(2)} zł</p>
                </div>
              )}
            </div>
            {order.notes && (
              <div>
                <span className="text-sm text-muted-foreground">Uwagi</span>
                <p className="font-medium">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Etapy produkcji z godzinami */}
      {order.stages && order.stages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Etapy produkcji i roboczogodziny
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.stages.map((stage, index) => (
                <div key={stage.stageId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                      stage.status === 'completed' ? 'bg-green-500 text-white' :
                      stage.status === 'in_progress' ? 'bg-blue-500 text-white' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {stage.status === 'completed' ? <CheckCircle size={16} /> : index + 1}
                    </span>
                    <span className="font-medium">{stage.stageName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {(stageHours[stage.stageName] || 0).toFixed(1)} h
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageStatusColor(stage.status)}`}>
                      {getStageStatusLabel(stage.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Załączniki */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Paperclip size={20} />
              Załączniki ({attachments.length})
            </span>
            <label className="btn-primary cursor-pointer text-sm">
              <Upload size={16} className="mr-2" />
              {uploadingFile ? 'Przesyłanie...' : 'Dodaj plik'}
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileUpload}
                disabled={uploadingFile}
              />
            </label>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAttachments ? (
            <p className="text-center text-muted-foreground py-4">Ładowanie...</p>
          ) : attachments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Brak załączników. Dodaj zdjęcia lub PDF od klienta.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(att.fileType)}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{att.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(att.fileSize)} • {att.uploadedBy}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-background rounded transition-colors"
                      title="Pobierz"
                    >
                      <Eye size={16} />
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-500"
                      title="Usuń"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Komentarze / Uwagi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={20} />
            Uwagi i komentarze ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add comment form */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Napisz komentarz lub uwagę..."
              className="input-industrial flex-1"
              onKeyDown={e => e.key === 'Enter' && handleSendComment()}
            />
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim() || sendingComment}
              className="btn-primary"
            >
              <Send size={16} className="mr-2" />
              {sendingComment ? 'Wysyłanie...' : 'Wyślij'}
            </button>
          </div>

          {/* Comments list */}
          {loadingComments ? (
            <p className="text-center text-muted-foreground py-4">Ładowanie...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Brak komentarzy. Dodaj uwagi do zlecenia.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map(comment => (
                <div key={comment.id} className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{comment.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {comment.author_name} • {new Date(comment.created_at).toLocaleString('pl-PL')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Courier / Shipment placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck size={20} />
            Wysyłka i kurier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Truck size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Zamówienie kuriera będzie dostępne po ukończeniu produkcji.
            </p>
            {order.status === 'GOTOWE' && (
              <button className="btn-primary">
                <Truck size={16} className="mr-2" />
                Zamów kuriera
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Formularz nowego zlecenia (uproszczony dla handlowca)
const NewOrderForm = () => {
  const { orders, setOrders, currentUser, refreshOrders } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const demoMode = isDemoMode();

  // State for pending attachments (files selected before order creation)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [formData, setFormData] = useState({
    order_number: generateOrderNumber(orders),
    client_order_number: '',
    client_name: '',
    client_nip: '',
    client_email: '',
    client_phone: '',
    product_name: '',
    quantity: 1,
    price_total: 0,
    price_per_unit: 0,
    planned_completion_date: '',
    notes: '',
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `Plik ${file.name} jest za duży (max 10MB)`, variant: 'destructive' });
        continue;
      }
      newFiles.push(file);
    }
    setPendingFiles(prev => [...prev, ...newFiles]);
    event.target.value = ''; // Reset input
  };

  // Remove pending file
  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type?.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
    if (type?.includes('pdf')) return <FileText size={16} className="text-red-500" />;
    return <Paperclip size={16} className="text-gray-500" />;
  };

  // Upload attachments after order creation
  const uploadAttachments = async (orderId: number) => {
    if (pendingFiles.length === 0) return;

    setUploadingFiles(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of pendingFiles) {
      try {
        const response = await attachmentsApi.upload(orderId, file);
        if (response.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Failed to upload file:', error);
        errorCount++;
      }
    }

    setUploadingFiles(false);

    if (successCount > 0) {
      toast({ title: `Przesłano ${successCount} załącznik(ów)` });
    }
    if (errorCount > 0) {
      toast({ title: `Nie udało się przesłać ${errorCount} pliku(ów)`, variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja
    if (!formData.client_name?.trim() || !formData.product_name?.trim()) {
      toast({ title: 'Wypełnij wymagane pola (nazwa klienta, nazwa produktu)', variant: 'destructive' });
      return;
    }

    setLoading(true);

    // W trybie demo - zapisz lokalnie
    if (demoMode) {
      const newOrder: Order = {
        id: Math.max(0, ...orders.map(o => o.id)) + 1,
        ...formData,
        status: 'NOWE',
        created_by: currentUser?.name || 'Handlowiec',
        created_at: new Date().toISOString(),
        archived: false,
        stages: [
          { stageId: 1, stageName: 'GRAFIK', assignedWorkers: [], status: 'pending' },
        ]
      };
      setOrders(prev => [...prev, newOrder]);
      toast({ title: 'Zlecenie utworzone (demo)' });
      if (pendingFiles.length > 0) {
        toast({ title: `W trybie demo załączniki nie są zapisywane`, variant: 'destructive' });
      }
      setLoading(false);
      navigate('/handlowiec/orders');
      return;
    }

    // Tryb z API
    try {
      const response = await ordersApi.create({
        order_number: formData.order_number,
        client_order_number: formData.client_order_number,
        client_name: formData.client_name,
        client_nip: formData.client_nip || undefined,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        product_name: formData.product_name,
        quantity: formData.quantity,
        price_total: formData.price_total,
        price_per_unit: formData.price_per_unit,
        planned_completion_date: formData.planned_completion_date || undefined,
        notes: formData.notes,
      });

      if (response.success && response.data?.order) {
        const newOrderId = response.data.order.id;
        toast({ title: 'Zlecenie utworzone!' });

        // Upload pending attachments
        if (pendingFiles.length > 0) {
          await uploadAttachments(newOrderId);
        }

        await refreshOrders();
        navigate('/handlowiec/orders');
      } else {
        toast({ title: response.error || 'Błąd tworzenia zlecenia', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      // Fallback do lokalnego zapisu
      const newOrder: Order = {
        id: Math.max(0, ...orders.map(o => o.id)) + 1,
        ...formData,
        status: 'NOWE',
        created_by: currentUser?.name || 'Handlowiec',
        created_at: new Date().toISOString(),
        archived: false,
        stages: [
          { stageId: 1, stageName: 'GRAFIK', assignedWorkers: [], status: 'pending' },
        ]
      };
      setOrders(prev => [...prev, newOrder]);
      toast({ title: 'Zlecenie utworzone (lokalnie)' });
      navigate('/handlowiec/orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Nowe zlecenie</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dane klienta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nazwa klienta *</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={e => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  className="input-industrial"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">NIP</label>
                <input
                  type="text"
                  value={formData.client_nip}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, client_nip: value }));
                  }}
                  className="input-industrial"
                  placeholder="np. 1234567890"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={e => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                  className="input-industrial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.client_phone}
                  onChange={e => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                  className="input-industrial"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nr zamówienia klienta</label>
              <input
                type="text"
                value={formData.client_order_number}
                onChange={e => setFormData(prev => ({ ...prev, client_order_number: e.target.value }))}
                className="input-industrial"
                placeholder="np. ZAM-2025-001"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Szczegóły zlecenia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Numer zlecenia</label>
              <input
                type="text"
                value={formData.order_number}
                className="input-industrial bg-muted"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nazwa produktu *</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={e => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                className="input-industrial"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ilość *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={e => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="input-industrial"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cena za szt. (zł)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_per_unit}
                  onChange={e => {
                    const price = parseFloat(e.target.value) || 0;
                    setFormData(prev => ({
                      ...prev,
                      price_per_unit: price,
                      price_total: price * prev.quantity
                    }));
                  }}
                  className="input-industrial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Wartość (zł)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_total}
                  onChange={e => setFormData(prev => ({ ...prev, price_total: parseFloat(e.target.value) || 0 }))}
                  className="input-industrial"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Planowana data realizacji</label>
              <input
                type="date"
                value={formData.planned_completion_date}
                onChange={e => setFormData(prev => ({ ...prev, planned_completion_date: e.target.value }))}
                className="input-industrial"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Uwagi</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="input-industrial min-h-[100px]"
                placeholder="Dodatkowe informacje o zleceniu..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Sekcja załączników */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip size={20} />
              Załączniki (zdjęcia, PDF)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Dodaj pliki do zlecenia (max 10MB każdy)
              </label>
              <div className="flex items-center gap-2">
                <label className="btn-secondary cursor-pointer flex items-center gap-2">
                  <Upload size={16} />
                  Wybierz pliki
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                </label>
                <span className="text-sm text-muted-foreground">
                  {pendingFiles.length > 0 ? `${pendingFiles.length} plik(ów) wybranych` : 'Brak wybranych plików'}
                </span>
              </div>
            </div>

            {/* Lista wybranych plików */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                {pendingFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="p-1 hover:bg-red-100 rounded text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Podgląd obrazków */}
            {pendingFiles.filter(f => f.type.startsWith('image/')).length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {pendingFiles.filter(f => f.type.startsWith('image/')).map((file, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Akceptowane formaty: zdjęcia (JPG, PNG, GIF), PDF, dokumenty Office.
              Załączniki zostaną przesłane po utworzeniu zlecenia.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <button type="submit" className="btn-primary flex-1" disabled={loading || uploadingFiles}>
            {loading ? (uploadingFiles ? 'Przesyłanie załączników...' : 'Tworzenie...') : 'Utwórz zlecenie'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/handlowiec/orders')}
            className="btn-secondary"
            disabled={loading}
          >
            Anuluj
          </button>
        </div>
      </form>
    </div>
  );
};

// Lista zleceń z podglądem statusu
const OrdersList = () => {
  const { orders } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'NOWE' | 'W_TRAKCIE' | 'GOTOWE'>('ALL');

  const activeOrders = orders.filter(o => !o.archived);

  // Filtruj zlecenia według wybranego statusu
  const filteredOrders = filter === 'ALL'
    ? activeOrders
    : activeOrders.filter(o => o.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOWE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'W_TRAKCIE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'GOTOWE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NOWE': return 'Nowe';
      case 'W_TRAKCIE': return 'W trakcie';
      case 'GOTOWE': return 'Gotowe';
      default: return status;
    }
  };

  // Oblicz postęp etapów
  const getProgress = (order: Order) => {
    if (!order.stages || order.stages.length === 0) return 0;
    const completed = order.stages.filter(s => s.status === 'completed').length;
    return Math.round((completed / order.stages.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Moje zlecenia</h2>
        <button
          onClick={() => navigate('/handlowiec/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Nowe zlecenie
        </button>
      </div>

      {/* Filtry */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('NOWE')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'NOWE' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200'}`}
        >
          Nowe ({activeOrders.filter(o => o.status === 'NOWE').length})
        </button>
        <button
          onClick={() => setFilter('W_TRAKCIE')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'W_TRAKCIE' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200'}`}
        >
          W produkcji ({activeOrders.filter(o => o.status === 'W_TRAKCIE').length})
        </button>
        <button
          onClick={() => setFilter('GOTOWE')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'GOTOWE' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'}`}
        >
          Gotowe ({activeOrders.filter(o => o.status === 'GOTOWE').length})
        </button>
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'ALL' ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200'}`}
        >
          Wszystkie ({activeOrders.length})
        </button>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('NOWE')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrders.filter(o => o.status === 'NOWE').length}</p>
                <p className="text-sm text-muted-foreground">Nowe</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('W_TRAKCIE')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrders.filter(o => o.status === 'W_TRAKCIE').length}</p>
                <p className="text-sm text-muted-foreground">W produkcji</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('GOTOWE')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrders.filter(o => o.status === 'GOTOWE').length}</p>
                <p className="text-sm text-muted-foreground">Gotowe</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('ALL')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <ClipboardList className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
                <p className="text-sm text-muted-foreground">Wszystkie</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredOrders.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">
                {filter === 'ALL' ? 'Brak aktywnych zleceń' : `Brak zleceń o statusie "${getStatusLabel(filter)}"`}
              </p>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold">{order.order_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{order.product_name}</p>
                      <p className="text-sm text-muted-foreground">{order.client_name}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Ilość: {order.quantity}</span>
                        {order.price_total && <span>Wartość: {Number(order.price_total || 0).toFixed(2)} zł</span>}
                        {order.planned_completion_date && (
                          <span>Termin: {new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Progress bar */}
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Postęp</span>
                          <span>{getProgress(order)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${getProgress(order)}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/handlowiec/orders/${order.id}`)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Podgląd zlecenia"
                      >
                        <Eye size={20} className="text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Home z tablicą ogłoszeń i przeglądem
const DashboardHome = () => {
  const { orders, timeEntries } = useApp();
  const navigate = useNavigate();

  const activeOrders = orders.filter(o => !o.archived);
  const newOrders = activeOrders.filter(o => o.status === 'NOWE');
  const inProgressOrders = activeOrders.filter(o => o.status === 'W_TRAKCIE');
  const completedOrders = activeOrders.filter(o => o.status === 'GOTOWE');
  const overdueOrders = activeOrders.filter(o =>
    o.planned_completion_date && new Date(o.planned_completion_date) < new Date() && o.status !== 'GOTOWE'
  );

  // Calculate total revenue (pending)
  const pendingRevenue = activeOrders.reduce((sum, o) => sum + (Number(o.price_total) || 0), 0);
  const completedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.price_total) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Przegląd Twoich zleceń</p>
        </div>
        <button onClick={() => navigate('/handlowiec/new')} className="btn-primary">
          <Plus size={18} className="mr-2" />
          Nowe zlecenie
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/handlowiec/orders')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{newOrders.length}</p>
                <p className="text-sm text-muted-foreground">Nowe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/handlowiec/orders')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressOrders.length}</p>
                <p className="text-sm text-muted-foreground">W produkcji</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/handlowiec/orders')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedOrders.length}</p>
                <p className="text-sm text-muted-foreground">Gotowe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${overdueOrders.length > 0 ? 'border-red-300 dark:border-red-700' : ''}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${overdueOrders.length > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
                <AlertTriangle className={overdueOrders.length > 0 ? 'text-red-600' : 'text-green-600'} size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueOrders.length}</p>
                <p className="text-sm text-muted-foreground">Przeterminowane</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wartość aktywnych zleceń</p>
                <p className="text-2xl font-bold">{pendingRevenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wartość zrealizowanych</p>
                <p className="text-2xl font-bold text-green-600">{completedRevenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue orders alert */}
      {overdueOrders.length > 0 && (
        <Card className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle size={20} />
              Przeterminowane zlecenia ({overdueOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueOrders.slice(0, 3).map(order => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/handlowiec/orders/${order.id}`)}
                >
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">{order.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      Termin: {new Date(order.planned_completion_date!).toLocaleDateString('pl-PL')}
                    </p>
                    <p className="text-xs text-muted-foreground">{order.product_name}</p>
                  </div>
                </div>
              ))}
              {overdueOrders.length > 3 && (
                <button onClick={() => navigate('/handlowiec/orders')} className="w-full text-center text-sm text-primary hover:underline py-2">
                  Zobacz wszystkie ({overdueOrders.length})
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcement Board */}
      <AnnouncementBoard />

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ClipboardList size={20} />
              Ostatnie zlecenia
            </span>
            <button onClick={() => navigate('/handlowiec/orders')} className="text-sm text-primary hover:underline">
              Zobacz wszystkie
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeOrders.slice(0, 5).map(order => {
              const progress = order.stages?.length
                ? Math.round((order.stages.filter(s => s.status === 'completed').length / order.stages.length) * 100)
                : 0;

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                  onClick={() => navigate(`/handlowiec/orders/${order.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{order.order_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'NOWE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        order.status === 'W_TRAKCIE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {order.status === 'NOWE' ? 'Nowe' : order.status === 'W_TRAKCIE' ? 'W trakcie' : 'Gotowe'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.client_name} • {order.product_name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-20">
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-1">{progress}%</p>
                    </div>
                    <Eye size={18} className="text-muted-foreground" />
                  </div>
                </div>
              );
            })}
            {activeOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Brak aktywnych zleceń</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const HandlowiecDashboard = () => {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Sprawdź czy użytkownik jest zalogowany i ma odpowiednią rolę
    if (!currentUser) {
      navigate('/');
      return;
    }
    if (currentUser.role !== 'HANDLOWIEC' && currentUser.role !== 'ADMIN') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!currentUser) return null;

  // Active tab based on location
  const getActiveTab = () => {
    if (location.pathname.includes('/orders')) return 'orders';
    if (location.pathname.includes('/new')) return 'new';
    return 'dashboard';
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/handlowiec')}>
                <Briefcase className="text-primary" size={24} />
                <h1 className="text-xl font-bold">
                  PLEXI<span className="font-normal">SYSTEM</span>
                </h1>
              </div>
              <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
                Panel Handlowca
              </span>
            </div>
            <div className="flex items-center gap-4">
              {currentUser.role === 'ADMIN' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                >
                  <Settings size={18} />
                  Panel Admin
                </button>
              )}
              <span className="text-sm text-muted-foreground">
                {currentUser.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut size={20} />
                Wyloguj
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1">
            <button
              onClick={() => navigate('/handlowiec')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                getActiveTab() === 'dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/handlowiec/orders')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                getActiveTab() === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Zlecenia
            </button>
            <button
              onClick={() => navigate('/handlowiec/new')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                getActiveTab() === 'new'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              + Nowe zlecenie
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Clock Widget - rejestracja czasu pracy */}
        <div className="mb-6">
          <ClockWidget />
        </div>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/orders/:id" element={<OrderDetailsView />} />
          <Route path="/new" element={<NewOrderForm />} />
          <Route path="*" element={<DashboardHome />} />
        </Routes>
      </main>
    </div>
  );
};

export default HandlowiecDashboard;
