import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order, PRIORITY_LABELS, PRIORITY_COLORS, OrderPriority } from '@/types';

type ViewMode = 'day' | 'week' | 'month';

const GanttChart = () => {
  const { orders } = useApp();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7); // Start a week ago
    return today;
  });

  // Filter active orders only
  const activeOrders = useMemo(() =>
    orders.filter(o => !o.archived && o.status !== 'GOTOWE')
      .sort((a, b) => {
        // Sort by priority first, then by date
        const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        const aPriority = priorityOrder[a.priority || 'NORMAL'] || 2;
        const bPriority = priorityOrder[b.priority || 'NORMAL'] || 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.planned_completion_date).getTime() - new Date(b.planned_completion_date).getTime();
      }),
    [orders]
  );

  // Calculate date range based on view mode
  const { days, cellWidth, dateFormat } = useMemo(() => {
    const daysCount = viewMode === 'day' ? 14 : viewMode === 'week' ? 28 : 60;
    const width = viewMode === 'day' ? 60 : viewMode === 'week' ? 40 : 20;
    const format = viewMode === 'day' ? 'dd' : viewMode === 'week' ? 'dd' : 'dd.MM';
    return { days: daysCount, cellWidth: width, dateFormat: format };
  }, [viewMode]);

  // Generate date headers
  const dateHeaders = useMemo(() => {
    const headers: Date[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      headers.push(date);
    }
    return headers;
  }, [startDate, days]);

  // Navigate dates
  const navigateDates = (direction: 'prev' | 'next') => {
    const offset = direction === 'prev' ? -7 : 7;
    setStartDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + offset);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    setStartDate(today);
  };

  // Calculate bar position and width for an order
  const getBarStyle = (order: Order) => {
    const orderDate = new Date(order.planned_completion_date);
    const createdDate = order.created_at ? new Date(order.created_at) : new Date();

    // Calculate days from start
    const startDiff = Math.floor((createdDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const endDiff = Math.floor((orderDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate width (minimum 1 day)
    const duration = Math.max(endDiff - startDiff, 1);

    // Position and width
    const left = Math.max(startDiff, 0) * cellWidth;
    const width = duration * cellWidth;

    // If bar is completely before visible range
    if (endDiff < 0) return null;
    // If bar starts after visible range
    if (startDiff > days) return null;

    return {
      left: `${left}px`,
      width: `${Math.min(width, (days - Math.max(startDiff, 0)) * cellWidth)}px`,
    };
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOWE': return 'bg-blue-500';
      case 'W_TRAKCIE': return 'bg-yellow-500';
      case 'GOTOWE': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get priority border color
  const getPriorityBorder = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return 'border-l-4 border-l-red-500';
      case 'HIGH': return 'border-l-4 border-l-orange-500';
      case 'LOW': return 'border-l-4 border-l-gray-400';
      default: return 'border-l-4 border-l-blue-500';
    }
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is weekend
  const isWeekend = (date: Date) => {
    return date.getDay() === 0 || date.getDay() === 6;
  };

  // Format date for header
  const formatDate = (date: Date) => {
    if (viewMode === 'day') {
      return date.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric' });
    } else if (viewMode === 'week') {
      return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    } else {
      return date.toLocaleDateString('pl-PL', { day: 'numeric' });
    }
  };

  // Get month headers for month view
  const monthHeaders = useMemo(() => {
    if (viewMode !== 'month') return [];
    const months: { name: string; span: number; start: number }[] = [];
    let currentMonth = -1;
    let currentSpan = 0;
    let currentStart = 0;

    dateHeaders.forEach((date, index) => {
      if (date.getMonth() !== currentMonth) {
        if (currentMonth !== -1) {
          months.push({
            name: new Date(dateHeaders[currentStart]).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }),
            span: currentSpan,
            start: currentStart
          });
        }
        currentMonth = date.getMonth();
        currentSpan = 1;
        currentStart = index;
      } else {
        currentSpan++;
      }
    });
    // Push last month
    if (currentSpan > 0) {
      months.push({
        name: new Date(dateHeaders[currentStart]).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }),
        span: currentSpan,
        start: currentStart
      });
    }
    return months;
  }, [dateHeaders, viewMode]);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/manager')}
            className="btn-secondary"
          >
            <ArrowLeft size={18} className="mr-2" />
            Dashboard
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">Wykres Gantta</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex bg-muted rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  viewMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'
                }`}
              >
                {mode === 'day' ? 'Dzien' : mode === 'week' ? 'Tydzien' : 'Miesiac'}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <button onClick={() => navigateDates('prev')} className="btn-secondary p-2">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToToday} className="btn-secondary px-3 py-2 text-sm">
            <Calendar size={16} className="mr-1" />
            Dzisiaj
          </button>
          <button onClick={() => navigateDates('next')} className="btn-secondary p-2">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Nowe</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> W trakcie</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> Gotowe</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Priorytet:</span>
          <span className="flex items-center gap-1"><span className="w-1 h-3 bg-red-500"></span> Pilny</span>
          <span className="flex items-center gap-1"><span className="w-1 h-3 bg-orange-500"></span> Wysoki</span>
          <span className="flex items-center gap-1"><span className="w-1 h-3 bg-blue-500"></span> Normalny</span>
          <span className="flex items-center gap-1"><span className="w-1 h-3 bg-gray-400"></span> Niski</span>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="card-industrial overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Month headers (only for month view) */}
            {viewMode === 'month' && monthHeaders.length > 0 && (
              <div className="flex border-b border-border">
                <div className="w-64 flex-shrink-0 p-2 bg-muted font-semibold text-sm">
                  Zlecenie
                </div>
                <div className="flex">
                  {monthHeaders.map((month, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-medium py-1 bg-muted border-r border-border"
                      style={{ width: `${month.span * cellWidth}px` }}
                    >
                      {month.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date headers */}
            <div className="flex border-b border-border sticky top-0 bg-background z-10">
              <div className="w-64 flex-shrink-0 p-2 bg-muted font-semibold text-sm border-r border-border">
                {viewMode === 'month' ? '' : 'Zlecenie'}
              </div>
              <div className="flex">
                {dateHeaders.map((date, i) => (
                  <div
                    key={i}
                    className={`text-center text-xs py-2 border-r border-border ${
                      isToday(date) ? 'bg-primary/20 font-bold' :
                      isWeekend(date) ? 'bg-muted/50' : ''
                    }`}
                    style={{ width: `${cellWidth}px` }}
                  >
                    {formatDate(date)}
                  </div>
                ))}
              </div>
            </div>

            {/* Orders rows */}
            {activeOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Brak aktywnych zlecen do wyswietlenia
              </div>
            ) : (
              activeOrders.map(order => {
                const barStyle = getBarStyle(order);

                return (
                  <div key={order.id} className="flex border-b border-border hover:bg-muted/30 group">
                    {/* Order info */}
                    <div
                      className="w-64 flex-shrink-0 p-2 border-r border-border cursor-pointer"
                      onClick={() => navigate(`/manager/orders/${order.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[order.priority as OrderPriority] || 'text-blue-600'}`}>
                          {PRIORITY_LABELS[order.priority as OrderPriority]?.[0] || 'N'}
                        </span>
                        <span className="font-mono text-sm font-semibold truncate">
                          {order.order_number}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {order.client_name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {order.product_name}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative flex-1" style={{ height: '60px' }}>
                      {/* Background grid */}
                      <div className="absolute inset-0 flex">
                        {dateHeaders.map((date, i) => (
                          <div
                            key={i}
                            className={`border-r border-border ${
                              isToday(date) ? 'bg-primary/10' :
                              isWeekend(date) ? 'bg-muted/30' : ''
                            }`}
                            style={{ width: `${cellWidth}px` }}
                          />
                        ))}
                      </div>

                      {/* Order bar */}
                      {barStyle && (
                        <div
                          className={`absolute top-3 h-8 rounded cursor-pointer transition-all
                            ${getStatusColor(order.status)} ${getPriorityBorder(order.priority)}
                            hover:ring-2 hover:ring-offset-1 hover:ring-primary`}
                          style={barStyle}
                          onClick={() => navigate(`/manager/orders/${order.id}`)}
                          title={`${order.order_number}: ${order.client_name} - ${order.product_name}
Termin: ${new Date(order.planned_completion_date).toLocaleDateString('pl-PL')}`}
                        >
                          <div className="px-2 py-1 text-xs text-white truncate">
                            {order.order_number}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
        <span>Aktywnych zlecen: <strong className="text-foreground">{activeOrders.length}</strong></span>
        <span>Pilnych: <strong className="text-red-500">{activeOrders.filter(o => o.priority === 'URGENT').length}</strong></span>
        <span>Wysokich: <strong className="text-orange-500">{activeOrders.filter(o => o.priority === 'HIGH').length}</strong></span>
      </div>
    </div>
  );
};

export default GanttChart;
