import { useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Palette, FileCheck, LogOut, ClipboardList, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Lista zleceń do przygotowania graficznego
const GrafikOrders = () => {
  const { orders, setOrders, currentUser } = useApp();

  // Zlecenia wymagające przygotowania graficznego (etap GRAFIK w statusie pending)
  const pendingOrders = orders.filter(o =>
    !o.archived &&
    o.stages?.some(s => s.stageName === 'GRAFIK' && s.status === 'pending')
  );

  const inProgressOrders = orders.filter(o =>
    !o.archived &&
    o.stages?.some(s => s.stageName === 'GRAFIK' && s.status === 'in_progress')
  );

  const completedOrders = orders.filter(o =>
    !o.archived &&
    o.stages?.some(s => s.stageName === 'GRAFIK' && s.status === 'completed')
  ).slice(0, 10); // ostatnie 10

  const markAsCompleted = (orderId: number) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId && o.stages) {
        return {
          ...o,
          stages: o.stages.map(s =>
            s.stageName === 'GRAFIK'
              ? { ...s, status: 'completed' as const, assignedWorkers: [currentUser?.id || 0] }
              : s
          )
        };
      }
      return o;
    }));
  };

  const markAsInProgress = (orderId: number) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId && o.stages) {
        return {
          ...o,
          status: 'W_TRAKCIE' as const,
          stages: o.stages.map(s =>
            s.stageName === 'GRAFIK'
              ? { ...s, status: 'in_progress' as const, assignedWorkers: [currentUser?.id || 0] }
              : s
          )
        };
      }
      return o;
    }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Moje zlecenia do przygotowania</h2>

      {/* Oczekujące */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="text-yellow-500" />
            Oczekujące ({pendingOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <p className="text-muted-foreground">Brak zleceń do przygotowania</p>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">{order.product_name}</p>
                    <p className="text-sm text-muted-foreground">{order.client_name}</p>
                  </div>
                  <button
                    onClick={() => markAsInProgress(order.id)}
                    className="btn-primary"
                  >
                    Rozpocznij
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* W trakcie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="text-blue-500" />
            W trakcie ({inProgressOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inProgressOrders.length === 0 ? (
            <p className="text-muted-foreground">Brak zleceń w trakcie</p>
          ) : (
            <div className="space-y-3">
              {inProgressOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">{order.product_name}</p>
                    <p className="text-sm text-muted-foreground">{order.client_name}</p>
                    {order.folder_path && (
                      <p className="text-xs text-blue-600 mt-1">Folder: {order.folder_path}</p>
                    )}
                  </div>
                  <button
                    onClick={() => markAsCompleted(order.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    Zakończ
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zakończone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="text-green-500" />
            Ostatnio zakończone ({completedOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedOrders.length === 0 ? (
            <p className="text-muted-foreground">Brak zakończonych zleceń</p>
          ) : (
            <div className="space-y-2">
              {completedOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">{order.product_name}</p>
                  </div>
                  <span className="text-green-600 text-sm">Gotowe</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const GrafikDashboard = () => {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Sprawdź czy użytkownik jest zalogowany i ma odpowiednią rolę
    if (!currentUser) {
      navigate('/');
      return;
    }
    if (currentUser.role !== 'GRAFIK' && currentUser.role !== 'ADMIN') {
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
                <Palette className="text-primary" size={24} />
                <h1 className="text-xl font-bold">
                  PLEXI<span className="font-normal">SYSTEM</span>
                </h1>
              </div>
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                Panel Grafika
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
          <Route path="/" element={<GrafikOrders />} />
          <Route path="*" element={<GrafikOrders />} />
        </Routes>
      </main>
    </div>
  );
};

export default GrafikDashboard;
