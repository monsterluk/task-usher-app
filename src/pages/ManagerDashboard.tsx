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
import GanttChart from '@/components/Manager/Planning/GanttChart';
import QualityDashboard from '@/components/Manager/Quality/QualityDashboard';
import OEEDashboard from '@/components/Manager/OEE/OEEDashboard';
import MaintenanceDashboard from '@/components/Manager/Maintenance/MaintenanceDashboard';
import CapacityDashboard from '@/components/Manager/Capacity/CapacityDashboard';
import ProductionReport from '@/components/Manager/Reports/ProductionReport';
import CostCalculator from '@/components/Manager/Costs/CostCalculator';
import ProductionCalendar from '@/components/Manager/Calendar/ProductionCalendar';
import DataExport from '@/components/Manager/Export/DataExport';
import KPIDashboard from '@/components/Manager/KPI/KPIDashboard';
import NotificationSettings from '@/components/Manager/Notifications/NotificationSettings';

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
          <Route path="gantt" element={<GanttChart />} />
          <Route path="quality" element={<QualityDashboard />} />
          <Route path="oee" element={<OEEDashboard />} />
          <Route path="maintenance" element={<MaintenanceDashboard />} />
          <Route path="capacity" element={<CapacityDashboard />} />
          <Route path="production-report" element={<ProductionReport />} />
          <Route path="costs" element={<CostCalculator />} />
          <Route path="calendar" element={<ProductionCalendar />} />
          <Route path="export" element={<DataExport />} />
          <Route path="kpi" element={<KPIDashboard />} />
          <Route path="notifications" element={<NotificationSettings />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default ManagerDashboard;
