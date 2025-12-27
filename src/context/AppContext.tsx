import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, TimeEntry, User, Worker } from '@/types';
import { initialOrders, initialTimeEntries, workers as initialWorkers } from '@/data/mockData';

interface AppContextType {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  timeEntries: TimeEntry[];
  setTimeEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (email: string, password: string, role: 'manager' | 'worker') => boolean;
  logout: () => void;
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

  const login = (email: string, password: string, role: 'manager' | 'worker'): boolean => {
    if (email && password) {
      if (role === 'manager') {
        // Check if user is a manager in workers list
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
          return true;
        }
        
        // Fallback for demo - accept any manager login
        setCurrentUser({
          id: 0,
          name: 'Kierownik',
          role: 'manager',
          email
        });
        return true;
      } else {
        // For workers, match by email
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
          return true;
        }
        
        // Fallback for demo - accept any worker login
        const firstActiveWorker = workers.find(w => w.active && w.role === 'worker') || workers[0];
        setCurrentUser({
          id: firstActiveWorker.id,
          name: firstActiveWorker.name,
          role: 'worker',
          email
        });
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
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
      logout
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
