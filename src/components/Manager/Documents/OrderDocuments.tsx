import { useState, useEffect } from 'react';
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Upload,
  Trash2,
  Download,
  Eye,
  Clock,
  User,
  FolderOpen,
  Plus,
  Loader2,
  X
} from 'lucide-react';
import { documentsApi, isDemoMode } from '@/utils/api';

interface Document {
  id: number;
  order_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  category: string;
  description: string;
  version: number;
  is_current: boolean;
  created_at: string;
  uploaded_by_name: string;
}

interface OrderDocumentsProps {
  orderId: number;
  orderNumber?: string;
  readOnly?: boolean;
}

const OrderDocuments = ({ orderId, orderNumber, readOnly = false }: OrderDocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    category: 'drawing',
    description: '',
    file: null as File | null
  });
  const [uploading, setUploading] = useState(false);

  const CATEGORIES = [
    { value: 'drawing', label: 'Rysunek techniczny', icon: FileSpreadsheet },
    { value: 'specification', label: 'Specyfikacja', icon: FileText },
    { value: 'photo', label: 'Zdjecie', icon: Image },
    { value: 'contract', label: 'Umowa', icon: FileText },
    { value: 'invoice', label: 'Faktura', icon: FileText },
    { value: 'other', label: 'Inne', icon: File }
  ];

  useEffect(() => {
    loadDocuments();
  }, [orderId]);

  const loadDocuments = async () => {
    if (isDemoMode()) {
      loadDemoDocuments();
      return;
    }

    try {
      setLoading(true);
      const response = await documentsApi.getOrderDocuments(orderId);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDemoDocuments = () => {
    setDocuments([
      {
        id: 1,
        order_id: orderId,
        filename: 'rysunek_techniczny_v2.pdf',
        original_name: 'Rysunek techniczny v2.pdf',
        mime_type: 'application/pdf',
        file_size: 245000,
        category: 'drawing',
        description: 'Rysunek techniczny produktu z wymiarami',
        version: 2,
        is_current: true,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        uploaded_by_name: 'Jan Kowalski'
      },
      {
        id: 2,
        order_id: orderId,
        filename: 'specyfikacja_materialu.docx',
        original_name: 'Specyfikacja materiału.docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: 125000,
        category: 'specification',
        description: 'Specyfikacja materiałów i wymagań',
        version: 1,
        is_current: true,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        uploaded_by_name: 'Anna Nowak'
      },
      {
        id: 3,
        order_id: orderId,
        filename: 'zdjecie_referencyjne.jpg',
        original_name: 'Zdjęcie referencyjne.jpg',
        mime_type: 'image/jpeg',
        file_size: 1850000,
        category: 'photo',
        description: 'Zdjęcie podobnego produktu jako wzór',
        version: 1,
        is_current: true,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        uploaded_by_name: 'Piotr Wisniewski'
      }
    ]);
    setLoading(false);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || File;
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'drawing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'specification': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'photo': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'contract': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'invoice': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) return;

    if (isDemoMode()) {
      // Demo mode - simulate upload
      const newDoc: Document = {
        id: documents.length + 1,
        order_id: orderId,
        filename: uploadForm.file.name.toLowerCase().replace(/\s/g, '_'),
        original_name: uploadForm.file.name,
        mime_type: uploadForm.file.type,
        file_size: uploadForm.file.size,
        category: uploadForm.category,
        description: uploadForm.description,
        version: 1,
        is_current: true,
        created_at: new Date().toISOString(),
        uploaded_by_name: 'Ty'
      };
      setDocuments([newDoc, ...documents]);
      setShowUploadModal(false);
      setUploadForm({ category: 'drawing', description: '', file: null });
      return;
    }

    try {
      setUploading(true);
      // In production, would use FormData and actual file upload
      await documentsApi.upload({
        order_id: orderId,
        filename: uploadForm.file.name.toLowerCase().replace(/\s/g, '_'),
        original_name: uploadForm.file.name,
        mime_type: uploadForm.file.type,
        file_size: uploadForm.file.size,
        file_path: `/uploads/documents/${orderId}/${uploadForm.file.name}`,
        category: uploadForm.category,
        description: uploadForm.description
      });
      await loadDocuments();
      setShowUploadModal(false);
      setUploadForm({ category: 'drawing', description: '', file: null });
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Nie udało się przesłać dokumentu');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten dokument?')) return;

    if (isDemoMode()) {
      setDocuments(documents.filter(d => d.id !== id));
      return;
    }

    try {
      await documentsApi.delete(id);
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Nie udało się usunąć dokumentu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="animate-spin" size={24} />
        <span className="ml-2">Ładowanie dokumentów...</span>
      </div>
    );
  }

  return (
    <div className="card-industrial">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <FolderOpen size={20} />
          Dokumenty {orderNumber && `(${orderNumber})`}
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary py-2 px-3 text-sm"
          >
            <Plus size={16} className="mr-1" />
            Dodaj dokument
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <FolderOpen size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Brak dokumentów</p>
          {!readOnly && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-secondary mt-4"
            >
              <Upload size={16} className="mr-2" />
              Prześlij pierwszy dokument
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const Icon = getCategoryIcon(doc.category);
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-background rounded">
                    <Icon size={20} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.original_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className={`px-2 py-0.5 rounded ${getCategoryColor(doc.category)}`}>
                        {getCategoryLabel(doc.category)}
                      </span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      {doc.version > 1 && <span>v{doc.version}</span>}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{doc.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <div className="text-right text-xs text-muted-foreground hidden sm:block">
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      {doc.uploaded_by_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => alert('Podgląd dokumentu (funkcja w przygotowaniu)')}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                      title="Podgląd"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => alert('Pobieranie dokumentu (funkcja w przygotowaniu)')}
                      className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                      title="Pobierz"
                    >
                      <Download size={16} />
                    </button>
                    {!readOnly && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="Usuń"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Dodaj dokument</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plik</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="input-industrial w-full"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                />
                {uploadForm.file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kategoria</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="input-industrial w-full"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Opis (opcjonalnie)</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="input-industrial w-full h-20 resize-none"
                  placeholder="Krótki opis dokumentu..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary flex-1"
                  disabled={uploading}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadForm.file || uploading}
                  className="btn-primary flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Przesyłanie...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" />
                      Prześlij
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDocuments;
