import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  AlertTriangle,
  Package,
  Wrench,
  ShieldCheck,
  Settings,
  Clock
} from 'lucide-react';
import { notificationsApi, isDemoMode } from '@/utils/api';

interface Notification {
  id: number;
  type: string;
  category: 'order' | 'quality' | 'machine' | 'maintenance' | 'system' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    // Sprawdź czy użytkownik jest zalogowany (ma token)
    const token = localStorage.getItem('plexisystem_token');
    if (isDemoMode() || !token) {
      // Demo data - używaj gdy tryb demo lub brak tokena
      setNotifications([
        {
          id: 1,
          type: 'order_overdue',
          category: 'order',
          priority: 'high',
          title: 'Zlecenie ZLC-2024-0156 po terminie',
          message: 'Zlecenie przekroczyło planowany termin o 2 dni',
          link: '/manager/orders/156',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          type: 'quality_issue',
          category: 'quality',
          priority: 'urgent',
          title: 'Krytyczna wada jakości',
          message: 'Zgłoszono wadę krytyczną w zleceniu ZLC-2024-0155',
          link: '/manager/quality',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 3,
          type: 'maintenance_due',
          category: 'maintenance',
          priority: 'normal',
          title: 'Konserwacja CNC Router 1',
          message: 'Planowana konserwacja za 3 dni',
          link: '/manager/machines',
          is_read: false,
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 4,
          type: 'machine_down',
          category: 'machine',
          priority: 'urgent',
          title: 'Awaria Giętarki',
          message: 'Maszyna wymaga natychmiastowej interwencji',
          link: '/manager/machines',
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
      setUnreadCount(3);
      return;
    }

    try {
      const response = await notificationsApi.getAll({ limit: 20 });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (id: number) => {
    if (isDemoMode()) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }

    try {
      await notificationsApi.markAsRead([id]);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (isDemoMode()) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      return;
    }

    try {
      await notificationsApi.markAsRead(undefined, true);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'order': return <Package size={16} />;
      case 'quality': return <ShieldCheck size={16} />;
      case 'machine': return <Wrench size={16} />;
      case 'maintenance': return <Settings size={16} />;
      case 'alert': return <AlertTriangle size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'normal': return 'border-l-blue-500';
      case 'low': return 'border-l-gray-400';
      default: return 'border-l-gray-400';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'teraz';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} godz`;
    if (diffDays < 7) return `${diffDays} dni`;
    return date.toLocaleDateString('pl-PL');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Powiadomienia"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
            <h3 className="font-semibold">Powiadomienia</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck size={14} />
                Oznacz wszystkie
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>Brak powiadomień</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-l-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                    getPriorityColor(notification.priority)
                  } ${notification.is_read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-full ${
                      notification.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                      notification.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {getCategoryIcon(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${notification.is_read ? '' : 'font-semibold'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5"></span>
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-border bg-muted/50 text-center">
              <button
                onClick={() => {
                  navigate('/manager/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-primary hover:underline"
              >
                Zobacz wszystkie
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
