import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  Package,
  AlertTriangle,
  FileText,
  Save,
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ordersApi } from '@/utils/api';

interface NotificationSettingsData {
  email_enabled: boolean;
  push_enabled: boolean;
  order_updates: boolean;
  deadline_reminders: boolean;
  daily_summary: boolean;
  reminder_hours_before: number;
  email: string | null;
}

const NotificationSettings = () => {
  const { currentUser } = useApp();
  const [settings, setSettings] = useState<NotificationSettingsData>({
    email_enabled: true,
    push_enabled: false,
    order_updates: true,
    deadline_reminders: true,
    daily_summary: false,
    reminder_hours_before: 24,
    email: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    loadSettings();
    checkPushSupport();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('plexisystem_token');
      const response = await fetch('/api/notifications/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPushSupport = () => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  };

  const requestPushPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        setSettings(prev => ({ ...prev, push_enabled: true }));
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('plexisystem_token');
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettingsData) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell size={24} />
            Ustawienia powiadomień
          </h1>
          <p className="text-muted-foreground">
            Zarządzaj sposobem otrzymywania powiadomień z systemu
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Zapisywanie...
            </>
          ) : saved ? (
            <>
              <CheckCircle size={18} />
              Zapisano!
            </>
          ) : (
            <>
              <Save size={18} />
              Zapisz ustawienia
            </>
          )}
        </button>
      </div>

      {/* Email Settings */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Mail className="text-blue-600" size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Powiadomienia e-mail</h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_enabled}
                  onChange={() => toggleSetting('email_enabled')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Otrzymuj powiadomienia na adres e-mail
            </p>
          </div>
        </div>

        {settings.email_enabled && (
          <div className="ml-14 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Adres e-mail</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                placeholder={currentUser?.email || 'twoj@email.pl'}
                className="input-industrial w-full max-w-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pozostaw puste, aby używać adresu z profilu
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Push Notifications */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Smartphone className="text-purple-600" size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Powiadomienia push</h2>
              {pushSupported ? (
                pushPermission === 'granted' ? (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.push_enabled}
                      onChange={() => toggleSetting('push_enabled')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                ) : (
                  <button
                    onClick={requestPushPermission}
                    className="btn-secondary text-sm"
                  >
                    Włącz powiadomienia
                  </button>
                )
              ) : (
                <span className="text-sm text-muted-foreground">Niedostępne</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {pushSupported
                ? 'Otrzymuj powiadomienia push w przeglądarce'
                : 'Twoja przeglądarka nie obsługuje powiadomień push'}
            </p>
          </div>
        </div>

        {pushPermission === 'denied' && (
          <div className="ml-14 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm flex items-start gap-2">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <span>
              Powiadomienia push zostały zablokowane. Aby je włączyć, zmień ustawienia w przeglądarce.
            </span>
          </div>
        )}
      </div>

      {/* Notification Types */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Typy powiadomień</h2>
        <div className="space-y-4">
          {/* Order Updates */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Package size={20} className="text-blue-600" />
              <div>
                <p className="font-medium">Aktualizacje zleceń</p>
                <p className="text-sm text-muted-foreground">
                  Zmiany statusu, przypisania, notatki
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.order_updates}
                onChange={() => toggleSetting('order_updates')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Deadline Reminders */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-orange-600" />
              <div>
                <p className="font-medium">Przypomnienia o terminach</p>
                <p className="text-sm text-muted-foreground">
                  Powiadomienia przed upływem terminu zlecenia
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.deadline_reminders}
                onChange={() => toggleSetting('deadline_reminders')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {settings.deadline_reminders && (
            <div className="ml-8 p-3 bg-muted rounded-lg">
              <label className="block text-sm font-medium mb-2">
                Przypomnij przed terminem:
              </label>
              <select
                value={settings.reminder_hours_before}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  reminder_hours_before: parseInt(e.target.value)
                }))}
                className="input-industrial w-full max-w-xs"
              >
                <option value={6}>6 godzin</option>
                <option value={12}>12 godzin</option>
                <option value={24}>24 godziny (1 dzień)</option>
                <option value={48}>48 godzin (2 dni)</option>
                <option value={72}>72 godziny (3 dni)</option>
              </select>
            </div>
          )}

          {/* Daily Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-green-600" />
              <div>
                <p className="font-medium">Dzienne podsumowanie</p>
                <p className="text-sm text-muted-foreground">
                  Codzienne podsumowanie stanu produkcji
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.daily_summary}
                onChange={() => toggleSetting('daily_summary')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Jak działają powiadomienia?</p>
          <ul className="list-disc ml-4 space-y-1 text-blue-700">
            <li>Powiadomienia e-mail są wysyłane natychmiast po zdarzeniu</li>
            <li>Przypomnienia o terminach są wysyłane zgodnie z wybranym czasem</li>
            <li>Dzienne podsumowanie jest wysyłane rano o godzinie 7:00</li>
            <li>Powiadomienia push wymagają zgody przeglądarki</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
