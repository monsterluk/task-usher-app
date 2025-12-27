import { useApp } from '@/context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ClipboardList, Clock, FileText, Users } from 'lucide-react';

const Navigation = () => {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentUser) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isManager = currentUser.role === 'manager';

  const NavButton = ({ path, icon: Icon, label }: { path: string; icon: React.ElementType; label: string }) => {
    const isActive = location.pathname.includes(path);
    return (
      <button
        onClick={() => navigate(path)}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
          isActive 
            ? 'bg-primary-foreground/20' 
            : 'hover:bg-primary-foreground/10'
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
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors ${
          isActive 
            ? 'bg-primary-foreground/20' 
            : 'hover:bg-primary-foreground/10'
        }`}
      >
        <Icon size={18} />
        <span className="text-sm">{label}</span>
      </button>
    );
  };

  return (
    <nav className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="font-bold text-xl tracking-tight">
              PLEXI<span className="font-normal">SYSTEM</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {isManager ? (
              <>
                <NavButton path="/manager/orders" icon={ClipboardList} label="Zlecenia" />
                <NavButton path="/manager/workers" icon={Users} label="Pracownicy" />
                <NavButton path="/manager/reports" icon={FileText} label="Raporty" />
              </>
            ) : (
              <NavButton path="/worker/stages" icon={Clock} label="Moje Etapy" />
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm">
              {currentUser.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-primary-foreground/10 transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden flex gap-2 pb-3 overflow-x-auto">
          {isManager ? (
            <>
              <MobileNavButton path="/manager/orders" icon={ClipboardList} label="Zlecenia" />
              <MobileNavButton path="/manager/workers" icon={Users} label="Pracownicy" />
              <MobileNavButton path="/manager/reports" icon={FileText} label="Raporty" />
            </>
          ) : (
            <MobileNavButton path="/worker/stages" icon={Clock} label="Moje Etapy" />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
