import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, TimeEntry, User, Worker } from '@/types';
import { initialOrders, initialTimeEntries, workers as initialWorkers } from '@/data/mockData';
import { authApi, workersApi, ordersApi } from '@/utils/api';

interface AppContextType {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  timeEntries: TimeEntry[];
  setTimeEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (email: string, password: string, role: 'manager' | 'worker') => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  apiConnected: boolean;
  refreshOrders: () => Promise<void>;
  refreshWorkers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('plexisystem_orders');
    return saved ? JSON.parse(saved) : initialOrders;
  });

  const [workers, setWorkers] = useState<Worker[]>(() => {
    const saved = localStorage.getItem('plexisystem_workers');
    return saved ? JSON.parse(saved) : initialWorkers;
  });

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem('plexisystem_time_entries');
    return saved ? JSON.parse(saved) : initialTimeEntries;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('plexisystem_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  // Sprawdź czy API jest dostępne i odśwież dane
  useEffect(() => {
    const checkApiAndRefresh = async () => {
      const token = localStorage.getItem('plexisystem_token');
      if (token) {
        try {
          const userData = await authApi.me();
          if (userData.user) {
            setCurrentUser({
              id: userData.user.id,
              name: userData.user.name,
              role: userData.user.role.toLowerCase() as 'manager' | 'worker',
              email: userData.user.email,
            });
            setApiConnected(true);
            // Odśwież dane z API
            await refreshOrders();
            await refreshWorkers();
          }
        } catch {
          // API niedostępne - używaj localStorage
          console.log('API niedostępne, używam localStorage');
          setApiConnected(false);
        }
      }
    };
    
    checkApiAndRefresh();
  }, []);

  // Zapisuj do localStorage jako fallback
  useEffect(() => {
    localStorage.setItem('plexisystem_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('plexisystem_workers', JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    localStorage.setItem('plexisystem_time_entries', JSON.stringify(timeEntries));
  }, [timeEntries]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('plexisystem_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('plexisystem_user');
    }
  }, [currentUser]);

  const refreshOrders = async () => {
    try {
      const response = await ordersApi.getAll();
      if (response.orders) {
        setOrders(response.orders);
      }
    } catch {
      console.log('Nie można pobrać zleceń z API');
    }
  };

  const refreshWorkers = async () => {
    try {
      const response = await workersApi.getAll();
      if (response.workers) {
        setWorkers(response.workers);
      }
    } catch {
      console.log('Nie można pobrać pracowników z API');
    }
  };

  const login = async (email: string, password: string, role: 'manager' | 'worker'): Promise<boolean> => {
    if (!email || !password) return false;
    
    setLoading(true);
    
    try {
      // Spróbuj zalogować przez API
      const response = await authApi.login(email, password);
      
      if (response.token && response.user) {
        localStorage.setItem('plexisystem_token', response.token);
        setCurrentUser({
          id: response.user.id,
          name: response.user.name,
          role: response.user.role.toLowerCase() as 'manager' | 'worker',
          email: response.user.email,
        });
        setApiConnected(true);
        
        // Odśwież dane z API
        await refreshOrders();
        await refreshWorkers();
        
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.log('API login failed, trying localStorage fallback', error);
    }
    
    // Fallback do localStorage (dla trybu offline/demo)
    if (role === 'manager') {
      const managerWorker = workers.find(w => 
        w.email.toLowerCase() === email.toLowerCase() && w.role === 'manager' && w.active
      );
      
      if (managerWorker) {
        setCurrentUser({
          id: managerWorker.id,
          name: managerWorker.name,
          role: 'manager',
          email: managerWorker.email
        });
        setLoading(false);
        return true;
      }
      
      // Demo fallback
      setCurrentUser({
        id: 0,
        name: 'Kierownik',
        role: 'manager',
        email
      });
      setLoading(false);
      return true;
    } else {
      const matchedWorker = workers.find(w => 
        w.email.toLowerCase() === email.toLowerCase() && w.active
      );
      
      if (matchedWorker) {
        setCurrentUser({
          id: matchedWorker.id,
          name: matchedWorker.name,
          role: 'worker',
          email: matchedWorker.email
        });
        setLoading(false);
        return true;
      }
      
      // Demo fallback
      const firstActiveWorker = workers.find(w => w.active && w.role === 'worker') || workers[0];
      setCurrentUser({
        id: firstActiveWorker.id,
        name: firstActiveWorker.name,
        role: 'worker',
        email
      });
      setLoading(false);
      return true;
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      if (apiConnected) {
        await authApi.logout();
      }
    } catch {
      console.log('API logout failed');
    }
    
    localStorage.removeItem('plexisystem_token');
    setCurrentUser(null);
    setApiConnected(false);
    setLoading(false);
  };

  return (
    <AppContext.Provider value={{
      orders,
      setOrders,
      workers,
      setWorkers,
      timeEntries,
      setTimeEntries,
      currentUser,
      setCurrentUser,
      login,
      logout,
      loading,
      apiConnected,
      refreshOrders,
      refreshWorkers,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
