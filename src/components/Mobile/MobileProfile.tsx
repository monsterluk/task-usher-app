import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  User,
  Package,
  Clock,
  Calendar,
  Settings,
  Bell,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Briefcase,
  Award,
  TrendingUp,
  Shield
} from 'lucide-react';

const MobileProfile = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useApp();
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [notifications, setNotifications] = useState(true);

  const handleToggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const handleLogout = () => {
    if (confirm('Czy na pewno chcesz sie wylogowac?')) {
      logout();
      navigate('/');
    }
  };

  // Demo stats
  const stats = {
    totalOrders: 47,
    completedStages: 156,
    totalHours: 423,
    avgEfficiency: 94
  };

  const menuItems = [
    {
      icon: Bell,
      label: 'Powiadomienia',
      value: notifications ? 'Wlaczone' : 'Wylaczone',
      action: () => setNotifications(!notifications),
      toggle: true
    },
    {
      icon: darkMode ? Sun : Moon,
      label: 'Tryb ciemny',
      value: darkMode ? 'Wlaczony' : 'Wylaczony',
      action: handleToggleDarkMode,
      toggle: true
    },
    {
      icon: Shield,
      label: 'Zmien PIN',
      value: '',
      action: () => alert('Funkcja zmiany PIN (w przygotowaniu)'),
      arrow: true
    },
    {
      icon: Settings,
      label: 'Ustawienia',
      value: '',
      action: () => alert('Ustawienia (w przygotowaniu)'),
      arrow: true
    }
  ];

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pb-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/worker')}
            className="p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeft size={24} />
          </button>
          <p className="font-bold text-lg">Moj profil</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-12">
        <div className="bg-card rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={32} className="text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{currentUser?.name || 'Pracownik'}</h2>
              <p className="text-muted-foreground">{currentUser?.department || 'Produkcja'}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-xs font-medium">
                Aktywny
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-lg text-center">
              <Package className="mx-auto mb-1 text-blue-600" size={20} />
              <p className="text-lg font-bold">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground">Zlecenia</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <Clock className="mx-auto mb-1 text-green-600" size={20} />
              <p className="text-lg font-bold">{stats.totalHours}h</p>
              <p className="text-xs text-muted-foreground">Przepracowane</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <TrendingUp size={18} />
          Statystyki
        </h3>
        <div className="bg-card rounded-xl shadow overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Briefcase size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Ukonczone etapy</p>
                <p className="text-xs text-muted-foreground">W tym miesiacu</p>
              </div>
            </div>
            <p className="text-xl font-bold text-blue-600">{stats.completedStages}</p>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Award size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium">Efektywnosc</p>
                <p className="text-xs text-muted-foreground">Srednia z 30 dni</p>
              </div>
            </div>
            <p className="text-xl font-bold text-green-600">{stats.avgEfficiency}%</p>
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      <div className="p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Settings size={18} />
          Ustawienia
        </h3>
        <div className="bg-card rounded-xl shadow overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full p-4 flex items-center justify-between ${
                index !== menuItems.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="text-muted-foreground" />
                <span className="font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.value && (
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                )}
                {item.toggle && (
                  <div className={`w-10 h-6 rounded-full transition-colors ${
                    (item.label === 'Powiadomienia' && notifications) ||
                    (item.label === 'Tryb ciemny' && darkMode)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${
                      (item.label === 'Powiadomienia' && notifications) ||
                      (item.label === 'Tryb ciemny' && darkMode)
                        ? 'translate-x-4.5 ml-0.5'
                        : 'translate-x-0.5'
                    }`} />
                  </div>
                )}
                {item.arrow && <ChevronRight size={20} className="text-muted-foreground" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Logout Button */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full p-4 bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Wyloguj sie
        </button>
      </div>

      {/* App Version */}
      <div className="text-center text-xs text-muted-foreground pb-4">
        <p>PlexiSystem v2.0</p>
        <p>PWA Mobile Dashboard</p>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 flex justify-around safe-area-inset-bottom">
        <button
          onClick={() => navigate('/worker')}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
        >
          <Package size={24} />
          <span className="text-xs">Zlecenia</span>
        </button>
        <button
          onClick={() => navigate('/worker/history')}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
        >
          <Clock size={24} />
          <span className="text-xs">Historia</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 text-primary">
          <User size={24} />
          <span className="text-xs font-medium">Profil</span>
        </button>
      </div>
    </div>
  );
};

export default MobileProfile;
