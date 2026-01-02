import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Palette, FileCheck, LogOut, ClipboardList, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClockWidget from '@/components/TimeTracking/ClockWidget';
import { stagesApi } from '@/utils/api';

// Lista zleceń do przygotowania graficznego
const GrafikOrders = () => {
  const { orders, setOrders, currentUser, refreshOrders, demoMode } = useApp();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper: Get stage ID for GRAFIK stage
  // Note: API returns 'id' but frontend type has 'stageId' - check both
  const getGrafikStageId = (orderId: number): number | null => {
    const order = orders.find(o => o.id === orderId);
    const grafikStage = order?.stages?.find(s =>
      s.stageName === 'GRAFIK' || (s as any).stage_name === 'GRAFIK'
    );
    // API returns 'id', frontend type has 'stageId'
    return grafikStage?.stageId || (grafikStage as any)?.id || null;
  };

  // Helper: check if stage is GRAFIK (handles both stageName and stage_name from API)
  const isGrafikStage = (s: any) => s.stageName === 'GRAFIK' || s.stage_name === 'GRAFIK';

  // Zlecenia wymagające przygotowania graficznego (etap GRAFIK w statusie pending/NOWY)
  const pendingOrders = orders.filter(o =>
    !o.archived &&
    o.stages?.some(s => isGrafikStage(s) && (s.status === 'pending' || s.status === 'NOWY'))
  );

  const inProgressOrders = orders.filter(o =>
    !o.archived &&
    o.stages?.some(s => isGrafikStage(s) && (s.status === 'in_progress' || s.status === 'W_TRAKCIE'))
  );

  const completedOrders = orders.filter(o =>
    !o.archived &&
    o.stages?.some(s => isGrafikStage(s) && (s.status === 'completed' || s.status === 'GOTOWY' || s.status === 'ZAKONCZONE'))
  ).slice(0, 10); // ostatnie 10

  const markAsCompleted = async (orderId: number) => {
    const stageId = getGrafikStageId(orderId);

    if (!stageId) {
      setError('Nie znaleziono etapu GRAFIK');
      return;
    }

    setLoading(orderId);
    setError(null);

    try {
      if (!demoMode) {
        // Call API to update stage status to GOTOWY
        // Backend will automatically set order status to DO_PRODUKCJI
        await stagesApi.update(stageId, { status: 'GOTOWY' });
        // Refresh orders to get updated data from server
        await refreshOrders();
      } else {
        // Demo mode - update local state only
        setOrders(prev => prev.map(o => {
          if (o.id === orderId && o.stages) {
            return {
              ...o,
              status: 'DO_PRODUKCJI' as const, // Ready for production, not started yet
              stages: o.stages.map(s =>
                s.stageName === 'GRAFIK'
                  ? { ...s, status: 'completed' as const, assignedWorkers: [currentUser?.id || 0] }
                  : s
              )
            };
          }
          return o;
        }));
      }
    } catch (err: any) {
      console.error('Error marking stage as completed:', err);
      setError(err.response?.data?.message || 'Błąd podczas zapisywania');
    } finally {
      setLoading(null);
    }
  };

  const markAsInProgress = async (orderId: number) => {
    const stageId = getGrafikStageId(orderId);

    if (!stageId) {
      setError('Nie znaleziono etapu GRAFIK');
      return;
    }

    setLoading(orderId);
    setError(null);

    try {
      if (!demoMode) {
        // Call API to update stage status
        await stagesApi.update(stageId, { status: 'W_TRAKCIE' });
        // Refresh orders to get updated data from server
        await refreshOrders();
      } else {
        // Demo mode - update local state only
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
      }
    } catch (err: any) {
      console.error('Error marking stage as in progress:', err);
      setError(err.response?.data?.message || 'Błąd podczas zapisywania');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Moje zlecenia do przygotowania</h2>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

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
                    disabled={loading === order.id}
                    className="btn-primary disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading === order.id && <Loader2 size={16} className="animate-spin" />}
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
                    disabled={loading === order.id}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading === order.id && <Loader2 size={16} className="animate-spin" />}
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
        {/* Clock Widget - rejestracja czasu pracy */}
        <div className="mb-6">
          <ClockWidget />
        </div>
        <Routes>
          <Route path="/" element={<GrafikOrders />} />
          <Route path="*" element={<GrafikOrders />} />
        </Routes>
      </main>
    </div>
  );
};

export default GrafikDashboard;
