import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, TimeEntry, User } from '@/types';
import { initialOrders, initialTimeEntries, workers } from '@/data/mockData';

interface AppContextType {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
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
        setCurrentUser({
          id: 0,
          name: 'Kierownik',
          role: 'manager',
          email
        });
      } else {
        // For workers, try to match with a worker from the list
        const matchedWorker = workers.find(w => 
          email.toLowerCase().includes(w.name.split(' ')[0].toLowerCase())
        ) || workers[0];
        
        setCurrentUser({
          id: matchedWorker.id,
          name: matchedWorker.name,
          role: 'worker',
          email
        });
      }
      return true;
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
