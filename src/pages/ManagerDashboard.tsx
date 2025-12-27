import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import OrdersList from '@/components/Manager/OrdersList';
import OrderDetails from '@/components/Manager/OrderDetails';
import OrderForm from '@/components/Manager/OrderForm';
import TimeReport from '@/components/Manager/TimeReport';
import WorkersList from '@/components/Manager/WorkersList';

const ManagerDashboard = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'manager') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'manager') {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <main className="container mx-auto">
        <Routes>
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/new" element={<OrderForm />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="orders/:id/edit" element={<OrderForm />} />
          <Route path="workers" element={<WorkersList />} />
          <Route path="reports" element={<TimeReport />} />
          <Route path="*" element={<Navigate to="orders" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default ManagerDashboard;
