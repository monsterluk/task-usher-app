import { useApp } from '@/context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ClipboardList, Clock, FileText, Users, Layers, LayoutDashboard, Cog, Shield, Settings, Briefcase, Palette } from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navigation = () => {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentUser) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');  // Explicitly go to PIN login
  };

  // New role system: ADMIN, KIEROWNIK, GRAFIK, HANDLOWIEC, PRACOWNIK
  const isAdmin = currentUser.role === 'ADMIN';
  const isKierownik = currentUser.role === 'KIEROWNIK';
  const isGrafik = currentUser.role === 'GRAFIK';
  const isHandlowiec = currentUser.role === 'HANDLOWIEC';
  const isPracownik = currentUser.role === 'PRACOWNIK';

  const NavButton = ({ path, icon: Icon, label }: { path: string; icon: React.ElementType; label: string }) => {
    const isActive = location.pathname.includes(path);
    return (
      <button
        onClick={() => navigate(path)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium ${
          isActive 
            ? 'bg-white/20 text-white shadow-md' 
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon size={18} />
        <span>{label}</span>
      </button>
    );
  };

  const MobileNavButton = ({ path, icon: Icon, label }: { path: string; icon: React.ElementType; label: string }) => {
    const isActive = location.pathname.includes(path);
    return (
      <button
        onClick={() => navigate(path)}
        className={`flex-1 flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isActive 
            ? 'bg-white/20 text-white shadow-md' 
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon size={20} />
        <span className="text-xs font-medium">{label}</span>
      </button>
    );
  };

  return (
    <nav className="bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Layers size={24} className="text-white" />
            </div>
            <div className="font-bold text-xl tracking-tight">
              PLEXI<span className="font-light">SYSTEM</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {isAdmin && (
              <>
                <NavButton path="/admin" icon={Shield} label="Panel Admin" />
                <NavButton path="/manager/orders" icon={ClipboardList} label="Zlecenia" />
                <NavButton path="/handlowiec/new" icon={Briefcase} label="Nowe Zlecenie" />
                <NavButton path="/admin/workers" icon={Users} label="Pracownicy" />
                <NavButton path="/admin/machines" icon={Cog} label="Maszyny" />
              </>
            )}
            {isKierownik && (
              <>
                <NavButton path="/manager/dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavButton path="/manager/orders" icon={ClipboardList} label="Zlecenia" />
                <NavButton path="/manager/machines" icon={Cog} label="Maszyny" />
                <NavButton path="/manager/workers" icon={Users} label="Pracownicy" />
              </>
            )}
            {isGrafik && (
              <>
                <NavButton path="/grafik" icon={Palette} label="Panel Grafika" />
              </>
            )}
            {isHandlowiec && (
              <>
                <NavButton path="/handlowiec" icon={Briefcase} label="Moje Zlecenia" />
                <NavButton path="/handlowiec/new" icon={ClipboardList} label="Nowe Zlecenie" />
              </>
            )}
            {isPracownik && (
              <NavButton path="/worker/stages" icon={Clock} label="Moje Etapy" />
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {/* Notification Bell - only for managers and admins */}
            {(isAdmin || isKierownik) && (
              <NotificationBell />
            )}
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-semibold">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{currentUser.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200"
              title="Wyloguj"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline text-sm font-medium">Wyloguj</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex gap-1 pb-3 overflow-x-auto">
          {isAdmin && (
            <>
              <MobileNavButton path="/admin" icon={Shield} label="Admin" />
              <MobileNavButton path="/manager/orders" icon={ClipboardList} label="Zlecenia" />
              <MobileNavButton path="/handlowiec/new" icon={Briefcase} label="Nowe" />
              <MobileNavButton path="/admin/workers" icon={Users} label="Pracownicy" />
              <MobileNavButton path="/admin/machines" icon={Cog} label="Maszyny" />
            </>
          )}
          {isKierownik && (
            <>
              <MobileNavButton path="/manager/orders" icon={ClipboardList} label="Zlecenia" />
              <MobileNavButton path="/manager/machines" icon={Cog} label="Maszyny" />
              <MobileNavButton path="/manager/workers" icon={Users} label="Pracownicy" />
            </>
          )}
          {isGrafik && (
            <MobileNavButton path="/grafik" icon={Palette} label="Grafika" />
          )}
          {isHandlowiec && (
            <>
              <MobileNavButton path="/handlowiec" icon={Briefcase} label="Zlecenia" />
              <MobileNavButton path="/handlowiec/new" icon={ClipboardList} label="Nowe" />
            </>
          )}
          {isPracownik && (
            <MobileNavButton path="/worker/stages" icon={Clock} label="Etapy" />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
