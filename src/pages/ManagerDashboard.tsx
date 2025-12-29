import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Navigation from '@/components/Navigation';
import Dashboard from '@/components/Manager/Dashboard';
import OrdersList from '@/components/Manager/OrdersList';
import OrderDetails from '@/components/Manager/OrderDetails';
import OrderForm from '@/components/Manager/OrderForm';
import TimeReport from '@/components/Manager/TimeReport';
import WorkersList from '@/components/Manager/WorkersList';
import MachinesList from '@/components/Manager/Machines/MachinesList';

const ManagerDashboard = () => {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  // Allow KIEROWNIK and ADMIN to access this dashboard
  const hasAccess = currentUser && (currentUser.role === 'KIEROWNIK' || currentUser.role === 'ADMIN');

  useEffect(() => {
    if (!hasAccess) {
      navigate('/');
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <main className="container mx-auto">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/new" element={<OrderForm />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="orders/:id/edit" element={<OrderForm />} />
          <Route path="workers" element={<WorkersList />} />
          <Route path="machines" element={<MachinesList />} />
          <Route path="reports" element={<TimeReport />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default ManagerDashboard;
