import { useState, useEffect, useCallback } from 'react';
import { traceabilityApi, isDemoMode } from '@/utils/api';
import {
  History,
  Clock,
  Package,
  User,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Truck,
  FileText,
  Settings,
  ArrowRight
} from 'lucide-react';

interface TraceabilityEvent {
  id: number;
  event_type: string;
  description: string;
  created_by_name: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface TraceabilityTabProps {
  orderId: number;
}

const EVENT_ICONS: Record<string, any> = {
  'ORDER_CREATED': Package,
  'ORDER_UPDATED': Settings,
  'STATUS_CHANGED': ArrowRight,
  'STAGE_STARTED': Play,
  'STAGE_COMPLETED': CheckCircle,
  'STAGE_PAUSED': Pause,
  'WORKER_ASSIGNED': User,
  'QUALITY_CHECK': FileText,
  'DEFECT_REPORTED': AlertCircle,
  'SHIPMENT_CREATED': Truck,
  'INVOICE_CREATED': FileText,
  'MATERIAL_ADDED': Package,
  'MATERIAL_CONSUMED': Package,
};

const EVENT_COLORS: Record<string, string> = {
  'ORDER_CREATED': 'bg-blue-500',
  'ORDER_UPDATED': 'bg-gray-500',
  'STATUS_CHANGED': 'bg-purple-500',
  'STAGE_STARTED': 'bg-green-500',
  'STAGE_COMPLETED': 'bg-green-600',
  'STAGE_PAUSED': 'bg-yellow-500',
  'WORKER_ASSIGNED': 'bg-blue-400',
  'QUALITY_CHECK': 'bg-indigo-500',
  'DEFECT_REPORTED': 'bg-red-500',
  'SHIPMENT_CREATED': 'bg-orange-500',
  'INVOICE_CREATED': 'bg-teal-500',
  'MATERIAL_ADDED': 'bg-cyan-500',
  'MATERIAL_CONSUMED': 'bg-cyan-600',
};

const EVENT_LABELS: Record<string, string> = {
  'ORDER_CREATED': 'Utworzono zlecenie',
  'ORDER_UPDATED': 'Zaktualizowano zlecenie',
  'STATUS_CHANGED': 'Zmiana statusu',
  'STAGE_STARTED': 'Rozpoczeto etap',
  'STAGE_COMPLETED': 'Ukonczono etap',
  'STAGE_PAUSED': 'Wstrzymano etap',
  'WORKER_ASSIGNED': 'Przypisano pracownika',
  'QUALITY_CHECK': 'Kontrola jakosci',
  'DEFECT_REPORTED': 'Zgloszono defekt',
  'SHIPMENT_CREATED': 'Utworzono wysylke',
  'INVOICE_CREATED': 'Wystawiono fakture',
  'MATERIAL_ADDED': 'Dodano material',
  'MATERIAL_CONSUMED': 'Zuzyto material',
};

const TraceabilityTab = ({ orderId }: TraceabilityTabProps) => {
  const [events, setEvents] = useState<TraceabilityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const demoMode = isDemoMode();

  const loadEvents = useCallback(async () => {
    if (demoMode) {
      // Demo data
      const now = new Date();
      setEvents([
        {
          id: 1,
          event_type: 'ORDER_CREATED',
          description: 'Zlecenie zostalo utworzone',
          created_by_name: 'Jan Kowalski',
          metadata: { order_number: 'ZLC-2024-001' },
          created_at: new Date(now.getTime() - 7 * 24 * 3600000).toISOString(),
        },
        {
          id: 2,
          event_type: 'WORKER_ASSIGNED',
          description: 'Przypisano pracownika do etapu FREZOWANIE',
          created_by_name: 'Jan Kowalski',
          metadata: { worker_name: 'Adam Nowak', stage_name: 'FREZOWANIE' },
          created_at: new Date(now.getTime() - 6 * 24 * 3600000).toISOString(),
        },
        {
          id: 3,
          event_type: 'STAGE_STARTED',
          description: 'Rozpoczeto etap FREZOWANIE',
          created_by_name: 'Adam Nowak',
          metadata: { stage_name: 'FREZOWANIE' },
          created_at: new Date(now.getTime() - 5 * 24 * 3600000).toISOString(),
        },
        {
          id: 4,
          event_type: 'MATERIAL_ADDED',
          description: 'Dodano material: Plexi bezbarwna 5mm',
          created_by_name: 'Jan Kowalski',
          metadata: { material_name: 'Plexi bezbarwna 5mm', quantity: 2, unit: 'm2' },
          created_at: new Date(now.getTime() - 5 * 24 * 3600000 + 3600000).toISOString(),
        },
        {
          id: 5,
          event_type: 'STAGE_COMPLETED',
          description: 'Ukonczono etap FREZOWANIE',
          created_by_name: 'Adam Nowak',
          metadata: { stage_name: 'FREZOWANIE', duration_hours: 4.5 },
          created_at: new Date(now.getTime() - 4 * 24 * 3600000).toISOString(),
        },
        {
          id: 6,
          event_type: 'QUALITY_CHECK',
          description: 'Przeprowadzono kontrole jakosci - PASSED',
          created_by_name: 'Piotr Wisniewski',
          metadata: { status: 'passed', check_type: 'in_process' },
          created_at: new Date(now.getTime() - 3 * 24 * 3600000).toISOString(),
        },
        {
          id: 7,
          event_type: 'STATUS_CHANGED',
          description: 'Zmieniono status z W TRAKCIE na GOTOWE',
          created_by_name: 'Jan Kowalski',
          metadata: { old_status: 'W TRAKCIE', new_status: 'GOTOWE' },
          created_at: new Date(now.getTime() - 1 * 24 * 3600000).toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await traceabilityApi.getOrderEvents(orderId);
      if (response.success && response.data?.events) {
        setEvents(response.data.events);
      }
    } catch (error: any) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId, demoMode]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.event_type === filter);

  const eventTypes = [...new Set(events.map(e => e.event_type))];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'przed chwila';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Ladowanie historii...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={20} />
          <h3 className="font-bold">Historia zlecenia (Traceability)</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtruj:</span>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="input-industrial py-1 px-2 text-sm"
          >
            <option value="all">Wszystkie ({events.length})</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>
                {EVENT_LABELS[type] || type} ({events.filter(e => e.event_type === type).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {eventTypes.slice(0, 5).map(type => {
          const count = events.filter(e => e.event_type === type).length;
          const Icon = EVENT_ICONS[type] || Clock;
          return (
            <div
              key={type}
              className="flex items-center gap-1 px-2 py-1 bg-muted/30 rounded text-xs"
            >
              <Icon size={12} />
              <span>{EVENT_LABELS[type] || type}: {count}</span>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History size={32} className="mx-auto mb-2 opacity-50" />
          <p>Brak wydarzen do wyswietlenia</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>

          {/* Events */}
          <div className="space-y-4">
            {filteredEvents.map((event, index) => {
              const Icon = EVENT_ICONS[event.event_type] || Clock;
              const color = EVENT_COLORS[event.event_type] || 'bg-gray-500';

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Icon circle */}
                  <div className={`absolute left-0 w-8 h-8 rounded-full ${color} flex items-center justify-center`}>
                    <Icon size={16} className="text-white" />
                  </div>

                  {/* Content */}
                  <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <span className="font-medium text-sm">
                          {EVENT_LABELS[event.event_type] || event.event_type}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          przez {event.created_by_name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {getRelativeTime(event.created_at)}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">{event.description}</p>

                    {/* Metadata */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-1.5 py-0.5 bg-background rounded text-xs"
                          >
                            {key.replace(/_/g, ' ')}: <strong>{String(value)}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatDate(event.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-3 bg-muted/20 rounded-lg">
        <p className="text-xs font-medium mb-2">Legenda:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_LABELS).slice(0, 8).map(([type, label]) => {
            const Icon = EVENT_ICONS[type] || Clock;
            const color = EVENT_COLORS[type] || 'bg-gray-500';
            return (
              <div key={type} className="flex items-center gap-1 text-xs">
                <div className={`w-4 h-4 rounded-full ${color} flex items-center justify-center`}>
                  <Icon size={10} className="text-white" />
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TraceabilityTab;
