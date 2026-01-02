import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  ClipboardList,
  Layers,
  Cog,
  Users,
  Timer,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Package,
  FileText,
  CalendarDays,
  AlertTriangle,
  Shield,
  Briefcase,
  Palette,
  Clock,
  Menu,
  X,
  Home,
  Boxes,
  Warehouse
} from 'lucide-react';

interface NavItemProps {
  path: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  badgeColor?: 'red' | 'blue' | 'orange';
}

interface NavSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Sidebar = () => {
  const { currentUser, orders, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Collapsible sections state
  const [sections, setSections] = useState({
    produkcja: true,
    pracownicy: true,
    raporty: false,
  });

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'ADMIN';
  const isKierownik = currentUser.role === 'KIEROWNIK';
  const isGrafik = currentUser.role === 'GRAFIK';
  const isHandlowiec = currentUser.role === 'HANDLOWIEC';
  const isPracownik = currentUser.role === 'PRACOWNIK';

  // Calculate badges
  const activeOrders = orders.filter(o => !o.archived && o.status !== 'GOTOWE').length;
  const urgentOrders = orders.filter(o => {
    if (o.archived || o.status === 'GOTOWE') return false;
    const deadline = new Date(o.planned_completion_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline < today || (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 2;
  }).length;
  const notifications = 3; // Mock - would come from API

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // NavItem Component
  const NavItem = ({ path, icon: Icon, label, badge, badgeColor = 'blue' }: NavItemProps) => {
    const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

    const badgeColors = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      orange: 'bg-orange-500',
    };

    return (
      <button
        onClick={() => {
          navigate(path);
          setMobileOpen(false);
        }}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
          ${isActive
            ? 'text-white shadow-lg'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }
        `}
        style={isActive ? {
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        } : undefined}
      >
        {/* Hover effect */}
        {!isActive && (
          <div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{
              background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, transparent 100%)',
              borderLeft: '3px solid #667eea',
            }}
          />
        )}

        <Icon size={24} className="relative z-10 flex-shrink-0" />
        <span className="relative z-10 font-medium flex-1 text-left">{label}</span>

        {badge !== undefined && badge > 0 && (
          <span className={`relative z-10 ${badgeColors[badgeColor]} text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  // NavSection Component (collapsible)
  const NavSection = ({ title, icon: Icon, children, defaultOpen = true }: NavSectionProps) => {
    const sectionKey = title.toLowerCase().replace(/\s+/g, '') as keyof typeof sections;
    const isOpen = sections[sectionKey] ?? defaultOpen;

    return (
      <div className="mb-2">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <Icon size={18} />
          <span className="font-semibold text-sm uppercase tracking-wider flex-1 text-left">{title}</span>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {isOpen && (
          <div className="mt-1 space-y-1 pl-2">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Separator Component
  const Separator = () => (
    <div className="my-4 mx-4 border-t border-gray-200 dark:border-gray-700" />
  );

  // Sidebar Content
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Layers size={24} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">
              PLEXI<span className="font-light">SYSTEM</span>
            </div>
            <div className="text-xs text-muted-foreground">System Produkcji</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {/* Dashboard - always first */}
        {(isAdmin || isKierownik) && (
          <>
            <NavItem path="/manager/dashboard" icon={Home} label="Dashboard" />
            <Separator />
          </>
        )}

        {/* Produkcja Section */}
        {(isAdmin || isKierownik) && (
          <NavSection title="Produkcja" icon={Package}>
            <NavItem path="/manager/orders" icon={ClipboardList} label="Zlecenia" badge={activeOrders} badgeColor="blue" />
            <NavItem path="/manager/calendar" icon={CalendarDays} label="Kalendarz" />
            <NavItem path="/manager/machines" icon={Cog} label="Maszyny" />
            <NavItem path="/manager/inventory" icon={Warehouse} label="Magazyn" />
            <NavItem path="/manager/bom" icon={Boxes} label="BOM / Receptury" />
            {urgentOrders > 0 && (
              <NavItem path="/manager/orders?filter=PRZETERMINOWANE" icon={AlertTriangle} label="Pilne" badge={urgentOrders} badgeColor="red" />
            )}
          </NavSection>
        )}

        {/* Pracownicy Section */}
        {(isAdmin || isKierownik) && (
          <NavSection title="Pracownicy" icon={Users}>
            <NavItem path="/manager/workers" icon={Users} label="Lista pracowników" />
            <NavItem path="/manager/time-tracking" icon={Timer} label="Czas pracy" />
          </NavSection>
        )}

        {/* Raporty Section */}
        {(isAdmin || isKierownik) && (
          <NavSection title="Raporty" icon={BarChart3}>
            <NavItem path="/manager/reports" icon={FileText} label="Raporty" />
            <NavItem path="/manager/analytics" icon={BarChart3} label="Analityka" />
          </NavSection>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <Separator />
            <NavSection title="Administracja" icon={Shield}>
              <NavItem path="/admin" icon={Shield} label="Panel Admin" />
              <NavItem path="/admin/settings" icon={Settings} label="Ustawienia" />
            </NavSection>
          </>
        )}

        {/* Grafik */}
        {isGrafik && (
          <NavItem path="/grafik" icon={Palette} label="Panel Grafika" />
        )}

        {/* Handlowiec */}
        {isHandlowiec && (
          <>
            <NavItem path="/handlowiec" icon={Briefcase} label="Moje Zlecenia" />
            <NavItem path="/handlowiec/new" icon={ClipboardList} label="Nowe Zlecenie" />
          </>
        )}

        {/* Pracownik */}
        {isPracownik && (
          <>
            <NavItem path="/worker" icon={Home} label="Panel Pracownika" />
            <NavItem path="/worker/stages" icon={Clock} label="Moje Etapy" />
          </>
        )}

        <Separator />

        {/* Notifications */}
        {(isAdmin || isKierownik) && (
          <NavItem path="/notifications" icon={Bell} label="Powiadomienia" badge={notifications} badgeColor="orange" />
        )}
      </div>

      {/* User Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {getInitials(currentUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{currentUser.name}</div>
            <div className="text-xs text-muted-foreground">
              {currentUser.role === 'ADMIN' ? 'Administrator' :
               currentUser.role === 'KIEROWNIK' ? 'Kierownik' :
               currentUser.role === 'GRAFIK' ? 'Grafik' :
               currentUser.role === 'HANDLOWIEC' ? 'Handlowiec' :
               'Pracownik'}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <Settings size={16} />
            Ustawienia
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen w-72 bg-white dark:bg-gray-900 shadow-xl z-40
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
