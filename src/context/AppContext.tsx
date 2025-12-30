import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, TimeEntry, User, Worker, UserRole, Machine, WorkSession, ROLES_WITH_PRICE_ACCESS } from '@/types';
import { initialOrders, initialTimeEntries, workers as initialWorkers, initialMachines } from '@/data/mockData';
import { authApi, workersApi, ordersApi, isDemoMode } from '@/utils/api';

interface AppContextType {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  machines: Machine[];
  setMachines: React.Dispatch<React.SetStateAction<Machine[]>>;
  workSessions: WorkSession[];
  setWorkSessions: React.Dispatch<React.SetStateAction<WorkSession[]>>;
  timeEntries: TimeEntry[];
  setTimeEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  loginWithPin: (pin: string) => Promise<boolean>;  // Nowa funkcja logowania PIN-em
  logout: () => Promise<void>;
  loading: boolean;
  apiConnected: boolean;
  refreshOrders: () => Promise<void>;
  refreshWorkers: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  canViewPrices: () => boolean;  // Czy użytkownik może widzieć ceny
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

  const [machines, setMachines] = useState<Machine[]>(() => {
    const saved = localStorage.getItem('plexisystem_machines');
    return saved ? JSON.parse(saved) : initialMachines;
  });

  const [workSessions, setWorkSessions] = useState<WorkSession[]>(() => {
    const saved = localStorage.getItem('plexisystem_work_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('plexisystem_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Sprawdź czy API jest dostępne i odśwież dane
  useEffect(() => {
    const checkApiAndRefresh = async () => {
      // W trybie demo nie próbuj łączyć z API
      if (isDemoMode()) {
        console.log('Tryb demo aktywny - pomijam sprawdzanie API');
        setApiConnected(false);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('plexisystem_token');
      if (token) {
        try {
          setLoading(true);
          const userData = await authApi.me();
          if (userData.user) {
            setCurrentUser({
              id: userData.user.id,
              name: userData.user.name,
              role: userData.user.role.toLowerCase() as UserRole,
              email: userData.user.email,
            });
            setApiConnected(true);
            // Odśwież dane z API
            await refreshOrders();
            await refreshWorkers();
          }
        } catch (err) {
          console.log('API niedostępne, używam localStorage');
          setApiConnected(false);
        } finally {
          setLoading(false);
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
    localStorage.setItem('plexisystem_machines', JSON.stringify(machines));
  }, [machines]);

  useEffect(() => {
    localStorage.setItem('plexisystem_work_sessions', JSON.stringify(workSessions));
  }, [workSessions]);

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
      // API zwraca: { success: true, data: { orders: [...] } }
      // Lub: { success: true, orders: [...] } - stary format
      const ordersData = response.data?.orders || response.orders;
      if (ordersData) {
        setOrders(ordersData);
      }
    } catch (err) {
      console.log('Nie można pobrać zleceń z API');
      setError('Nie udało się pobrać zleceń z serwera');
    }
  };

  const refreshWorkers = async () => {
    try {
      const response = await workersApi.getAll();
      // API zwraca: { success: true, data: { workers: [...] } }
      // Lub: { success: true, workers: [...] } - stary format
      const workersData = response.data?.workers || response.workers;
      if (workersData) {
        setWorkers(workersData);
      }
    } catch (err) {
      console.log('Nie można pobrać pracowników z API');
      setError('Nie udało się pobrać pracowników z serwera');
    }
  };

  // Funkcja pomocnicza dla logowania demo
  const loginDemoUser = (email: string): boolean => {
    // Admin
    if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('wlasciciel')) {
      setCurrentUser({
        id: 0,
        name: 'Administrator',
        role: 'admin',
        email: email
      });
      setLoading(false);
      return true;
    }

    // Manager
    if (email.toLowerCase().includes('kierownik') || email.toLowerCase().includes('manager')) {
      setCurrentUser({
        id: 1,
        name: 'Kierownik Produkcji',
        role: 'manager',
        email: email
      });
      setLoading(false);
      return true;
    }

    // Szukaj w workers
    const matchedWorker = workers.find(w =>
      w.email.toLowerCase() === email.toLowerCase() && w.active
    );

    if (matchedWorker) {
      setCurrentUser({
        id: matchedWorker.id,
        name: matchedWorker.name,
        role: matchedWorker.role as UserRole,
        email: matchedWorker.email
      });
      setLoading(false);
      return true;
    }

    // Domyślnie - worker
    setCurrentUser({
      id: 99,
      name: 'Pracownik Demo',
      role: 'worker',
      email: email
    });
    setLoading(false);
    return true;
  };

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    if (!email || !password) return false;

    setLoading(true);
    clearError();

    // W trybie demo - natychmiast użyj fallback bez próby łączenia z API
    if (isDemoMode()) {
      console.log('Tryb demo - logowanie bez API');
      return loginDemoUser(email);
    }

    try {
      // Spróbuj zalogować przez API
      const response = await authApi.login(email, password);
      // API zwraca: { success: true, data: { token, user } }
      const token = response.data?.token || response.token;
      const user = response.data?.user || response.user;

      if (token && user) {
        localStorage.setItem('plexisystem_token', token);
        setCurrentUser({
          id: user.id,
          name: user.name,
          role: user.role.toLowerCase() as UserRole,
          email: user.email,
        });
        setApiConnected(true);
        // Pobierz dane z API
        await refreshOrders();
        await refreshWorkers();
        setLoading(false);
        return true;
      }

      // Demo fallback - admin
      if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('wlasciciel')) {
        setCurrentUser({
          id: 0,
          name: 'Administrator',
          role: 'admin',
          email: email
        });
        setLoading(false);
        return true;
      }

      // Demo fallback - manager
      if (email.toLowerCase().includes('kierownik') || email.toLowerCase().includes('manager')) {
        setCurrentUser({
          id: 1,
          name: 'Kierownik Produkcji',
          role: 'manager',
          email: email
        });
        setLoading(false);
        return true;
      }

      // Fallback dla demo - szukaj w workers
      const matchedWorker = workers.find(w =>
        w.email.toLowerCase() === email.toLowerCase() && w.active
      );

      if (matchedWorker) {
        setCurrentUser({
          id: matchedWorker.id,
          name: matchedWorker.name,
          role: matchedWorker.role as UserRole,
          email: matchedWorker.email
        });
        setLoading(false);
        return true;
      }

      // Demo fallback - worker
      const firstActiveWorker = workers.find(w => w.active && w.role === 'worker') || workers[0];
      if (firstActiveWorker) {
        setCurrentUser({
          id: firstActiveWorker.id,
          name: firstActiveWorker.name,
          role: 'worker',
          email: email
        });
        setLoading(false);
        return true;
      }

      setError('Nie znaleziono użytkownika');
      setLoading(false);
      return false;
      
    } catch (err: any) {
      console.log('API niedostępne, używam trybu demo');
      return loginDemoUser(email);
    }
  };

  // Logowanie PIN-em (główna metoda logowania)
  const loginWithPin = async (pin: string): Promise<boolean> => {
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      setError('PIN musi składać się z 4-6 cyfr');
      return false;
    }

    setLoading(true);
    clearError();

    // Tryb demo - szukaj w lokalnych danych
    if (isDemoMode()) {
      const matchedWorker = workers.find(w => w.pin === pin && w.active);

      if (matchedWorker) {
        setCurrentUser({
          id: matchedWorker.id,
          name: matchedWorker.name,
          role: matchedWorker.role as UserRole,
          email: matchedWorker.email,
          position: matchedWorker.position,
          skills: matchedWorker.skills,
          // hourly_rate tylko dla nie-PRACOWNIK
          ...(matchedWorker.role !== 'PRACOWNIK' && { hourly_rate: matchedWorker.hourly_rate })
        });
        setLoading(false);
        return true;
      }

      setError('Nieprawidłowy PIN');
      setLoading(false);
      return false;
    }

    // Tryb produkcyjny - logowanie przez API
    try {
      const response = await authApi.loginWithPin(pin);
      // API zwraca: { success: true, data: { token, user } }
      const token = response.data?.token || response.token;
      const user = response.data?.user || response.user;

      if (token && user) {
        localStorage.setItem('plexisystem_token', token);
        setCurrentUser({
          id: user.id,
          name: user.name,
          role: user.role as UserRole,
          email: user.email,
          position: user.position,
          skills: user.skills || [],
          hourly_rate: user.hourly_rate,
        });
        setApiConnected(true);
        await refreshOrders();
        await refreshWorkers();
        setLoading(false);
        return true;
      }

      setError('Nieprawidłowy PIN');
      setLoading(false);
      return false;
    } catch (err: any) {
      console.log('API niedostępne, używam trybu demo');
      // Fallback do trybu demo
      const matchedWorker = workers.find(w => w.pin === pin && w.active);
      if (matchedWorker) {
        setCurrentUser({
          id: matchedWorker.id,
          name: matchedWorker.name,
          role: matchedWorker.role as UserRole,
          email: matchedWorker.email,
          position: matchedWorker.position,
          skills: matchedWorker.skills,
          ...(matchedWorker.role !== 'PRACOWNIK' && { hourly_rate: matchedWorker.hourly_rate })
        });
        setLoading(false);
        return true;
      }
      setError('Nieprawidłowy PIN');
      setLoading(false);
      return false;
    }
  };

  // Czy użytkownik może widzieć ceny
  const canViewPrices = (): boolean => {
    if (!currentUser) return false;
    return ROLES_WITH_PRICE_ACCESS.includes(currentUser.role);
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
      machines,
      setMachines,
      workSessions,
      setWorkSessions,
      timeEntries,
      setTimeEntries,
      currentUser,
      setCurrentUser,
      login,
      loginWithPin,
      logout,
      loading,
      apiConnected,
      refreshOrders,
      refreshWorkers,
      error,
      clearError,
      canViewPrices,
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
