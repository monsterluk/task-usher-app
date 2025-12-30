import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Plus,
  X,
  Package,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  CalendarDays,
  Users
} from 'lucide-react';
import { calendarApi, isDemoMode } from '@/utils/api';
import { useApp } from '@/context/AppContext';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  type: 'order' | 'maintenance' | 'meeting' | 'deadline';
  orderId?: number;
  color?: string;
  status?: string;
}

interface NewEventForm {
  title: string;
  description: string;
  date: string;
  type: string;
}

const ProductionCalendar = () => {
  const { orders } = useApp();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    deadline: true,
    maintenance: true,
    meeting: true,
    order: true
  });
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    description: '',
    date: '',
    type: 'meeting'
  });

  useEffect(() => {
    loadEvents();
  }, [currentDate, filters]);

  const loadEvents = async () => {
    if (isDemoMode()) {
      loadDemoEvents();
      return;
    }

    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const activeTypes = Object.entries(filters)
        .filter(([_, active]) => active)
        .map(([type]) => type)
        .join(',');

      const response = await calendarApi.getEvents({
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
        types: activeTypes
      });
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
      loadDemoEvents();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoEvents = () => {
    const demoEvents: CalendarEvent[] = [];

    // Generate events from orders
    orders.forEach(order => {
      if (order.planned_completion_date) {
        demoEvents.push({
          id: `order-${order.id}`,
          title: `${order.order_number}: ${order.product_name}`,
          description: `Klient: ${order.client_name}`,
          start: order.planned_completion_date,
          end: order.planned_completion_date,
          allDay: true,
          type: 'deadline',
          orderId: order.id,
          color: getOrderColor(order.priority, order.status),
          status: order.status
        });
      }
    });

    // Add some demo maintenance events
    const today = new Date();
    demoEvents.push({
      id: 'maint-1',
      title: 'Konserwacja: CNC Router',
      description: 'Przeglad okresowy',
      start: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(),
      end: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(),
      allDay: true,
      type: 'maintenance',
      color: '#f59e0b'
    });

    demoEvents.push({
      id: 'maint-2',
      title: 'Konserwacja: Laser',
      description: 'Wymiana filtra',
      start: new Date(today.getFullYear(), today.getMonth(), 22).toISOString(),
      end: new Date(today.getFullYear(), today.getMonth(), 22).toISOString(),
      allDay: true,
      type: 'maintenance',
      color: '#f59e0b'
    });

    // Filter by active filters
    const filtered = demoEvents.filter(e => filters[e.type as keyof typeof filters]);
    setEvents(filtered);
    setLoading(false);
  };

  const getOrderColor = (priority: string, status: string): string => {
    if (status === 'GOTOWE') return '#10b981';
    if (status === 'WSTRZYMANE') return '#6b7280';

    switch (priority) {
      case 'KRYTYCZNY': return '#ef4444';
      case 'WYSOKI': return '#f97316';
      case 'NORMALNY': return '#3b82f6';
      case 'NISKI': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysCount; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month days (fill to 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    return events.filter(e => {
      const eventDate = new Date(e.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setNewEvent({
      ...newEvent,
      date: date.toISOString().split('T')[0]
    });
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;

    if (isDemoMode()) {
      const event: CalendarEvent = {
        id: `custom-${Date.now()}`,
        title: newEvent.title,
        description: newEvent.description,
        start: new Date(newEvent.date).toISOString(),
        end: new Date(newEvent.date).toISOString(),
        allDay: true,
        type: newEvent.type as 'meeting',
        color: newEvent.type === 'meeting' ? '#8b5cf6' : '#3b82f6'
      };
      setEvents([...events, event]);
      setShowEventModal(false);
      setNewEvent({ title: '', description: '', date: '', type: 'meeting' });
      return;
    }

    try {
      await calendarApi.createEvent({
        title: newEvent.title,
        description: newEvent.description,
        start: new Date(newEvent.date).toISOString(),
        type: newEvent.type
      });
      await loadEvents();
      setShowEventModal(false);
      setNewEvent({ title: '', description: '', date: '', type: 'meeting' });
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Nie udalo sie utworzyc wydarzenia');
    }
  };

  const monthNames = [
    'Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien'
  ];

  const dayNames = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Nd'];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays size={28} />
            Kalendarz produkcji
          </h1>
          <p className="text-muted-foreground">Planowanie i harmonogram</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-muted' : ''}`}
          >
            <Filter size={18} className="mr-2" />
            Filtry
          </button>
          <button
            onClick={() => setShowEventModal(true)}
            className="btn-primary"
          >
            <Plus size={18} className="mr-2" />
            Dodaj wydarzenie
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card-industrial p-4">
          <h3 className="font-semibold mb-3">Pokaz wydarzenia:</h3>
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'deadline', label: 'Terminy zlecen', icon: Package, color: 'text-blue-600' },
              { key: 'maintenance', label: 'Konserwacje', icon: Wrench, color: 'text-yellow-600' },
              { key: 'meeting', label: 'Spotkania', icon: Users, color: 'text-purple-600' },
              { key: 'order', label: 'Zlecenia', icon: CheckCircle, color: 'text-green-600' }
            ].map(filter => (
              <label key={filter.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters[filter.key as keyof typeof filters]}
                  onChange={(e) => setFilters({ ...filters, [filter.key]: e.target.checked })}
                  className="w-4 h-4"
                />
                <filter.icon size={16} className={filter.color} />
                <span>{filter.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2 card-industrial">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-bold min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleToday}
                className="btn-secondary text-sm"
              >
                Dzisiaj
              </button>
              <button
                onClick={loadEvents}
                disabled={loading}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Day headers */}
            {dayNames.map(day => (
              <div
                key={day}
                className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {daysInMonth.map(({ date, isCurrentMonth }, index) => {
              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === today.toDateString();
              const isSelected = selectedDate?.toDateString() === date.toDateString();

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={`min-h-[100px] p-2 bg-card cursor-pointer transition-colors ${
                    !isCurrentMonth ? 'opacity-40' : ''
                  } ${isSelected ? 'ring-2 ring-primary ring-inset' : ''} hover:bg-muted/50`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center' : ''
                  }`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className="text-xs p-1 rounded truncate"
                        style={{ backgroundColor: event.color + '20', color: event.color }}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} wiecej
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Selected Date Events */}
        <div className="card-industrial">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Clock size={18} />
            {selectedDate
              ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}`
              : 'Wybierz date'}
          </h3>

          {selectedDate ? (
            selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map(event => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border-l-4"
                    style={{ borderColor: event.color, backgroundColor: event.color + '10' }}
                  >
                    <div className="flex items-start gap-2">
                      {event.type === 'deadline' && <Package size={16} className="mt-0.5" style={{ color: event.color }} />}
                      {event.type === 'maintenance' && <Wrench size={16} className="mt-0.5" style={{ color: event.color }} />}
                      {event.type === 'meeting' && <Users size={16} className="mt-0.5" style={{ color: event.color }} />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                        )}
                        {event.status && (
                          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${
                            event.status === 'GOTOWE' ? 'bg-green-100 text-green-800' :
                            event.status === 'W_TRAKCIE' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.status === 'GOTOWE' ? 'Gotowe' :
                             event.status === 'W_TRAKCIE' ? 'W trakcie' :
                             event.status === 'NOWE' ? 'Nowe' : event.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar size={40} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Brak wydarzen na ten dzien</p>
                <button
                  onClick={() => setShowEventModal(true)}
                  className="btn-secondary mt-3 text-sm"
                >
                  <Plus size={16} className="mr-1" />
                  Dodaj wydarzenie
                </button>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar size={40} className="mx-auto mb-3 opacity-50" />
              <p>Kliknij na date w kalendarzu</p>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2">Legenda:</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span>Priorytet krytyczny</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }} />
                <span>Priorytet wysoki</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} />
                <span>Priorytet normalny</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
                <span>Konserwacja</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} />
                <span>Zakonczone</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nowe wydarzenie</h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tytul *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="input-industrial w-full"
                  placeholder="Nazwa wydarzenia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data *</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="input-industrial w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Typ</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="input-industrial w-full"
                >
                  <option value="meeting">Spotkanie</option>
                  <option value="deadline">Termin</option>
                  <option value="maintenance">Konserwacja</option>
                  <option value="other">Inne</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Opis</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="input-industrial w-full h-20 resize-none"
                  placeholder="Opis wydarzenia (opcjonalnie)"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="btn-secondary flex-1"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={!newEvent.title.trim() || !newEvent.date}
                  className="btn-primary flex-1"
                >
                  <Plus size={16} className="mr-2" />
                  Utworz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionCalendar;
