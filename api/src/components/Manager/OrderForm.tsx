import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ordersApi } from '@/utils/api';
import { Order } from '@/types';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const OrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, refreshOrders, workers } = useApp();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Order>>({
    order_number: '',
    client_order_number: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    product_name: '',
    quantity: 1,
    price_per_unit: 0,
    price_total: 0,
    planned_completion_date: '',
    notes: '',
    folder_path: '',
    // Nowe pola:
    salesperson_id: null,  // Handlowiec prowadzący
    invoice_number: '',     // Nr faktury
    shipment_number: '',    // Nr listu przewozowego (Apaczka)
    packaging_info: '',     // Info o pakowaniu
    status: 'NOWE',
  });

  // Load existing order data if editing
  useEffect(() => {
    const loadOrder = async () => {
      if (isEdit && id) {
        setLoading(true);
        try {
          const response = await ordersApi.getById(Number(id));
          if (response.success && response.data?.order) {
            setFormData(response.data.order);
          }
        } catch (error) {
          toast.error('Nie udało się pobrać zlecenia');
        } finally {
          setLoading(false);
        }
      }
    };
    loadOrder();
  }, [isEdit, id]);

  // Auto-calculate total price
  useEffect(() => {
    if (formData.quantity && formData.price_per_unit) {
      setFormData(prev => ({
        ...prev,
        price_total: Number(prev.quantity) * Number(prev.price_per_unit)
      }));
    }
  }, [formData.quantity, formData.price_per_unit]);

  const handleSave = async () => {
    if (!formData.order_number || !formData.client_name || !formData.product_name) {
      toast.error('Wypełnij wymagane pola (nr zlecenia, klient, produkt)');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && id) {
        const response = await ordersApi.update(Number(id), formData);
        if (response.success) {
          toast.success('Zlecenie zaktualizowane');
          await refreshOrders();
          navigate('/manager/orders');
        } else {
          toast.error(response.error || 'Błąd aktualizacji');
        }
      } else {
        const response = await ordersApi.create(formData);
        if (response.success) {
          toast.success('Zlecenie utworzone pomyślnie!');
          await refreshOrders();
          navigate('/manager/orders');
        } else {
          toast.error(response.error || 'Błąd tworzenia');
        }
      }
    } catch (error) {
      toast.error('Wystąpił błąd podczas zapisywania');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof Order, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Get sales workers (HANDLOWIEC position)
  const salesWorkers = workers.filter(w => w.position === 'HANDLOWIEC' && w.active);

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
        <span className="ml-2">Ładowanie...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/manager/orders')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={20} />
        Wróć do listy
      </button>

      <div className="card-industrial">
        <h1 className="text-2xl font-bold mb-6">
          {isEdit ? '✏️ Edytuj Zlecenie' : '📝 Nowe Zlecenie'}
        </h1>

        <div className="space-y-6">
          {/* Section 1: Order Info */}
          <div className="border-b border-border pb-4">
            <h2 className="font-semibold mb-4 text-lg">📋 Informacje o Zleceniu</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nr Zlecenia *</label>
                <input
                  type="text"
                  value={formData.order_number || ''}
                  onChange={e => updateField('order_number', e.target.value)}
                  className="input-industrial"
                  placeholder="1450/2025"
                  disabled={isEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Handlowiec Prowadzący</label>
                <select
                  value={formData.salesperson_id || ''}
                  onChange={e => updateField('salesperson_id', e.target.value ? Number(e.target.value) : null)}
                  className="input-industrial"
                >
                  <option value="">Wybierz handlowca...</option>
                  {salesWorkers.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nr Zamówienia Klienta</label>
                <input
                  type="text"
                  value={formData.client_order_number || ''}
                  onChange={e => updateField('client_order_number', e.target.value)}
                  className="input-industrial"
                  placeholder="ORD-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Termin Realizacji *</label>
                <input
                  type="date"
                  value={formData.planned_completion_date || ''}
                  onChange={e => updateField('planned_completion_date', e.target.value)}
                  className="input-industrial"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Client Info */}
          <div className="border-b border-border pb-4">
            <h2 className="font-semibold mb-4 text-lg">👤 Dane Klienta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nazwa Klienta *</label>
                <input
                  type="text"
                  value={formData.client_name || ''}
                  onChange={e => updateField('client_name', e.target.value)}
                  className="input-industrial"
                  placeholder="TEAM POINT Sp. z o.o."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email Klienta *</label>
                <input
                  type="email"
                  value={formData.client_email || ''}
                  onChange={e => updateField('client_email', e.target.value)}
                  className="input-industrial"
                  placeholder="kontakt@klient.pl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefon</label>
                <input
                  type="text"
                  value={formData.client_phone || ''}
                  onChange={e => updateField('client_phone', e.target.value)}
                  className="input-industrial"
                  placeholder="+48 123 456 789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nr Faktury</label>
                <input
                  type="text"
                  value={formData.invoice_number || ''}
                  onChange={e => updateField('invoice_number', e.target.value)}
                  className="input-industrial"
                  placeholder="FV/2025/001"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Product Info */}
          <div className="border-b border-border pb-4">
            <h2 className="font-semibold mb-4 text-lg">📦 Produkt</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nazwa Produktu *</label>
                <input
                  type="text"
                  value={formData.product_name || ''}
                  onChange={e => updateField('product_name', e.target.value)}
                  className="input-industrial"
                  placeholder="Kieszonka A4 spacewall V2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ilość (szt.)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity || 1}
                  onChange={e => updateField('quantity', parseInt(e.target.value) || 1)}
                  className="input-industrial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cena za sztukę (zł)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_per_unit || 0}
                  onChange={e => updateField('price_per_unit', parseFloat(e.target.value) || 0)}
                  className="input-industrial"
                />
              </div>
              <div className="md:col-span-3 bg-primary/10 p-4 rounded-lg">
                <label className="block text-sm font-medium mb-2">💰 Wartość Całkowita</label>
                <div className="text-3xl font-bold text-primary">
                  {formData.price_total?.toFixed(2) || '0.00'} zł
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Obliczana automatycznie: {formData.quantity || 0} × {formData.price_per_unit?.toFixed(2) || '0.00'} zł
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Documents & Shipping */}
          <div className="border-b border-border pb-4">
            <h2 className="font-semibold mb-4 text-lg">📁 Dokumentacja i Wysyłka</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Folder Produkcyjny (Google Drive)</label>
                <input
                  type="url"
                  value={formData.folder_path || ''}
                  onChange={e => updateField('folder_path', e.target.value)}
                  className="input-industrial"
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Rysunki, specyfikacje, pliki produkcyjne
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nr Listu Przewozowego (Apaczka)</label>
                <input
                  type="text"
                  value={formData.shipment_number || ''}
                  onChange={e => updateField('shipment_number', e.target.value)}
                  className="input-industrial"
                  placeholder="1Z999AA10123456784"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Wypełniane automatycznie po zamówieniu kuriera
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Sposób Pakowania</label>
                <textarea
                  value={formData.packaging_info || ''}
                  onChange={e => updateField('packaging_info', e.target.value)}
                  className="input-industrial min-h-[80px]"
                  placeholder="Np. Folia bąbelkowa, karton 600x400x300, paletizacja..."
                />
              </div>
            </div>
          </div>

          {/* Section 5: Notes */}
          <div>
            <h2 className="font-semibold mb-4 text-lg">📝 Uwagi</h2>
            <textarea
              value={formData.notes || ''}
              onChange={e => updateField('notes', e.target.value)}
              className="input-industrial min-h-[100px]"
              placeholder="Dodatkowe informacje o zleceniu..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary flex-1 sm:flex-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  {isEdit ? 'Zapisz zmiany' : 'Utwórz zlecenie'}
                </>
              )}
            </button>
            <button
              onClick={() => navigate('/manager/orders')}
              disabled={loading}
              className="btn-secondary flex-1 sm:flex-none"
            >
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
