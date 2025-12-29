import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Briefcase, Plus, LogOut, ClipboardList, Package, Clock, CheckCircle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/types';
import { generateOrderNumber } from '@/data/mockData';

// Formularz nowego zlecenia (uproszczony dla handlowca)
const NewOrderForm = () => {
  const { orders, setOrders, currentUser } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    order_number: generateOrderNumber(orders),
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    navigate('/handlowiec/orders');
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

        <div className="flex gap-4">
          <button type="submit" className="btn-primary flex-1">
            Utwórz zlecenie
          </button>
          <button
            type="button"
            onClick={() => navigate('/handlowiec/orders')}
            className="btn-secondary"
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

  const activeOrders = orders.filter(o => !o.archived);

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

      {/* Statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
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
        <Card>
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
        <Card>
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
        <Card>
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
            {activeOrders.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">Brak aktywnych zleceń</p>
            ) : (
              activeOrders.map(order => (
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
                        {order.price_total && <span>Wartość: {order.price_total.toFixed(2)} zł</span>}
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
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <Eye size={20} className="text-muted-foreground" />
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

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
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
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<OrdersList />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/new" element={<NewOrderForm />} />
          <Route path="*" element={<OrdersList />} />
        </Routes>
      </main>
    </div>
  );
};

export default HandlowiecDashboard;
