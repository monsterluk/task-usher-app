import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ordersApi, orderItemsApi, isDemoMode } from '@/utils/api';
import { Order, OrderPriority, PRIORITY_LABELS } from '@/types';
import { generateOrderNumber } from '@/data/mockData';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

// Typ dla pozycji zlecenia
interface OrderItem {
  id?: number;
  product_name: string;
  description?: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  price_total: number;
  notes?: string;
}

const OrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, refreshOrders, workers, orders, setOrders } = useApp();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);

  // Automatyczne generowanie numeru zlecenia dla nowych zleceń
  const autoOrderNumber = !isEdit ? generateOrderNumber(orders) : '';

  // Stan dla pozycji zlecenia
  const [items, setItems] = useState<OrderItem[]>([
    { product_name: '', quantity: 1, unit: 'szt.', price_per_unit: 0, price_total: 0 }
  ]);

  const [formData, setFormData] = useState<Partial<Order>>({
    order_number: autoOrderNumber,
    client_order_number: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    client_postal: '',
    client_city: '',
    product_name: '', // Zachowujemy dla kompatybilności wstecznej
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
    priority: 'NORMAL' as OrderPriority,
  });

  // Funkcje do zarządzania pozycjami
  const addItem = () => {
    setItems(prev => [...prev, { product_name: '', quantity: 1, unit: 'szt.', price_per_unit: 0, price_total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Automatyczne przeliczenie ceny całkowitej pozycji
      if (field === 'quantity' || field === 'price_per_unit') {
        updated[index].price_total = (updated[index].quantity || 0) * (updated[index].price_per_unit || 0);
      }
      return updated;
    });
  };

  // Oblicz sumę całkowitą ze wszystkich pozycji
  const totalPrice = items.reduce((sum, item) => sum + (item.price_total || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Zaktualizuj numer przy zmianie isEdit lub orders
  useEffect(() => {
    if (!isEdit && !formData.order_number) {
      setFormData(prev => ({ ...prev, order_number: generateOrderNumber(orders) }));
    }
  }, [isEdit, orders]);

  // Load existing order data if editing
  useEffect(() => {
    const loadOrder = async () => {
      if (isEdit && id) {
        setLoading(true);

        // W trybie demo - pobierz z lokalnego stanu
        if (isDemoMode()) {
          const existingOrder = orders.find(o => o.id === Number(id));
          if (existingOrder) {
            setFormData(existingOrder);
            // W trybie demo utwórz jedną pozycję z danych zlecenia
            if (existingOrder.product_name) {
              setItems([{
                product_name: existingOrder.product_name,
                quantity: existingOrder.quantity || 1,
                unit: 'szt.',
                price_per_unit: existingOrder.price_per_unit || 0,
                price_total: existingOrder.price_total || 0
              }]);
            }
          }
          setLoading(false);
          return;
        }

        try {
          const response = await ordersApi.getById(Number(id));
          if (response.success && response.data?.order) {
            setFormData(response.data.order);
          }

          // Załaduj pozycje zlecenia
          try {
            const itemsResponse = await orderItemsApi.getOrderItems(Number(id));
            if (itemsResponse.success && itemsResponse.data?.items?.length > 0) {
              setItems(itemsResponse.data.items.map((item: any) => ({
                id: item.id,
                product_name: item.product_name,
                description: item.description,
                quantity: item.quantity || 1,
                unit: item.unit || 'szt.',
                price_per_unit: parseFloat(item.price_per_unit) || 0,
                price_total: parseFloat(item.price_total) || 0,
                notes: item.notes
              })));
            } else if (response.data?.order?.product_name) {
              // Fallback - jeśli nie ma pozycji, utwórz jedną z danych zlecenia
              setItems([{
                product_name: response.data.order.product_name,
                quantity: response.data.order.quantity || 1,
                unit: 'szt.',
                price_per_unit: parseFloat(response.data.order.price_per_unit) || 0,
                price_total: parseFloat(response.data.order.price_total) || 0
              }]);
            }
          } catch (itemsError) {
            console.error('Failed to load order items:', itemsError);
          }
        } catch (error) {
          // Fallback do lokalnego stanu
          const existingOrder = orders.find(o => o.id === Number(id));
          if (existingOrder) {
            setFormData(existingOrder);
            if (existingOrder.product_name) {
              setItems([{
                product_name: existingOrder.product_name,
                quantity: existingOrder.quantity || 1,
                unit: 'szt.',
                price_per_unit: existingOrder.price_per_unit || 0,
                price_total: existingOrder.price_total || 0
              }]);
            }
          } else {
            toast.error('Nie udało się pobrać zlecenia');
          }
        } finally {
          setLoading(false);
        }
      }
    };
    loadOrder();
  }, [isEdit, id, orders]);

  const handleSave = async () => {
    // Walidacja - sprawdź czy jest przynajmniej jedna pozycja z nazwą produktu
    const validItems = items.filter(item => item.product_name.trim());
    if (!formData.order_number || !formData.client_name || validItems.length === 0) {
      toast.error('Wypełnij wymagane pola (nr zlecenia, klient, min. 1 pozycja z nazwą produktu)');
      return;
    }

    setLoading(true);

    // Przygotuj dane zlecenia z pierwszą pozycją jako głównym produktem (dla kompatybilności)
    const orderData = {
      ...formData,
      product_name: validItems[0].product_name,
      quantity: totalQuantity,
      price_total: totalPrice,
      price_per_unit: validItems.length === 1 ? validItems[0].price_per_unit : 0
    };

    // W trybie demo - zapisz lokalnie
    if (isDemoMode()) {
      if (isEdit && id) {
        setOrders(prev => prev.map(o =>
          o.id === Number(id) ? { ...o, ...orderData } as Order : o
        ));
        toast.success('Zlecenie zaktualizowane');
      } else {
        const newOrder: Order = {
          id: Math.max(0, ...orders.map(o => o.id)) + 1,
          order_number: orderData.order_number!,
          client_order_number: orderData.client_order_number,
          client_name: orderData.client_name!,
          client_email: orderData.client_email,
          client_phone: orderData.client_phone,
          client_address: orderData.client_address,
          client_postal: orderData.client_postal,
          client_city: orderData.client_city,
          product_name: orderData.product_name!,
          quantity: orderData.quantity || 1,
          price_total: orderData.price_total,
          price_per_unit: orderData.price_per_unit,
          status: 'NOWE',
          planned_completion_date: orderData.planned_completion_date || new Date().toISOString().split('T')[0],
          notes: orderData.notes,
          folder_path: orderData.folder_path,
          invoice_number: orderData.invoice_number,
          created_by: currentUser?.name,
          created_at: new Date().toISOString(),
          archived: false,
          stages: []
        };
        setOrders(prev => [...prev, newOrder]);
        toast.success(`Zlecenie utworzone z ${validItems.length} pozycją/ami!`);
      }
      setLoading(false);
      navigate('/manager/orders');
      return;
    }

    // Tryb z API
    try {
      if (isEdit && id) {
        const response = await ordersApi.update(Number(id), orderData);
        if (response.success) {
          // Aktualizuj pozycje - usuń stare i dodaj nowe
          // (dla uproszczenia - w przyszłości można dodać bardziej inteligentną aktualizację)
          for (const item of validItems) {
            if (item.id) {
              // Aktualizuj istniejącą pozycję
              await orderItemsApi.update(item.id, {
                product_name: item.product_name,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                price_per_unit: item.price_per_unit,
                notes: item.notes
              });
            } else {
              // Dodaj nową pozycję
              await orderItemsApi.create(Number(id), {
                product_name: item.product_name,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                price_per_unit: item.price_per_unit,
                notes: item.notes
              });
            }
          }
          toast.success('Zlecenie zaktualizowane');
          await refreshOrders();
          navigate('/manager/orders');
        } else {
          toast.error(response.error || 'Błąd aktualizacji');
        }
      } else {
        // Tworzenie nowego zlecenia
        const response = await ordersApi.create(orderData as any);
        if (response.success && response.data?.order?.id) {
          const newOrderId = response.data.order.id;

          // Dodaj wszystkie pozycje do nowego zlecenia
          for (const item of validItems) {
            try {
              await orderItemsApi.create(newOrderId, {
                product_name: item.product_name,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                price_per_unit: item.price_per_unit,
                notes: item.notes
              });
            } catch (itemError) {
              console.error('Failed to create item:', itemError);
            }
          }

          toast.success(`Zlecenie utworzone z ${validItems.length} pozycją/ami!`);
          await refreshOrders();
          navigate('/manager/orders');
        } else {
          toast.error(response.error || 'Błąd tworzenia');
        }
      }
    } catch (error) {
      // Fallback do lokalnego zapisu w przypadku błędu
      if (isEdit && id) {
        setOrders(prev => prev.map(o =>
          o.id === Number(id) ? { ...o, ...orderData } as Order : o
        ));
        toast.success('Zlecenie zaktualizowane (lokalnie)');
      } else {
        const newOrder: Order = {
          id: Math.max(0, ...orders.map(o => o.id)) + 1,
          order_number: orderData.order_number!,
          client_name: orderData.client_name!,
          product_name: orderData.product_name!,
          quantity: orderData.quantity || 1,
          price_total: orderData.price_total,
          status: 'NOWE',
          planned_completion_date: orderData.planned_completion_date || new Date().toISOString().split('T')[0],
          notes: orderData.notes,
          created_by: currentUser?.name,
          created_at: new Date().toISOString(),
          archived: false,
          stages: []
        };
        setOrders(prev => [...prev, newOrder]);
        toast.success('Zlecenie utworzone (lokalnie)');
      }
      navigate('/manager/orders');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof Order, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
              <div>
                <label className="block text-sm font-medium mb-2">Priorytet</label>
                <select
                  value={formData.priority || 'NORMAL'}
                  onChange={e => updateField('priority', e.target.value as OrderPriority)}
                  className="input-industrial"
                >
                  {(Object.keys(PRIORITY_LABELS) as OrderPriority[]).map(priority => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Adres (ulica, nr domu)</label>
                <input
                  type="text"
                  value={formData.client_address || ''}
                  onChange={e => updateField('client_address', e.target.value)}
                  className="input-industrial"
                  placeholder="ul. Przykładowa 10/2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kod pocztowy</label>
                <input
                  type="text"
                  value={formData.client_postal || ''}
                  onChange={e => updateField('client_postal', e.target.value)}
                  className="input-industrial"
                  placeholder="00-000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Miasto</label>
                <input
                  type="text"
                  value={formData.client_city || ''}
                  onChange={e => updateField('client_city', e.target.value)}
                  className="input-industrial"
                  placeholder="Warszawa"
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

          {/* Section 3: Products/Items */}
          <div className="border-b border-border pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Package size={20} />
                Pozycje Zlecenia ({items.length})
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                Dodaj pozycję
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-muted/30 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm text-muted-foreground">
                      Pozycja {index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive/80 p-1"
                        title="Usuń pozycję"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Nazwa produktu */}
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium mb-1">Nazwa produktu *</label>
                      <input
                        type="text"
                        value={item.product_name}
                        onChange={e => updateItem(index, 'product_name', e.target.value)}
                        className="input-industrial text-sm"
                        placeholder="Kieszonka A4 spacewall V2"
                      />
                    </div>

                    {/* Ilość */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1">Ilość</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="input-industrial text-sm"
                      />
                    </div>

                    {/* Jednostka */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium mb-1">Jedn.</label>
                      <select
                        value={item.unit}
                        onChange={e => updateItem(index, 'unit', e.target.value)}
                        className="input-industrial text-sm"
                      >
                        <option value="szt.">szt.</option>
                        <option value="kpl.">kpl.</option>
                        <option value="m">m</option>
                        <option value="m²">m²</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>

                    {/* Cena za sztukę */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1">Cena/szt. (zł)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price_per_unit}
                        onChange={e => updateItem(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                        className="input-industrial text-sm"
                      />
                    </div>

                    {/* Wartość */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium mb-1">Wartość</label>
                      <div className="input-industrial bg-primary/10 text-primary font-semibold text-sm">
                        {Number(item.price_total || 0).toFixed(2)} zł
                      </div>
                    </div>
                  </div>

                  {/* Opis - opcjonalny */}
                  <div className="mt-2">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={e => updateItem(index, 'description', e.target.value)}
                      className="input-industrial text-sm w-full"
                      placeholder="Opis/uwagi do pozycji (opcjonalnie)"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Podsumowanie wartości */}
            <div className="mt-4 bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-muted-foreground">Suma pozycji: </span>
                  <span className="font-medium">{items.length}</span>
                  <span className="text-sm text-muted-foreground ml-4">Łączna ilość: </span>
                  <span className="font-medium">{totalQuantity}</span>
                </div>
                <div className="text-right">
                  <label className="block text-sm font-medium mb-1">💰 Wartość Całkowita</label>
                  <div className="text-3xl font-bold text-primary">
                    {totalPrice.toFixed(2)} zł
                  </div>
                </div>
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
