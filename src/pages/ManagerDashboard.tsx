import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/Layout/Sidebar';
import ErrorBoundary from '@/components/ui/error-boundary';
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
import AuditTrail from '@/components/Manager/Audit/AuditTrail';
import TimeTracking from '@/components/TimeTracking/TimeTracking';

// Wrapper z ErrorBoundary
const withErrorBoundary = (Component: React.ComponentType) => {
  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  );
};

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Routes>
            <Route path="dashboard" element={withErrorBoundary(Dashboard)} />
            <Route path="orders" element={withErrorBoundary(OrdersList)} />
            <Route path="orders/new" element={withErrorBoundary(OrderForm)} />
            <Route path="orders/:id" element={withErrorBoundary(OrderDetails)} />
            <Route path="orders/:id/edit" element={withErrorBoundary(OrderForm)} />
            <Route path="workers" element={withErrorBoundary(WorkersList)} />
            <Route path="machines" element={withErrorBoundary(MachinesList)} />
            <Route path="reports" element={withErrorBoundary(TimeReport)} />
            <Route path="gantt" element={withErrorBoundary(GanttChart)} />
            <Route path="quality" element={withErrorBoundary(QualityDashboard)} />
            <Route path="oee" element={withErrorBoundary(OEEDashboard)} />
            <Route path="maintenance" element={withErrorBoundary(MaintenanceDashboard)} />
            <Route path="capacity" element={withErrorBoundary(CapacityDashboard)} />
            <Route path="production-report" element={withErrorBoundary(ProductionReport)} />
            <Route path="costs" element={withErrorBoundary(CostCalculator)} />
            <Route path="calendar" element={withErrorBoundary(ProductionCalendar)} />
            <Route path="export" element={withErrorBoundary(DataExport)} />
            <Route path="kpi" element={withErrorBoundary(KPIDashboard)} />
            <Route path="notifications" element={withErrorBoundary(NotificationSettings)} />
            <Route path="audit" element={withErrorBoundary(AuditTrail)} />
            <Route path="time-tracking" element={withErrorBoundary(TimeTracking)} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default ManagerDashboard;
