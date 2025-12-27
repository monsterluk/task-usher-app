import { useApp } from '@/context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ClipboardList, Clock, FileText } from 'lucide-react';

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
                <button
                  onClick={() => navigate('/manager/orders')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    location.pathname.includes('/orders') 
                      ? 'bg-primary-foreground/20' 
                      : 'hover:bg-primary-foreground/10'
                  }`}
                >
                  <ClipboardList size={18} />
                  <span>Zlecenia</span>
                </button>
                <button
                  onClick={() => navigate('/manager/reports')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    location.pathname.includes('/reports') 
                      ? 'bg-primary-foreground/20' 
                      : 'hover:bg-primary-foreground/10'
                  }`}
                >
                  <FileText size={18} />
                  <span>Raporty</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/worker/stages')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  location.pathname.includes('/stages') 
                    ? 'bg-primary-foreground/20' 
                    : 'hover:bg-primary-foreground/10'
                }`}
              >
                <Clock size={18} />
                <span>Moje Etapy</span>
              </button>
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
        <div className="md:hidden flex gap-2 pb-3">
          {isManager ? (
            <>
              <button
                onClick={() => navigate('/manager/orders')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors ${
                  location.pathname.includes('/orders') 
                    ? 'bg-primary-foreground/20' 
                    : 'hover:bg-primary-foreground/10'
                }`}
              >
                <ClipboardList size={18} />
                <span>Zlecenia</span>
              </button>
              <button
                onClick={() => navigate('/manager/reports')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors ${
                  location.pathname.includes('/reports') 
                    ? 'bg-primary-foreground/20' 
                    : 'hover:bg-primary-foreground/10'
                }`}
              >
                <FileText size={18} />
                <span>Raporty</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/worker/stages')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors ${
                location.pathname.includes('/stages') 
                  ? 'bg-primary-foreground/20' 
                  : 'hover:bg-primary-foreground/10'
              }`}
            >
              <Clock size={18} />
              <span>Moje Etapy</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
