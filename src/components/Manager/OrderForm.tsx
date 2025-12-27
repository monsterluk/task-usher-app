import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Order } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const OrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, setOrders, currentUser } = useApp();
  const isEdit = Boolean(id);
  const existingOrder = isEdit ? orders.find(o => o.id === Number(id)) : null;

  const [formData, setFormData] = useState<Partial<Order>>({
    order_number: '',
    client_order_number: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    product_name: '',
    quantity: 1,
    price_total: 0,
    price_per_unit: 0,
    planned_completion_date: '',
    notes: '',
    folder_path: '',
    invoice_number: '',
    invoice_date: '',
    shipment_number: '',
    shipment_status: 'OCZEKUJE',
    status: 'NOWE',
  });

  useEffect(() => {
    if (existingOrder) {
      setFormData(existingOrder);
    }
  }, [existingOrder]);

  const handleSave = () => {
    if (!formData.order_number || !formData.client_name || !formData.product_name) {
      toast.error('Wypełnij wymagane pola');
      return;
    }

    if (isEdit && existingOrder) {
      setOrders(prev => prev.map(o => 
        o.id === existingOrder.id ? { ...o, ...formData } as Order : o
      ));
      toast.success('Zlecenie zaktualizowane');
    } else {
      const newOrder: Order = {
        id: Math.max(...orders.map(o => o.id), 0) + 1,
        order_number: formData.order_number || '',
        client_name: formData.client_name || '',
        product_name: formData.product_name || '',
        quantity: formData.quantity || 1,
        status: 'NOWE',
        planned_completion_date: formData.planned_completion_date || new Date().toISOString().split('T')[0],
        stages: [],
        archived: false,
        created_by: currentUser?.name,
        created_at: new Date().toISOString(),
        ...formData
      };
      setOrders(prev => [...prev, newOrder]);
      toast.success('Zlecenie utworzone');
    }
    navigate('/manager/orders');
  };

  const updateField = (field: keyof Order, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
          {isEdit ? 'Edytuj Zlecenie' : 'Nowe Zlecenie'}
        </h1>

        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="font-semibold mb-4">Dane Klienta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nazwa Klienta *</label>
                <input type="text" value={formData.client_name || ''} onChange={e => updateField('client_name', e.target.value)} className="input-industrial" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email Klienta</label>
                <input type="email" value={formData.client_email || ''} onChange={e => updateField('client_email', e.target.value)} className="input-industrial" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefon</label>
                <input type="text" value={formData.client_phone || ''} onChange={e => updateField('client_phone', e.target.value)} className="input-industrial" />
              </div>
            </div>
          </div>

          <div className="border-b border-border pb-4">
            <h2 className="font-semibold mb-4">Dane Zlecenia</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nr Zlecenia Wewnętrzny *</label>
                <input type="text" value={formData.order_number || ''} onChange={e => updateField('order_number', e.target.value)} className="input-industrial" placeholder="1415/2025" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nr Zamówienia Klienta</label>
                <input type="text" value={formData.client_order_number || ''} onChange={e => updateField('client_order_number', e.target.value)} className="input-industrial" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Produkt *</label>
                <input type="text" value={formData.product_name || ''} onChange={e => updateField('product_name', e.target.value)} className="input-industrial" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ilość</label>
                <input type="number" value={formData.quantity || 1} onChange={e => updateField('quantity', parseInt(e.target.value) || 1)} className="input-industrial" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cena Całkowita (zł)</label>
                <input type="number" step="0.01" value={formData.price_total || 0} onChange={e => updateField('price_total', parseFloat(e.target.value) || 0)} className="input-industrial" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Termin Realizacji</label>
                <input type="date" value={formData.planned_completion_date || ''} onChange={e => updateField('planned_completion_date', e.target.value)} className="input-industrial" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Uwagi</label>
              <textarea value={formData.notes || ''} onChange={e => updateField('notes', e.target.value)} className="input-industrial min-h-[100px]" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} className="btn-primary">
              <Save size={18} className="mr-2" />
              Zapisz
            </button>
            <button onClick={() => navigate('/manager/orders')} className="btn-secondary">
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
