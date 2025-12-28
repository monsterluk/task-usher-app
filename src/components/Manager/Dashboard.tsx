import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Package,
  CheckCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const { orders, workers, timeEntries, loading } = useApp();
  const navigate = useNavigate();

  // KPI Calculations
  const activeOrders = orders.filter(o => !o.archived && o.status !== 'GOTOWE');
  const overdueOrders = activeOrders.filter(o => new Date(o.planned_completion_date) < new Date());
  const totalValue = activeOrders.reduce((sum, o) => sum + (o.price_total || 0), 0);
  const ordersInProgress = orders.filter(o => o.status === 'W_TRAKCIE').length;
  const ordersNew = orders.filter(o => o.status === 'NOWE').length;
  const ordersCompleted = orders.filter(o => o.status === 'GOTOWE' && !o.archived).length;
  const activeWorkers = workers.filter(w => w.active).length;

  // Recent orders
  const recentOrders = [...orders]
    .filter(o => !o.archived)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  // Orders due soon (next 3 days)
  const today = new Date();
  const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const ordersDueSoon = activeOrders
    .filter(o => {
      const deadline = new Date(o.planned_completion_date);
      return deadline >= today && deadline <= threeDaysFromNow;
    })
    .sort((a, b) => new Date(a.planned_completion_date).getTime() - new Date(b.planned_completion_date).getTime());

  interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
    onClick?: () => void;
  }

  const KPICard = ({ title, value, icon: Icon, color, subtitle, onClick }: KPICardProps) => (
    <div
      className={`card-industrial ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10`} style={{ backgroundColor: `${color.replace('text-', '')}20` }}>
          <Icon size={24} className={color} />
        </div>
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOWE': return 'bg-gray-400';
      case 'W_TRAKCIE': return 'bg-blue-500';
      case 'GOTOWE': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
        <span className="ml-2">Ładowanie...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Aktywne zlecenia"
          value={activeOrders.length}
          icon={ClipboardList}
          color="text-primary"
          subtitle={`${ordersNew} nowych, ${ordersInProgress} w trakcie`}
          onClick={() => navigate('/manager/orders')}
        />
        <KPICard
          title="Wartość w toku"
          value={`${totalValue.toLocaleString('pl-PL')} zł`}
          icon={TrendingUp}
          color="text-green-600"
        />
        <KPICard
          title="Przeterminowane"
          value={overdueOrders.length}
          icon={AlertTriangle}
          color={overdueOrders.length > 0 ? "text-red-500" : "text-green-600"}
          onClick={overdueOrders.length > 0 ? () => navigate('/manager/orders') : undefined}
        />
        <KPICard
          title="Aktywni pracownicy"
          value={activeWorkers}
          icon={Users}
          color="text-blue-600"
          onClick={() => navigate('/manager/workers')}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Zlecenia wg statusu</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-400"></div>
                  Nowe
                </span>
                <span className="font-bold">{ordersNew}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 rounded-full transition-all"
                  style={{ width: `${(ordersNew / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  W trakcie
                </span>
                <span className="font-bold">{ordersInProgress}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(ordersInProgress / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  Gotowe
                </span>
                <span className="font-bold">{ordersCompleted}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(ordersCompleted / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Orders */}
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className={overdueOrders.length > 0 ? "text-red-500" : "text-green-600"} size={20} />
              Przeterminowane zlecenia
            </h2>
          </div>
          {overdueOrders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-green-500 mb-2" size={48} />
              <p className="text-muted-foreground">Brak przeterminowanych zleceń</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueOrders.slice(0, 5).map(order => {
                const days = Math.abs(getDaysUntilDeadline(order.planned_completion_date));
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    onClick={() => navigate(`/manager/orders/${order.id}`)}
                  >
                    <div>
                      <span className="font-mono font-semibold">{order.order_number}</span>
                      <p className="text-sm text-muted-foreground">{order.client_name}</p>
                    </div>
                    <span className="text-sm text-red-600 font-medium">
                      {days} dni temu
                    </span>
                  </div>
                );
              })}
              {overdueOrders.length > 5 && (
                <button
                  onClick={() => navigate('/manager/orders')}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
                >
                  Zobacz wszystkie ({overdueOrders.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Orders Due Soon */}
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock size={20} />
              Zbliżające się terminy
            </h2>
          </div>
          {ordersDueSoon.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Brak zleceń z terminem w ciągu 3 dni</p>
          ) : (
            <div className="space-y-2">
              {ordersDueSoon.slice(0, 5).map(order => {
                const days = getDaysUntilDeadline(order.planned_completion_date);
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                    onClick={() => navigate(`/manager/orders/${order.id}`)}
                  >
                    <div>
                      <span className="font-mono font-semibold">{order.order_number}</span>
                      <p className="text-sm text-muted-foreground">{order.product_name}</p>
                    </div>
                    <span className={`text-sm font-medium ${days === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {days === 0 ? 'Dziś!' : `za ${days} dni`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="card-industrial">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package size={20} />
              Ostatnie zlecenia
            </h2>
            <button
              onClick={() => navigate('/manager/orders')}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Zobacz wszystkie <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {recentOrders.map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate(`/manager/orders/${order.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                  <div>
                    <span className="font-mono font-semibold">{order.order_number}</span>
                    <p className="text-sm text-muted-foreground">{order.client_name}</p>
                  </div>
                </div>
                <span className="text-sm font-medium">
                  {order.price_total?.toLocaleString('pl-PL')} zł
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
