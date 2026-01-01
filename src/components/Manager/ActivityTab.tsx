import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { auditApi, isDemoMode } from '@/utils/api';
import { History, User, Clock, Send, MessageSquare, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ActivityTabProps {
  orderId: number;
}

interface ActivityEntry {
  id: number | string;
  user_name: string;
  user_id?: number;
  action: string;
  action_type: 'status_change' | 'comment' | 'create' | 'update' | 'assign' | 'other';
  details?: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
}

const ActivityTab = ({ orderId }: ActivityTabProps) => {
  const { orders, currentUser } = useApp();
  const order = orders.find(o => o.id === orderId);

  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [orderId]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        // Demo mode - use local history
        const history = order?.history || [];
        const mapped: ActivityEntry[] = history.map(h => ({
          id: h.id,
          user_name: h.userName,
          user_id: h.userId,
          action: h.action,
          action_type: detectActionType(h.action),
          details: h.details,
          timestamp: h.timestamp,
        }));

        // Add comments as activities
        const comments = order?.comments || [];
        const commentActivities: ActivityEntry[] = comments.map(c => ({
          id: c.id,
          user_name: c.authorName,
          user_id: c.authorId,
          action: 'Dodano komentarz',
          action_type: 'comment',
          details: c.content,
          timestamp: c.createdAt,
        }));

        const allActivities = [...mapped, ...commentActivities]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setActivities(allActivities);
      } else {
        // Production mode - load from audit API
        const response = await auditApi.getRecordHistory('orders', orderId);
        const auditLogs = response.data?.logs || [];

        const mapped: ActivityEntry[] = auditLogs.map((log: any) => ({
          id: log.id,
          user_name: log.user_email || 'System',
          user_id: log.user_id,
          action: translateAction(log.action, log.changed_fields),
          action_type: detectActionType(log.action),
          details: formatChanges(log.old_values, log.new_values, log.changed_fields),
          old_value: log.old_values?.status,
          new_value: log.new_values?.status,
          timestamp: log.created_at,
        }));

        setActivities(mapped);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectActionType = (action: string): ActivityEntry['action_type'] => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('status') || lowerAction.includes('zmiana statusu')) return 'status_change';
    if (lowerAction.includes('komentarz') || lowerAction.includes('comment')) return 'comment';
    if (lowerAction.includes('create') || lowerAction.includes('utworz')) return 'create';
    if (lowerAction.includes('przypisano') || lowerAction.includes('assign')) return 'assign';
    if (lowerAction.includes('update') || lowerAction.includes('aktualizacja')) return 'update';
    return 'other';
  };

  const translateAction = (action: string, changedFields?: string[]): string => {
    switch (action) {
      case 'CREATE': return 'Utworzono zlecenie';
      case 'UPDATE':
        if (changedFields?.includes('status')) return 'Zmiana statusu';
        if (changedFields?.includes('archived')) return 'Archiwizacja';
        return 'Aktualizacja zlecenia';
      case 'DELETE': return 'Usunięto zlecenie';
      case 'ARCHIVE': return 'Zarchiwizowano zlecenie';
      case 'RESTORE': return 'Przywrócono zlecenie';
      default: return action;
    }
  };

  const formatChanges = (oldValues: any, newValues: any, changedFields?: string[]): string => {
    if (!changedFields || changedFields.length === 0) return '';

    const changes: string[] = [];
    for (const field of changedFields) {
      const oldVal = oldValues?.[field];
      const newVal = newValues?.[field];
      if (field === 'status' && oldVal && newVal) {
        return `${oldVal} → ${newVal}`;
      }
      if (oldVal !== newVal) {
        changes.push(`${field}: ${oldVal || '-'} → ${newVal || '-'}`);
      }
    }
    return changes.join(', ');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusColors: Record<string, string> = {
      'NOWE': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'POTWIERDZONE': 'bg-blue-100 text-blue-800 border-blue-300',
      'W_TRAKCIE': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'GOTOWE': 'bg-green-100 text-green-800 border-green-300',
      'WSTRZYMANE': 'bg-gray-100 text-gray-800 border-gray-300',
      'ANULOWANE': 'bg-red-100 text-red-800 border-red-300',
    };

    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
        {status}
      </span>
    );
  };

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = formatDate(activity.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityEntry[]>);

  const addMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    // In demo mode, just add to local state
    const newActivity: ActivityEntry = {
      id: `msg_${Date.now()}`,
      user_name: currentUser.name,
      user_id: currentUser.id,
      action: 'Dodano wiadomość',
      action_type: 'comment',
      details: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setActivities(prev => [newActivity, ...prev]);
    setNewMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin mr-2" />
        <span>Ładowanie aktywności...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
          <History size={24} />
          Aktywność ({activities.length})
        </h2>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <>
          {/* Timeline - like Prodio */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="text-sm text-muted-foreground text-center mb-4 relative">
                    <span className="bg-background px-2">{date}</span>
                  </div>

                  {/* Activities for this date */}
                  {dayActivities.map((activity) => (
                    <div key={activity.id} className="relative pl-10 pb-4">
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                      {/* Activity card */}
                      <div className="bg-muted/30 rounded-lg p-4 border">
                        <div className="flex items-center gap-2 mb-2">
                          <User size={16} className="text-muted-foreground" />
                          <span className="font-medium">{activity.user_name}</span>
                          <Clock size={14} className="text-muted-foreground ml-auto" />
                          <span className="text-sm text-muted-foreground">
                            {formatTime(activity.timestamp)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>

                        <div className="text-sm">
                          {activity.action_type === 'status_change' && activity.old_value && activity.new_value ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Zmiana statusu z</span>
                              {getStatusBadge(activity.old_value)}
                              <span>na</span>
                              {getStatusBadge(activity.new_value)}
                            </div>
                          ) : activity.action_type === 'comment' ? (
                            <div>
                              <span className="text-muted-foreground">{activity.action}</span>
                              {activity.details && (
                                <p className="mt-1 p-2 bg-background rounded border italic">
                                  "{activity.details}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium">{activity.action}</span>
                              {activity.details && (
                                <span className="text-muted-foreground ml-2">
                                  ({activity.details})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {activities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <History size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Brak historii zmian dla tego zlecenia.</p>
                </div>
              )}
            </div>
          </div>

          {/* Message input - like Prodio */}
          <div className="flex gap-2 items-center border-t pt-4 mt-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMessage()}
              placeholder="Wiadomość..."
              className="flex-1 input-industrial"
            />
            <button
              onClick={addMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityTab;
